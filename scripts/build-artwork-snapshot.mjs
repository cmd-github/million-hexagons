import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {SphericalTopology} from '../src/globe/topology.js';
import {cubeProject,tileKey} from '../src/globe/cube.js';
import {newTree,setNode,SNAPSHOT_MAX_LEVEL} from '../src/globe/snapshot-tree.js';
import {regionForPoint} from '../src/globe/region-format.js';

const api='https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
const records=[],seen=new Set();let cursor=null;
do{
  const response=await fetch(api,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'public-list',pageSize:1000,cursor})});
  if(!response.ok)throw Error('Public catalogue unavailable');const page=await response.json();
  if(page.nextCursor===undefined&&page.placements.length>=1000)throw Error('Refusing potentially truncated legacy catalogue');
  for(const record of page.placements){if(seen.has(record.placementId))throw Error('Repeated placement in export');seen.add(record.placementId);records.push(record);}
  if(page.nextCursor&&page.nextCursor===cursor)throw Error('Export cursor did not advance');cursor=page.nextCursor;
}while(cursor);
records.sort((a,b)=>a.placementId.localeCompare(b.placementId));
const bytes=await fs.readFile('public/topology/geodesic-v1.bin'),canonical=JSON.parse(await fs.readFile('public/topology/geodesic-v1.json','utf8'));
const grid=new SphericalTopology(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),canonical);
const output='artifacts/artwork-snapshot',tiles=new Map(),tree=newTree(),occupied=new Uint8Array(125000),boundsByRecord=new Map(),sources=new Map();
await fs.mkdir(output,{recursive:true});
const inputs=[];
for(const record of records){
  for(const id of record.cells)occupied[(id-1)>>3]|=1<<((id-1)&7);
  if(!record.artworkDataUrl)continue;
  const response=await fetch(record.artworkDataUrl);if(!response.ok)throw Error(`Artwork unavailable: ${record.placementId}`);
  const data=Buffer.from(await response.arrayBuffer()),metadata=await sharp(data,{limitInputPixels:40_000_000}).metadata();
  if(!['webp','png','jpeg'].includes(metadata.format))throw Error('Unsupported snapshot source');
  const sha256=crypto.createHash('sha256').update(data).digest('hex');
  await fs.mkdir(`${output}/sources`,{recursive:true});await fs.writeFile(`${output}/sources/${record.placementId}.${metadata.format}`,data);
  sources.set(record.placementId,{...record,sourcePixels:metadata.width*metadata.height,artworkDataUrl:`/artifacts/artwork-snapshot/sources/${record.placementId}.${metadata.format}`});
  const faces=[];
  for(let face=0;face<6;face++){
    let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    for(const id of record.cells)for(const point of grid.polygon(id)){
      const p=cubeProject(face,point);if(p.depth<=0)continue;
      left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,-p.y);bottom=Math.max(bottom,-p.y);
    }
    if(right< -1||left>1||bottom< -1||top>1||!Number.isFinite(left))continue;
    const level=Math.max(3,Math.min(SNAPSHOT_MAX_LEVEL,Math.ceil(Math.log2(2*Math.max(metadata.width/(right-left),metadata.height/(bottom-top))/512))));
    faces.push({face,left,right,top,bottom,level});
    for(let l=0;l<=level;l++){
      const count=2**l,x0=Math.max(0,Math.floor((left+1)/2*count-2/512)),x1=Math.min(count-1,Math.floor((right+1)/2*count+2/512)),y0=Math.max(0,Math.floor((top+1)/2*count-2/512)),y1=Math.min(count-1,Math.floor((bottom+1)/2*count+2/512));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const key=tileKey(face,l,x,y);tiles.set(key,{face,level:l,x,y});setNode(tree,face,l,x,y);}
    }
  }
  boundsByRecord.set(record.placementId,faces);inputs.push({placementId:record.placementId,artworkDataUrl:record.artworkDataUrl,sha256,cells:record.cells});
}
for(let face=0;face<6;face++){tiles.set(tileKey(face,0,0,0),{face,level:0,x:0,y:0});setNode(tree,face,0,0,0);}
const compilerFiles=['scripts/build-artwork-snapshot.mjs','scripts/snapshot-baker.js','src/globe/tile-baker.js','src/globe/cube.js','src/globe/snapshot-tree.js'];
const compilerHash=crypto.createHash('sha256');for(const file of compilerFiles)compilerHash.update(await fs.readFile(file));
const snapshotId=crypto.createHash('sha256').update(JSON.stringify({compiler:compilerHash.digest('hex'),canonical:canonical.sha256,records,inputs})).digest('hex');
const base=`${output}/${snapshotId}`;await fs.mkdir(base,{recursive:true});
// Traverse contributing records down the quadtree. Never scan the complete
// catalogue once per output tile (which would be O(placements * all tiles)).
const tileCandidates=new Map();
const overlaps=(record,tile)=>{const n=2**tile.level,pad=4/(512*n),left=tile.x/n*2-1-pad,right=(tile.x+1)/n*2-1+pad,top=tile.y/n*2-1-pad,bottom=(tile.y+1)/n*2-1+pad;return boundsByRecord.get(record.placementId)?.some(b=>b.face===tile.face&&b.left<=right&&b.right>=left&&b.top<=bottom&&b.bottom>=top);};
for(const [key,tile] of [...tiles].sort((a,b)=>a[1].level-b[1].level)){
  const candidates=tile.level?tileCandidates.get(tileKey(tile.face,tile.level-1,Math.floor(tile.x/2),Math.floor(tile.y/2))):records;
  tileCandidates.set(key,candidates.filter(record=>sources.has(record.placementId)&&overlaps(record,tile)));
}
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const hashes=[];
try{
  const page=await browser.newPage();page.on('pageerror',e=>console.error(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/snapshot-baker.html`);
  await page.waitForFunction(()=>window.snapshotBaker,null,{timeout:120000});
  let done=0;
  for(const [key,tile] of [...tiles].sort((a,b)=>b[1].level-a[1].level||a[0].localeCompare(b[0]))){
    const file=`${base}/${key}.webp`;await fs.mkdir(path.dirname(file),{recursive:true});
    let data;
    {
      const candidates=tileCandidates.get(key).map(r=>sources.get(r.placementId));
      const encoded=await page.evaluate(({tile,records})=>snapshotBaker.capture(tile,records),{tile,records:candidates});
      data=await sharp(Buffer.from(encoded,'base64')).webp({lossless:true}).toBuffer();
    }
    await fs.writeFile(file,data);hashes.push({path:`${key}.webp`,sha256:crypto.createHash('sha256').update(data).digest('hex'),bytes:data.length});
    if(++done%50===0)console.log(`${done}/${tiles.size} snapshot tiles`);
  }
}finally{await browser.close();await server.close();}
await fs.writeFile(`${base}/tree.gz`,gzipSync(tree));await fs.writeFile(`${base}/occupancy.gz`,gzipSync(occupied));
await fs.mkdir(`${base}/preview`,{recursive:true});
for(let face=0;face<6;face++)await sharp(`${base}/${face}/0/0/0.webp`).extract({left:2,top:2,width:512,height:512}).resize(128,128).extend({top:2,bottom:2,left:2,right:2,extendWith:'copy'}).webp({quality:90,alphaQuality:100}).toFile(`${base}/preview/${face}.webp`);
// Each region has a local string table; no million-entry ID/name list at boot.
await fs.mkdir(`${base}/owners`,{recursive:true});
const ownerRegions=Array.from({length:1536},(_,region)=>({region,placements:[],cells:[]}));
for(const record of records)for(const id of record.cells){const region=ownerRegions[regionForPoint(grid.centre(id))];let owner=region.placements.indexOf(record.placementId);if(owner<0){owner=region.placements.length;region.placements.push(record.placementId);}region.cells.push([id,owner]);}
for(const region of ownerRegions){region.cells.sort((a,b)=>a[0]-b[0]);await fs.writeFile(`${base}/owners/${region.region}.json`,JSON.stringify(region));}
const manifest={schemaVersion:1,snapshotId,tileSize:512,gutter:2,previewTileSize:128,maxLevel:0,maxDetailLevel:SNAPSHOT_MAX_LEVEL,projection:'cube-gnomonic',files:tiles.size,placements:records.length,cellCount:records.reduce((n,r)=>n+r.cellCount,0),tree:'tree.gz',treeSha256:crypto.createHash('sha256').update(tree).digest('hex'),occupancy:'occupancy.gz',createdAt:new Date().toISOString()};
await fs.writeFile(`${base}/manifest.json`,JSON.stringify(manifest));await fs.writeFile(`${base}/records.json`,JSON.stringify(records));await fs.writeFile(`${base}/checksums.json`,JSON.stringify(hashes));
await fs.writeFile(`${output}/latest.json`,JSON.stringify({snapshotId,base,tiles:tiles.size}));console.log(JSON.stringify({snapshotId,tiles:tiles.size,placements:records.length,bytes:hashes.reduce((n,h)=>n+h.bytes,0)}));
