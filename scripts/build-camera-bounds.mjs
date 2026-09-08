import fs from 'node:fs';
import {SphericalTopology} from '../src/globe/topology.js';
const bytes=fs.readFileSync('public/topology/geodesic-v1.bin'),grid=new SphericalTopology(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),JSON.parse(fs.readFileSync('public/topology/geodesic-v1.json')));
const catalogue=JSON.parse(fs.readFileSync('public/topology/samples-v1.json')),bootstrap=JSON.parse(fs.readFileSync('public/topology/bootstrap.json'));
bootstrap.sampleAreas.forEach((area,index)=>{const n=grid.centre(area.anchor);let dot=1;for(const id of catalogue.samples[index].boundary){const p=grid.vertices.subarray(id*3,id*3+3);dot=Math.min(dot,p[0]*n[0]+p[1]*n[1]+p[2]*n[2]);}area.angle=Number(Math.acos(Math.max(-1,dot)).toFixed(6));});
fs.writeFileSync('public/topology/bootstrap.json',JSON.stringify(bootstrap)+'\n');
