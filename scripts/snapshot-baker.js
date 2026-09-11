import * as THREE from 'three';
import {loadTopology} from '../src/globe/full-topology-loader.js';
import {captureTile} from '../src/globe/tile-baker.js';
import {footprintBounds} from '../src/placements/geometry.js';

const topology=await loadTopology(),renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const scene=new THREE.Scene();
const cache=new Map();
async function mesh(record){
  if(cache.has(record.placementId))return cache.get(record.placementId);
  const image=await new Promise((resolve,reject)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=reject;i.src=record.artworkDataUrl;});
  const cells=topology.cells(record.cells,record.anchor),bounds=footprintBounds(cells),frame=topology.frame(record.anchor),positions=[],uvs=[];
  const add=p=>{positions.push(...Array.from(p,v=>v*4));const q=topology.project(p,frame);uvs.push((q.x-bounds.left)/bounds.width,1-(q.y-bounds.top)/bounds.height);};
  for(const cell of cells){const polygon=topology.polygon(cell.id);for(let i=0;i<polygon.length;i++){add(topology.centre(cell.id));add(polygon[i]);add(polygon[(i+1)%polygon.length]);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
  const value=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  cache.set(record.placementId,value);return value;
}
window.snapshotBaker={async capture(tile,records){
  const result=document.createElement('canvas');result.width=result.height=516;const context=result.getContext('2d');
  // Bound compiler textures too: a dense overview must not decode a million images.
  for(let start=0;start<records.length;){
    const batch=[];let pixels=0,cells=0;
    do{const record=records[start++];batch.push(record);pixels+=record.sourcePixels;cells+=record.cells.length;}while(start<records.length&&batch.length<16&&pixels+records[start].sourcePixels<=16_000_000&&cells+records[start].cells.length<=100_000);
    const needed=new Set(batch.map(r=>r.placementId));
    for(const [id,m] of cache)if(!needed.has(id)){m.geometry.dispose();m.material.map.dispose();m.material.dispose();cache.delete(id);}
    scene.clear();for(const record of batch)scene.add(await mesh(record));
    context.drawImage(captureTile(renderer,scene,tile.face,tile.level,tile.x,tile.y,512,2),0,0);
  }
  return result.toDataURL('image/png').split(',')[1];
}};
