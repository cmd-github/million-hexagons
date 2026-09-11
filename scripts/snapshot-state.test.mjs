import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileSnapshot,canActivateSnapshot} from '../src/globe/snapshot-state.js';
const snapshot={snapshotId:'a',revision:10},now=10000;
const feed=changes=>({baseRevision:10,revision:20,complete:true,changes});
const change=(sequence,extra={})=>({placementId:'p',sequence,changedAt:9000,status:'active',wasInSnapshot:true,...extra});
test('edits collapse by permanent placement ID and mask the previous baked version',()=>{
  const state=reconcileSnapshot(snapshot,feed([change(11,{version:2}),change(13,{version:3})]),{now});assert.equal(state.deltas.length,1);assert.equal(state.deltas[0].version,3);assert.deepEqual(state.masks,['p']);
});
test('takedown, revocation and rollback do not resurrect a superseded version',()=>{
  const deleted=reconcileSnapshot(snapshot,feed([change(11),change(12,{status:'deleted'})]),{now});assert.equal(deleted.deltas.length,0);assert.deepEqual(deleted.removed,['p']);assert.deepEqual(deleted.masks,['p']);
  const rollback=reconcileSnapshot(snapshot,feed([change(11,{version:5}),change(12,{version:2})]),{now});assert.equal(rollback.deltas[0].version,2);
});
test('overflow, old deltas, missing feed and stale activation fail closed',()=>{
  assert.equal(reconcileSnapshot(snapshot,feed([change(11,{changedAt:undefined})]),{now}).usable,false);
  assert.equal(reconcileSnapshot(snapshot,{...feed([]),changes:undefined},{now}).usable,false);
  assert.equal(canActivateSnapshot({}, {}, undefined),false);
  assert.equal(reconcileSnapshot(snapshot,{...feed([]),complete:false},{now}).usable,false);
  assert.equal(reconcileSnapshot(snapshot,{...feed([]),overflow:true},{now}).usable,false);
  assert.equal(reconcileSnapshot(snapshot,feed([change(11,{changedAt:0})]),{now,maxAgeMs:1000}).usable,false);
  const prepared={snapshotId:'a',visibleTilesReady:true,occupancyReady:true,changeFeedReady:true};
  assert.equal(canActivateSnapshot(snapshot,prepared,10),true);assert.equal(canActivateSnapshot(snapshot,prepared,11),false);
  assert.equal(canActivateSnapshot(snapshot,{...prepared,visibleTilesReady:false},10),false);
});
