import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSnapshotFeed,canActivateSnapshot} from '../src/globe/snapshot-runtime.js';
const feed=changes=>({active:{revision:10},baseRevision:10,revision:11,complete:true,overflow:false,changes});
const change=(cells=[1])=>({changedAt:900,record:{placementId:'p',cells}});
test('runtime rejects partial, overflowing, expired and geometry-heavy change feeds',()=>{
  assert.equal(validateSnapshotFeed(feed([change()]),1000),true);
  assert.equal(validateSnapshotFeed({...feed([]),complete:false},1000),false);
  assert.equal(validateSnapshotFeed({...feed([]),overflow:true},1000),false);
  assert.equal(validateSnapshotFeed(feed([change()]),400000),false);
  assert.equal(validateSnapshotFeed(feed(Array.from({length:33},()=>change())),1000),false);
  assert.equal(validateSnapshotFeed(feed([change(Array.from({length:100001},(_,i)=>i+1))]),1000),false);
});

test('activation rejects rollover, partial verification and changed release origins',()=>{
  const next={revision:11,snapshotId:'snapshot',base:'https://assets/release'};
  const current={revision:11,complete:true,overflow:false,active:{snapshotId:next.snapshotId,base:next.base}};
  assert.equal(canActivateSnapshot(current,next),true);
  for(const changed of [{revision:12},{complete:false},{overflow:true},{active:{...current.active,snapshotId:'new'}},{active:{...current.active,base:'https://assets/other'}}])assert.equal(canActivateSnapshot({...current,...changed},next),false);
  assert.equal(validateSnapshotFeed(feed([change([0,1000001])]),1000),false);
});
