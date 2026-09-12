import test from 'node:test';
import assert from 'node:assert/strict';
import {claimCompiler,validateCompilerCommit,readArtworkRevision,writeArtworkRevision} from './artwork-revisions.js';
test('compiler leases reject competing workers and permit recovery after expiry',()=>{
  const job=claimCompiler({revision:4},'a',100,1000);
  assert.throws(()=>claimCompiler({revision:5,job},'b',101),/busy/);
  assert.equal(claimCompiler({revision:5,job},'b',1101).revision,5);
});
test('rollover rejects lost leases, wrong revisions and older snapshots',()=>{
  const job=claimCompiler({revision:4},'a',100),candidate={revision:4,base:'https://assets.example/release',snapshotId:'a'.repeat(64)};
  assert.equal(validateCompilerCommit({job,revision:6},job,candidate,101).revision,4);
  assert.throws(()=>validateCompilerCommit({job:{...job,workerId:'b'}},job,candidate,101),/lease/);
  assert.throws(()=>validateCompilerCommit({job},job,{...candidate,revision:5},101),/invalid/);
  assert.throws(()=>validateCompilerCommit({job,active:{revision:5}},job,candidate,101),/superseded/);
  assert.throws(()=>validateCompilerCommit({job},job,candidate,job.expiresAt),/lease/);
});
test('public invalidation and revision are staged on the same transaction',async()=>{
  const writes=[],db={collection:name=>({doc:id=>({path:`${name}/${id}`})})},tx={get:async()=>({data:()=>({revision:9})}),set:(...v)=>writes.push(v),create:(...v)=>writes.push(v)};
  const state=await readArtworkRevision(db,tx);assert.equal(writeArtworkRevision(db,tx,state,'p','deleted',100),10);
  assert.equal(writes[0][1].revision,10);assert.equal(writes[1][1].revision,10);assert.equal(writes[1][1].placementId,'p');
});
