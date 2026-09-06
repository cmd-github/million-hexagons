import fs from 'node:fs';
import {SphericalTopology} from '../src/globe/topology.js';
const bytes=fs.readFileSync('public/topology/geodesic-v1.bin');
const topology=new SphericalTopology(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),JSON.parse(fs.readFileSync('public/topology/geodesic-v1.json')));
const {samples}=JSON.parse(fs.readFileSync('public/topology/samples-v1.json'));
const names=['Adidas','Apple','Coca-Cola','Google','IKEA','Mastercard','McDonald’s','Netflix','Nike','Samsung','Spotify','YouTube'];
const stops=[2,10,3,8,11,4,7,0].map(index=>{
  const sample=samples[index],normal=Array.from(topology.centre(sample.anchor));
  const angle=Math.max(...sample.boundary.map(id=>Math.acos(Math.min(1,topology.vertices[id*3]*normal[0]+topology.vertices[id*3+1]*normal[1]+topology.vertices[id*3+2]*normal[2]))));
  return {name:names[index%names.length],normal,angle};
});
fs.mkdirSync('public/artwork/sample-hq',{recursive:true});
fs.writeFileSync('public/artwork/sample-hq/tour.json',JSON.stringify({stops})+'\n');
console.log(`Demo route: ${stops.length} populated placements`);
