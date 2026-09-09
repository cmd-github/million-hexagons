import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.route('**/baker-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Publication validation</title>'}));
 await page.goto('http://127.0.0.1:4180/baker-fixture');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {publishToTiles}=await import('/src/globe/tile-baker.js');const {ArtworkTiles}=await import('/src/globe/tiles.js');const {cubePoint,cubeProject,tileKey}=await import('/src/globe/cube.js');
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.outputColorSpace=THREE.SRGBColorSpace;
  const tiles=new ArtworkTiles(new THREE.Group(),4);await tiles.ready;
  const blank=document.createElement('canvas');blank.width=blank.height=516;const blankBlob=await new Promise(r=>blank.toBlob(r));
  // Use the real session store and inherited-page reader with an empty static catalogue.
  const originalFetch=window.fetch;window.fetch=(url,...args)=>String(url).endsWith('.webp')?Promise.resolve(new Response(blankBlob)):originalFetch(url,...args);
  function patch(y0,y1,color,size){
   const points=[[.98,y0],[1.02,y0],[1.02,y1],[.98,y1]].map(([x,y])=>cubePoint(4,x,y));
   const positions=[],uvs=[];const uv=[[0,0],[1,0],[1,1],[0,1]];for(const i of [0,1,2,0,2,3]){positions.push(...points[i].map(v=>v*4));uvs.push(...uv[i]);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,size,size);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   return {mesh:new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,toneMapped:false})),topology:{polygon:()=>points}};
  }
  const first=patch(-.008,.008,'#ff0000',1024),drawTo=tiles.drawTo.bind(tiles);let reads=0,failed=false;
  tiles.drawTo=(context,key)=>++reads===3?Promise.reject(Error('Deliberate preparation failure')):drawTo(context,key);
  try{await publishToTiles(tiles,renderer,first.mesh,first.topology,[{id:1}]);}catch{failed=true;}
  const atomic=failed&&!tiles.database&&tiles.detailBranches.size===0&&first.mesh.parent===null;
  tiles.drawTo=drawTo;await publishToTiles(tiles,renderer,first.mesh,first.topology,[{id:1}]);
  const branches=[...tiles.detailBranches];
  const second=patch(.012,.018,'#0000ff',8);await publishToTiles(tiles,renderer,second.mesh,second.topology,[{id:2}]);
  async function pixel(face,x,y){const p=cubeProject(face,cubePoint(4,x,y)),level=8,n=2**level,tx=Math.floor((p.x+1)/2*n),ty=Math.floor((1-p.y)/2*n),key=tileKey(face,level,tx,ty);const blob=await tiles.stored(key);if(!blob)return null;const bitmap=await createImageBitmap(blob),c=document.createElement('canvas');c.width=c.height=516;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();return [...ctx.getImageData(Math.floor(2+((p.x+1)/2*n-tx)*512),Math.floor(2+((1-p.y)/2*n-ty)*512),1,1).data];}
  const colors=[await pixel(4,.99,0),await pixel(0,1.01,0),await pixel(4,.99,.015),await pixel(0,1.01,.015)];
  const storedCount=await new Promise(r=>{const q=tiles.database.transaction('tiles').objectStore('tiles').count();q.onsuccess=()=>r(q.result);});
  for(const {mesh} of [first,second]){mesh.geometry.dispose();mesh.material.map.dispose();mesh.material.dispose();}renderer.dispose();
  return {atomic,faces:[...new Set(branches.map(k=>Number(k.split('/')[0])))],colors,storedCount};
 });
 assert.equal(result.atomic,true);assert.ok(result.faces.includes(0)&&result.faces.includes(4));
 for(const color of result.colors.slice(0,2))assert.ok(color&&color[0]>245&&color[1]<10&&color[2]<10,JSON.stringify(result));
 for(const color of result.colors.slice(2))assert.ok(color&&color[2]>245&&color[0]<10&&color[1]<10,JSON.stringify(result));
 assert.ok(result.storedCount<200);console.log('Atomic failure, both cube-seam faces, adjacent publication and fine-page preservation passed',JSON.stringify(result));
}finally{await browser.close();}
