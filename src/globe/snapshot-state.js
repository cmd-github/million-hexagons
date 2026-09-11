// Snapshot activation must be decided against a complete change feed, never a
// truncated catalogue. This contract is independent of the eventual job runner.
export function reconcileSnapshot(snapshot,feed,{maxDeltas=32,maxAgeMs=300000,now=Date.now()}={}){
  if(!snapshot||!feed||!Number.isSafeInteger(snapshot.revision)||!Number.isSafeInteger(feed.revision)||feed.revision<snapshot.revision||snapshot.revision!==feed.baseRevision||feed.complete!==true||!Array.isArray(feed.changes))return{usable:false,reason:'incomplete-change-feed'};
  if(feed.overflow)return{usable:false,reason:'snapshot-rebuild-required'};
  const latest=new Map();
  for(const change of feed.changes){
    if(!change||typeof change.placementId!=='string'||!change.placementId||!Number.isFinite(change.changedAt)||change.changedAt>now||typeof change.wasInSnapshot!=='boolean'||!['active','deleted','revoked'].includes(change.status))return{usable:false,reason:'invalid-change'};
    if(!Number.isSafeInteger(change.sequence)||change.sequence<=snapshot.revision||change.sequence>feed.revision)return{usable:false,reason:'invalid-change-sequence'};
    const old=latest.get(change.placementId);if(!old||old.sequence<change.sequence)latest.set(change.placementId,change);
  }
  const changes=[...latest.values()];
  if(changes.length>maxDeltas||changes.some(change=>now-change.changedAt>maxAgeMs))return{usable:false,reason:'snapshot-rebuild-required'};
  return{usable:true,revision:feed.revision,deltas:changes.filter(c=>!['deleted','revoked'].includes(c.status)),masks:changes.filter(c=>c.wasInSnapshot).map(c=>c.placementId),removed:changes.filter(c=>['deleted','revoked'].includes(c.status)).map(c=>c.placementId)};
}

export function canActivateSnapshot(candidate,prepared,currentRevision){
  return !!candidate&&!!prepared&&Number.isSafeInteger(candidate.revision)&&candidate.revision===currentRevision&&typeof candidate.snapshotId==='string'&&!!candidate.snapshotId&&prepared.snapshotId===candidate.snapshotId&&prepared.visibleTilesReady===true&&prepared.occupancyReady===true&&prepared.changeFeedReady===true;
}
