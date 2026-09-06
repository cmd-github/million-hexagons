import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {SphericalTopology} from '../src/globe/topology.js';
import {encodeTopology,decodeTopology} from '../src/globe/topology-codec.js';
const data=fs.readFileSync('public/topology/geodesic-v1.bin'),manifest=JSON.parse(fs.readFileSync('public/topology/geodesic-v1.json'));
const grid=new SphericalTopology(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),manifest);
const compressed=gzipSync(data,{level:9});fs.writeFileSync('public/topology/geodesic-v1.bin.gz',compressed);
const packed=encodeTopology(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),manifest);
if(!Buffer.from(decodeTopology(packed,manifest)).equals(data))throw Error('Lossless codec mismatch');
const packedGzip=gzipSync(packed,{level:9});fs.writeFileSync('public/topology/geodesic-v1.packed.gz',packedGzip);
const catalogue=JSON.parse(fs.readFileSync('public/topology/samples-v1.json')),occupancy=new Uint8Array(1000000),sampleOwners=new Uint8Array(1000000);
const sampleCampaigns=[
  ['Adidas','https://www.adidas.com/'],['Apple','https://www.apple.com/'],['Coca-Cola','https://www.coca-cola.com/'],['Google','https://www.google.com/'],
  ['IKEA','https://www.ikea.com/'],['Mastercard','https://www.mastercard.com/'],['McDonald’s','https://www.mcdonalds.com/'],['Netflix','https://www.netflix.com/'],
  ['Nike','https://www.nike.com/'],['Samsung','https://www.samsung.com/'],['Spotify','https://www.spotify.com/'],['YouTube','https://www.youtube.com/'],
].map(([name,url])=>({name,url}));
for(const [index,sample] of catalogue.samples.entries())for(const id of sample.ids){occupancy[id-1]=255;sampleOwners[id-1]=index%sampleCampaigns.length+1;}
fs.writeFileSync('public/topology/occupancy-v1.gz',gzipSync(occupancy));
fs.writeFileSync('public/topology/sample-owners-v1.gz',gzipSync(sampleOwners));
fs.writeFileSync('public/topology/bootstrap.json',JSON.stringify({anchor:grid.pick([0,0,1]),locations:{equator:grid.pick([0,0,1]),north:grid.pick([0,1,0]),south:grid.pick([0,-1,0]),pentagon:1,nearPentagon:grid.neighboursOf(1)[0]},cells:1000000,pentagons:manifest.pentagons,bytes:packedGzip.length,sampleCampaigns})+'\n');
console.log({topologyCompressed:compressed.length,topologyPacked:packedGzip.length,occupancyCompressed:gzipSync(occupancy).length});
