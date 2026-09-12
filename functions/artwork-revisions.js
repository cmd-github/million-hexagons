// Read before any transaction writes. The public revision and invalidation are
// committed with the authoritative mutation, never by a delayed event trigger.
export async function readArtworkRevision(db,transaction){
  const ref=db.collection('stagingArtwork').doc('state'),snapshot=await transaction.get(ref);
  return{ref,state:snapshot.data()||{revision:0}};
}
export function writeArtworkRevision(db,transaction,current,placementId,kind,now=Date.now(),cellDelta=0){
  const revision=Number(current.state.revision||0)+1;
  const totals=current.state.totals?{totals:{claimedCells:current.state.totals.claimedCells+cellDelta,placements:current.state.totals.placements+(kind==='created'?1:kind==='deleted'?-1:0)}}:{};
  transaction.set(current.ref,{revision,updatedAtMs:now,compileRequested:true,...totals},{merge:true});
  transaction.create(db.collection('stagingArtworkChanges').doc(String(revision).padStart(16,'0')),{revision,placementId,kind,changedAt:now});
  return revision;
}

export function claimCompiler(state,workerId,now,leaseMs=15*60*1000){
  if(!workerId||!Number.isSafeInteger(state.revision))throw Error('invalid-compiler-request');
  if(state.job?.expiresAt>now&&state.job.workerId!==workerId)throw Error('compiler-busy');
  return{workerId,revision:state.revision,expiresAt:now+leaseMs,startedAt:now};
}
export function validateCompilerCommit(state,job,candidate,now){
  if(!state.job||state.job.workerId!==job.workerId||state.job.revision!==job.revision||state.job.expiresAt<=now)throw Error('compiler-lease-lost');
  if(candidate.revision!==job.revision||!/^https:\/\//.test(candidate.base)||!/^[a-f0-9]{64}$/.test(candidate.snapshotId))throw Error('invalid-snapshot');
  if(state.active&&candidate.revision<state.active.revision)throw Error('snapshot-superseded');
  return{...candidate,publishedAt:now};
}
