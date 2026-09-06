import * as THREE from 'three';
import { CUBE_FACES,cubeProject,tileKey } from './cube.js';

export function tileCamera(face,level,x,y,size,gutter=0) {
  const basis=CUBE_FACES[face],camera=new THREE.PerspectiveCamera(90,1,.01,10);
  camera.up.set(...basis.v);camera.lookAt(new THREE.Vector3(...basis.n));
  const full=size*2**level,total=size+2*gutter;
  camera.setViewOffset(full,full,full-(x+1)*size-gutter,y*size-gutter,total,total);camera.updateMatrixWorld(true);return camera;
}
export function captureTile(renderer,scene,face,level,x,y,size=512,gutter=2) {
  const total=size+gutter*2,target=new THREE.WebGLRenderTarget(total,total,{depthBuffer:true});
  target.texture.colorSpace=THREE.SRGBColorSpace;
  const previous=renderer.getRenderTarget(),clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
  renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,tileCamera(face,level,x,y,size,gutter));
  const pixels=new Uint8Array(total*total*4);renderer.readRenderTargetPixels(target,0,0,total,total,pixels);
  renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha);target.dispose();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=total;
  const context=canvas.getContext('2d'),output=context.createImageData(total,total);
  for(let j=0;j<total;j++)for(let i=0;i<total;i++){const from=((total-1-j)*total+total-1-i)*4,to=(j*total+i)*4;output.data.set(pixels.subarray(from,from+4),to);}
  context.putImageData(output,0,0);return canvas;
}

// Compile one confirmed placement into affected tile pages, then release its
// mesh/texture. The page store, not a retained scene object, owns the result.
export async function publishToTiles(tiles,renderer,mesh,topology,cells) {
  const scene=new THREE.Scene();scene.add(mesh);
  const previousSide=mesh.material.side;mesh.material.side=THREE.DoubleSide;
  mesh.material.needsUpdate=true;
  const size=tiles.manifest.tileSize,gutter=tiles.manifest.gutter||0;
  const touched=[];
  try {
    for(let face=0;face<6;face++) {
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
      for(const cell of cells)for(const point of topology.polygon(cell.id)) {
        const p=cubeProject(face,point);if(p.depth<=0)continue;
        left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,-p.y);bottom=Math.max(bottom,-p.y);
      }
      if(right< -1||left>1||bottom< -1||top>1||!Number.isFinite(left))continue;
      for(let level=0;level<=tiles.manifest.maxLevel;level++) {
        const count=2**level;
        const x0=Math.max(0,Math.floor((left+1)/2*count-gutter/size)),x1=Math.min(count-1,Math.floor((right+1)/2*count+gutter/size));
        const y0=Math.max(0,Math.floor((top+1)/2*count-gutter/size)),y1=Math.min(count-1,Math.floor((bottom+1)/2*count+gutter/size));
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
          const key=tileKey(face,level,x,y),base=await createImageBitmap(await tiles.read(key));
          const layer=captureTile(renderer,scene,face,level,x,y,size,gutter);
          const canvas=document.createElement('canvas');canvas.width=canvas.height=size+2*gutter;
          const context=canvas.getContext('2d');context.drawImage(base,0,0);base.close();context.drawImage(layer,0,0);
          const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
          if(!blob)throw Error('Could not encode artwork tile');
          // Stage pages first so failed preparation cannot partially publish.
          touched.push([key,blob]);
          await new Promise(resolve=>setTimeout(resolve,0));
        }
      }
    }
    await tiles.openSession();
    await new Promise((resolve,reject)=>{
      const transaction=tiles.database.transaction('tiles','readwrite'),store=transaction.objectStore('tiles');
      touched.forEach(([key,blob])=>store.put(blob,key));transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||Error('Publication aborted'));
    });
    for(const [key] of touched){const tile=tiles.cache.get(key);if(tile){tiles.evict(tile);tiles.request(tile.face,tile.level,tile.x,tile.y);}}
  } finally {mesh.material.side=previousSide;mesh.removeFromParent();}
}
