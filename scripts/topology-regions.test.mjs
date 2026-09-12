import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {SphericalTopology} from '../src/globe/topology.js';
import {RegionalTopology, MissingRegion} from '../src/globe/regional-topology.js';
import {REGION_COUNT, regionForPoint} from '../src/globe/region-format.js';
import {runtimeFiles} from './deployment-assets.mjs';

const manifest = JSON.parse(fs.readFileSync('public/topology/regions-v1/manifest.json'));
const canonical = JSON.parse(fs.readFileSync('public/topology/geodesic-v1.json'));
const bytes = fs.readFileSync('public/topology/geodesic-v1.bin');
const full = new SphericalTopology(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), canonical);
const indexBytes = gunzipSync(fs.readFileSync('public/topology/regions-v1/index.gz'));
const index = new Uint16Array(indexBytes.buffer.slice(indexBytes.byteOffset, indexBytes.byteOffset + indexBytes.byteLength));
const hash = value => createHash('sha256').update(value).digest('hex');
async function readRegion(path, options) {
  const bytes = gunzipSync(fs.readFileSync(`public/${path}`));
  assert.equal(bytes.length, options.expectedBytes);
  assert.equal(hash(bytes), options.expectedSha256);
  return bytes;
}
const regional = () => new RegionalTopology(manifest, index, readRegion);

test('all million regional cells preserve canonical Float32 bits, IDs, ring identity and ordered adjacency', async () => {
  assert.equal(hash(bytes), canonical.sha256);
  assert.equal(manifest.canonicalSha256, canonical.sha256);
  assert.equal(hash(indexBytes), manifest.indexSha256);
  const grid = regional(); let count = 0, pentagons = 0;
  for (let tile = 0; tile < REGION_COUNT; tile++) {
    await grid.loadRegion(tile);
    const r = grid.regions.get(tile);
    for (let i = 0; i < r.ids.length; i++) {
      const id = r.ids[i]; count++;
      assert.equal(regionForPoint(full.centre(id)), tile);
      assert.deepEqual(Array.from(grid.centre(id)), Array.from(full.centre(id)));
      assert.deepEqual(grid.neighboursOf(id), full.neighboursOf(id));
      assert.deepEqual(grid.ringIds(id), Array.from(full.ringIds(id)));
      assert.deepEqual(grid.polygon(id), full.polygon(id));
      assert.equal(r.areas[i], full.areas[id - 1]);
      assert.equal(r.degrees[i], full.degreeOf(id)); pentagons += r.degrees[i] === 5;
    }
    grid.trim([], 2);
  }
  assert.equal(count, 1000000); assert.equal(pentagons, 12);
});

test('cold picking at poles, cube seams, pentagons and polygon edges agrees with frozen topology', async () => {
  const grid = regional();
  const directions = [[0,1,0],[0,-1,0],[1,0,1],[-1,1,1],[1,-1,-1],[0,0,-1],...canonical.pentagons.map(id => Array.from(full.centre(id)))];
  for (const p of directions) {
    await grid.ensureCap(p,.055);
    const id = full.pick(p);
    assert.equal(grid.pick(p), id);
    for (const a of full.polygon(id)) {
      const centre = full.centre(id);
      const inside = Array.from(a, (v,k) => v*.999 + centre[k]*.001);
      assert.equal(await grid.run(()=>grid.pick(inside)), full.pick(inside));
    }
    grid.trim([], 12);
  }
  assert.ok(grid.stats.loadedCells < 15000);
});

test('connected footprints, design projections and purchased artwork UV inputs are identical across regions', async () => {
  const grid = regional();
  for (const anchor of [1,57,31677,966630,full.pick([1,0,1])]) {
    const expected = full.connected(anchor,1200,2.5);
    await grid.ensureCells(expected);
    const result = await grid.run(()=>grid.connected(anchor,1200,2.5));
    assert.deepEqual(result, expected);
    assert.equal(grid.isConnected(result), true);
    assert.deepEqual(grid.cells(result, anchor), full.cells(expected, anchor));
    const frame = grid.frame(anchor);
    for (const id of [result[0].id,result.at(-1).id]) assert.deepEqual(grid.polygon(id).map(p=>grid.project(p,frame)),full.polygon(id).map(p=>full.project(p,full.frame(anchor))));
  }
});

test('concurrent requests deduplicate; unavailable regions stay unpickable and retry without a full download', async () => {
  let attempts=0;
  const grid = new RegionalTopology(manifest,index,async(path,options)=>{attempts++;await new Promise(resolve=>setTimeout(resolve,5));if(attempts===1)throw Error('offline');return readRegion(path,options);});
  const id=31677,key=index[id-1];
  await assert.rejects(Promise.all([grid.loadRegion(key),grid.loadRegion(key)]),/offline/);
  assert.equal(attempts,1);assert.throws(()=>grid.polygon(id),MissingRegion);
  await Promise.all([grid.loadRegion(key),grid.loadRegion(key)]);assert.equal(attempts,2);
  assert.deepEqual(grid.polygon(id),full.polygon(id));
  await grid.ensureCap([0,0,1],.1);grid.trim([id],1);
  assert.ok(grid.regions.has(key));assert.equal(grid.regions.size,1);
});

test('delivery allowlist includes regional assets and excludes the monolithic topology', async () => {
  const files=await runtimeFiles('public');
  assert.ok(files.includes('topology/regions-v1/index.gz'));
  assert.ok(files.includes('topology/regions-v1/1535.gz'));
  assert.ok(!files.includes('topology/geodesic-v1.packed.gz'));
});

test('visible grid requests promote queued regions without duplicating downloads',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),order=[];
 const grid=new RegionalTopology(manifest,index,async(path,options)=>{order.push(Number(path.match(/\/(\d+)\.gz$/)[1]));await gate;return readRegion(path,options);});
 const requests=[0,1,2,3,4,5].map(key=>grid.loadRegion(key));
 requests.push(grid.loadRegion(5,10));release();await Promise.all(requests);
 assert.deepEqual(order,[0,1,2,3,5,4]);assert.equal(grid.stats.requests,6);
});
