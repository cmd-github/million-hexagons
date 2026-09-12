import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkService} from './artwork-service.js';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

function database(state,changes=[]){
  const db={state,changes,documents:new Map(),reads:0};
  db.collection=name=>({
    doc:id=>({id,get:async()=>{db.reads++;return{data:()=>name==='stagingArtwork'?db.state:db.documents.get(`${name}/${id}`)};},name}),
    orderBy:()=>({startAfter:base=>({limit:limit=>({get:async()=>({docs:db.changes.filter(row=>row.revision>base).slice(0,limit).map(row=>({data:()=>row}))})})})})
  });
  db.runTransaction=async work=>work({get:ref=>ref.get(),set:(ref,value,options)=>{if(ref.name==='stagingArtwork')db.state=options?.merge?{...db.state,...value}:value;else db.documents.set(`${ref.name}/${ref.id}`,value);}});
  return db;
}
test('change feed collapses edits and contains the current deletion, not old artwork',async()=>{
  const db=database({revision:12,active:{revision:10}},[{revision:11,placementId:'p',changedAt:100},{revision:12,placementId:'p',changedAt:101}]);
  const value=await artworkService(db,{action:'artwork-state'},{readPlacement:async placementId=>({placementId,status:'deleted',cells:[1]})});
  assert.equal(value.complete,true);assert.equal(value.changes.length,1);assert.equal(value.changes[0].revision,12);assert.equal(value.changes[0].record.status,'deleted');
});
test('missing log entries and oversized feeds cannot be declared complete',async()=>{
  const missing=database({revision:12,active:{revision:10}},[{revision:12,placementId:'p'}]);
  assert.equal((await artworkService(missing,{action:'artwork-state'},{readPlacement:async()=>({})})).complete,false);
  const overflow=database({revision:139,active:{revision:10}},Array.from({length:129},(_,i)=>({revision:11+i,placementId:`p${i}`})));
  const value=await artworkService(overflow,{action:'artwork-state'},{readPlacement:async()=>{throw Error('Should not read overflowing catalogue');}});
  assert.equal(value.overflow,true);assert.deepEqual(value.changes,[]);
});
test('a mutation during record loading retries the entire public view',async()=>{
  const db=database({revision:11,active:{revision:10}},[{revision:11,placementId:'p'}]);let loads=0;
  const value=await artworkService(db,{action:'artwork-state'},{readPlacement:async()=>{if(!loads++){db.state={...db.state,revision:12};db.changes.push({revision:12,placementId:'p'});}return{status:loads===1?'active':'deleted'};}});
  assert.equal(value.revision,12);assert.equal(value.changes[0].record.status,'deleted');assert.equal(loads,2);
});
test('compiler actions require authorization and stale workers cannot renew',async()=>{
  const db=database({revision:1});
  await assert.rejects(artworkService(db,{action:'artwork-claim',workerId:'a'},{}),/authorization/);
  await artworkService(db,{action:'artwork-claim',workerId:'a'},{compiler:true,now:100});
  await assert.rejects(artworkService(db,{action:'artwork-renew',workerId:'b'},{compiler:true,now:101}),/lease/);
  await artworkService(db,{action:'artwork-release',workerId:'b'},{compiler:true});assert.equal(db.state.job.workerId,'a');
});

test('release activation verifies indexes and retains changes committed during compilation',async()=>{
  const origin='https://assets.example',snapshotId='a'.repeat(64),job={workerId:'worker',revision:10,expiresAt:10000};
  const candidate={snapshotId,base:`${origin}/releases/artwork/${snapshotId}`,revision:10};
  const tree=Buffer.alloc(1048576),occupancy=Buffer.alloc(125000),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const manifest={snapshotId,revision:10,treeSha256:hash(tree),occupancySha256:hash(occupancy),cellCount:48,placements:1};
  const originalFetch=globalThis.fetch;let corrupt=false;
  globalThis.fetch=async url=>url.endsWith('manifest.json')?Response.json(manifest):new Response(gzipSync(corrupt?Buffer.from('corrupt'):url.endsWith('tree.gz')?tree:occupancy));
  try{
    const db=database({revision:11,job,compileRequested:true});
    corrupt=true;await assert.rejects(artworkService(db,{action:'artwork-commit',job,candidate},{compiler:true,origin,now:100}),/checksum/);assert.equal(db.state.active,undefined);
    corrupt=false;await artworkService(db,{action:'artwork-commit',job,candidate},{compiler:true,origin,now:100});
    assert.equal(db.state.active.revision,10);assert.equal(db.state.revision,11);assert.equal(db.state.compileRequested,true);assert.equal(db.state.job,null);
    const expired=database({revision:10,job:{...job,expiresAt:99}});
    await assert.rejects(artworkService(expired,{action:'artwork-commit',job,candidate},{compiler:true,origin,now:100}),/lease/);assert.equal(expired.state.active,undefined);
  }finally{globalThis.fetch=originalFetch;}
});
