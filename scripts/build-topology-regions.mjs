// Derive delivery partitions ONLY from the frozen canonical bytes. Never run the seed/subdivision compiler.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {SphericalTopology} from '../src/globe/topology.js';
import {encodeTopology, decodeTopology} from '../src/globe/topology-codec.js';
import {REGION_COUNT, REGION_SIZE, regionForPoint, regionLayout, regionArrays} from '../src/globe/region-format.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync('public/topology/geodesic-v1.bin');
const canonical = JSON.parse(fs.readFileSync('public/topology/geodesic-v1.json'));
if (hash(source) !== canonical.sha256 || canonical.cells !== 1000000) throw Error('Frozen topology checksum mismatch');
const grid = new SphericalTopology(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), canonical);
const groups = Array.from({length: REGION_COUNT}, () => []), index = new Uint16Array(grid.count);
for (let id = 1; id <= grid.count; id++) { const tile = regionForPoint(grid.centre(id)); groups[tile].push(id); index[id - 1] = tile; }
const directory = 'public/topology/regions-v1';
fs.mkdirSync(directory, {recursive: true});
const tiles = [];
for (const [tile, ids] of groups.entries()) {
  const vertexIds = [...new Set(ids.flatMap(id => Array.from(grid.ringIds(id))))].sort((a, b) => a - b);
  const vertexIndex = new Map(vertexIds.map((id, i) => [id, i]));
  const layout = regionLayout(ids.length, vertexIds.length), buffer = new ArrayBuffer(layout.bytes), arrays = regionArrays(buffer, layout);
  new Uint8Array(buffer, 0, 8).set(new TextEncoder().encode('MHRGN001'));
  const header = new DataView(buffer); header.setUint32(8, tile, true); header.setUint32(12, ids.length, true); header.setUint32(16, vertexIds.length, true);
  arrays.ids.set(ids); arrays.vertexIds.set(vertexIds);
  vertexIds.forEach((id, i) => arrays.vertices.set(grid.vertices.subarray(id * 3, id * 3 + 3), i * 3));
  ids.forEach((id, i) => {
    arrays.centres.set(grid.centre(id), i * 3); arrays.degrees[i] = grid.degreeOf(id); arrays.areas[i] = grid.areas[id - 1];
    arrays.rings.set(Array.from(grid.ringIds(id), v => vertexIndex.get(v)), i * 6);
    arrays.neighbours.set(grid.neighbours.subarray((id - 1) * 6, id * 6), i * 6);
  });
  const packed = encodeTopology(buffer, layout);
  if (!Buffer.from(decodeTopology(packed, layout)).equals(Buffer.from(buffer))) throw Error('Regional codec mismatch');
  const compressed = gzipSync(packed, {level: 9});
  fs.writeFileSync(`${directory}/${tile}.gz`, compressed);
  tiles.push({cells: ids.length, vertices: vertexIds.length, sha256: hash(packed), compressedBytes: compressed.length});
}
const indexBytes = Buffer.from(index.buffer);
fs.writeFileSync(`${directory}/index.gz`, gzipSync(indexBytes, {level: 9}));
const bootstrap = JSON.parse(fs.readFileSync('public/topology/bootstrap.json'));
const landmarks = Object.fromEntries([...new Set([bootstrap.anchor, ...Object.values(bootstrap.locations), ...bootstrap.sampleAreas.map(a => a.anchor)])].map(id => [id, Array.from(grid.centre(id))]));
const manifest = {version: 1, topology: 'geodesic-v1', canonicalSha256: canonical.sha256, cells: grid.count, pentagons: canonical.pentagons, size: REGION_SIZE, indexSha256: hash(indexBytes), landmarks, tiles};
fs.writeFileSync(`${directory}/manifest.json`, JSON.stringify(manifest) + '\n');
console.log(JSON.stringify({regions: tiles.length, indexBytes: fs.statSync(`${directory}/index.gz`).size, totalCompressedBytes: tiles.reduce((n, t) => n + t.compressedBytes, 0), maxRegionBytes: Math.max(...tiles.map(t => t.compressedBytes)), canonicalSha256: canonical.sha256}, null, 2));
