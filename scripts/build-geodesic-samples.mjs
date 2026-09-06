import fs from 'node:fs';
import { SphericalTopology } from '../src/globe/topology.js';
const buffer=fs.readFileSync('public/topology/geodesic-v1.bin');
const grid=new SphericalTopology(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),JSON.parse(fs.readFileSync('public/topology/geodesic-v1.json')));
const protectedPoints=[[0,1,0],[0,-1,0],[0,0,1],Array.from(grid.centre(1))];
const samples=[],occupied=new Set();
for(let anchor=1;anchor<=64;anchor++) {
  const p=grid.centre(anchor);
  if(protectedPoints.some(q=>p[0]*q[0]+p[1]*q[1]+p[2]*q[2]>Math.cos(.4)))continue;
  const cells=grid.connected(anchor,6500,1.4),ids=cells.map(c=>c.id),active=new Set(ids);
  if(ids.some(id=>occupied.has(id)))continue;
  const edges=new Map();
  for(const id of ids) {
    const d=grid.degrees[id-1],offset=(id-1)*6;
    for(let k=0;k<d;k++)if(!active.has(grid.neighbours[offset+k]+1))edges.set(grid.rings[offset+k],grid.rings[offset+(k+1)%d]);
  }
  const boundary=[],first=edges.keys().next().value;let current=first;
  do {boundary.push(current);current=edges.get(current);if(current===undefined||boundary.length>edges.size)throw Error('Invalid sample boundary');} while(current!==first);
  if(boundary.length!==edges.size)throw Error('Sample has holes');
  samples.push({anchor,ids,boundary});ids.forEach(id=>occupied.add(id));
}
fs.writeFileSync('public/topology/samples-v1.json',JSON.stringify({version:1,samples})+'\n');
console.log(`${samples.length} local sample campaigns, ${occupied.size} actual sample cells`);
