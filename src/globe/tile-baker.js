import * as THREE from 'three';
import { CUBE_FACES,cubeProject,tileKey } from './cube.js';
import {publicationLevel, MAX_PUBLICATION_LEVEL} from './publication-detail.js';

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
  const pixels=new Uint8Array(total*total*4);
  try{
    renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,tileCamera(face,level,x,y,size,gutter));
    renderer.readRenderTargetPixels(target,0,0,total,total,pixels);
  }finally{renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha);target.dispose();}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=total;
  const context=canvas.getContext('2d'),output=context.createImageData(total,total);
  // Rotate whole RGBA pixels, avoiding an allocation for every pixel of every
  // page. The byte order stays intact on either endian architecture.
  const source=new Uint32Array(pixels.buffer),destination=new Uint32Array(output.data.buffer);
  for(let i=0;i<source.length;i++)destination[i]=source[source.length-1-i];
  context.putImageData(output,0,0);return canvas;
}

// Compile one confirmed placement into affected tile pages, then release its
// mesh/texture. The page store, not a retained scene object, owns the result.
export async function publishToTiles(tiles,renderer,mesh,topology,cells) {
  const scene=new THREE.Scene();scene.add(mesh);
  const previousSide=mesh.material.side;mesh.material.side=THREE.DoubleSide;
  mesh.material.needsUpdate=true;
  const size=tiles.manifest.tileSize,gutter=tiles.manifest.gutter||0;
  const touched=[],batch=[];
  const prepare=async(face,level,x,y)=>{
    const key=tileKey(face,level,x,y),layer=captureTile(renderer,scene,face,level,x,y,size,gutter);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size+2*gutter;
    const context=canvas.getContext('2d');await tiles.drawTo(context,key);context.drawImage(layer,0,0);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw Error('Could not encode artwork tile');
    touched.push([key,blob]);
  };
  const finishBatch=async()=>{
    const results=await Promise.allSettled(batch);batch.length=0;
    const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
    await new Promise(resolve=>setTimeout(resolve,0));
  };
  try {
    for(let face=0;face<6;face++) {
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
      for(const cell of cells)for(const point of topology.polygon(cell.id)) {
        const p=cubeProject(face,point);if(p.depth<=0)continue;
        left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,-p.y);bottom=Math.max(bottom,-p.y);
      }
      if(right< -1||left>1||bottom< -1||top>1||!Number.isFinite(left))continue;
      const detailLevel=publicationLevel({left,right,top,bottom},mesh.material.map.image,tiles.manifest);
      for(let level=0;level<=MAX_PUBLICATION_LEVEL;level++) {
        const count=2**level;
        const x0=Math.max(0,Math.floor((left+1)/2*count-gutter/size)),x1=Math.min(count-1,Math.floor((right+1)/2*count+gutter/size));
        const y0=Math.max(0,Math.floor((top+1)/2*count-gutter/size)),y1=Math.min(count-1,Math.floor((bottom+1)/2*count+gutter/size));
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
          // A later, larger placement must also update existing fine pages.
          if(level>detailLevel&&!tiles.detailBranches.has(tileKey(face,level-1,Math.floor(x/2),Math.floor(y/2))))continue;
          // Bound temporary canvases while overlapping image decode/encoding.
          // Every job settles before any page can be committed.
          batch.push(prepare(face,level,x,y));
          if(batch.length===4)await finishBatch();
        }
      }
    }
    if(batch.length)await finishBatch();
    await tiles.openSession();
    await new Promise((resolve,reject)=>{
      const transaction=tiles.database.transaction('tiles','readwrite'),store=transaction.objectStore('tiles');
      touched.forEach(([key,blob])=>store.put(blob,key));transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||Error('Publication aborted'));
    });
    for(const [key] of touched){
      let [face,level,x,y]=key.split('/').map(Number);
      while(level>tiles.manifest.maxLevel){level--;x=Math.floor(x/2);y=Math.floor(y/2);tiles.detailBranches.add(tileKey(face,level,x,y));}
    }
    tiles.lastSelection=-Infinity;
    for(const [key] of touched){const tile=tiles.cache.get(key);if(tile){tiles.evict(tile);tiles.request(tile.face,tile.level,tile.x,tile.y);}}
  } finally {await Promise.allSettled(batch);mesh.material.side=previousSide;mesh.material.needsUpdate=true;mesh.removeFromParent();}
}
