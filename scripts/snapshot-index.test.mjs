import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeOccupancy,SnapshotOwners} from '../src/globe/snapshot-index.js';
test('occupancy preserves boundary IDs without a placement catalogue',()=>{
  const bytes=new Uint8Array(125000);for(const id of [1,8,9,999999,1000000])bytes[(id-1)>>3]|=1<<((id-1)&7);
  const output=decodeOccupancy(bytes);assert.equal(output.length,1000000);assert.equal(output.filter(v=>v===255).length,5);assert.equal(output[999999],255);assert.throws(()=>decodeOccupancy(bytes.subarray(1)),/Incomplete/);
});
test('owner lookup coalesces downloads and bounds retained metadata',async()=>{
  let requests=0;const index=new SnapshotOwners('/snapshot',async url=>{requests++;const region=Number(url.match(/(\d+)\.json$/)[1]);return{region,placements:[`p${region}`],cells:[[region+1,0]]};},2);
  assert.deepEqual(await Promise.all([index.owner(0,1),index.owner(0,1)]),['p0','p0']);assert.equal(requests,1);
  await index.owner(1,2);await index.owner(2,3);assert.equal(index.cache.size,2);assert.equal(index.cache.has(0),false);assert.equal(await index.owner(2,999),null);
});
