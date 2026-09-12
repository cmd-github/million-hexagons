import {claimCompiler,validateCompilerCommit} from './artwork-revisions.js';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

export async function artworkService(db,body,{compiler=false,origin,readPlacement,now=Date.now()}){
  const ref=db.collection('stagingArtwork').doc('state');
  if(body.action==='artwork-state'){
    // Retry if a mutation lands between the state, change log and record reads.
    for(let attempt=0;attempt<3;attempt++){
      const state=(await ref.get()).data()||{revision:0},base=Number(body.revision??state.active?.revision??state.revision);
      if(!Number.isSafeInteger(base)||base<0||base>state.revision)throw Error('invalid-revision');
      const changes=await db.collection('stagingArtworkChanges').orderBy('revision').startAfter(base).limit(129).get();
      const rows=changes.docs.map(d=>d.data()).filter(c=>c.revision<=state.revision),ids=[...new Set(rows.map(c=>c.placementId))];
      const overflow=rows.length>128||ids.length>32;
      const records=overflow?[]:await Promise.all(ids.map(readPlacement));
      if(((await ref.get()).data()?.revision||0)!==state.revision)continue;
      const complete=!overflow&&(state.revision===base||rows.length===state.revision-base);
      return{ok:true,active:state.active||null,revision:state.revision,baseRevision:base,complete,overflow,changes:overflow?[]:ids.map((id,index)=>({...rows.filter(c=>c.placementId===id).at(-1),record:records[index]}))};
    }
    throw Error('artwork-changing-retry');
  }
  if(!compiler)throw Error('compiler-authorization-required');
  if(body.action==='artwork-release')return db.runTransaction(async tx=>{const state=(await tx.get(ref)).data()||{};if(state.job?.workerId===body.workerId)tx.set(ref,{job:null,lastCompilerError:String(body.error||'').slice(0,200)},{merge:true});return{ok:true};});
  if(body.action==='artwork-needed'){const state=(await ref.get()).data()||{};return{ok:true,needed:!state.active||!!state.compileRequested};}
  if(body.action==='artwork-index'){
    if(!Array.isArray(body.ids)||body.ids.length>100||body.ids.some(id=>!/^[a-f0-9-]{36}$/.test(id)))throw Error('invalid-index-batch');
    for(const id of body.ids){const record=await readPlacement(id);await db.collection('stagingPlacements').doc(id).set({titleSearch:String(record.title||'').toLowerCase()},{merge:true});}
    return{ok:true,indexed:body.ids.length};
  }
  if(body.action==='artwork-claim')return db.runTransaction(async tx=>{
    const state=(await tx.get(ref)).data()||{revision:0},job=claimCompiler(state,String(body.workerId||''),now);
    tx.set(ref,{job},{merge:true});return{ok:true,job};
  });
  if(body.action==='artwork-renew')return db.runTransaction(async tx=>{
    const state=(await tx.get(ref)).data()||{};
    if(state.job?.workerId!==body.workerId||state.job.expiresAt<=now)throw Error('compiler-lease-lost');
    const job={...state.job,expiresAt:now+15*60*1000};tx.set(ref,{job},{merge:true});return{ok:true,job};
  });
  if(body.action==='artwork-commit'){
    const candidate=body.candidate;
    if(!/^[a-f0-9]{64}$/.test(candidate?.snapshotId)||candidate.base!==`${origin}/releases/artwork/${candidate.snapshotId}`)throw Error('invalid-snapshot-origin');
    const response=await fetch(`${candidate.base}/manifest.json`,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('snapshot-manifest-unavailable');
    const manifest=await response.json();if(manifest.snapshotId!==candidate.snapshotId||manifest.revision!==candidate.revision)throw Error('snapshot-manifest-mismatch');
    for(const [file,expected,size] of [['tree.gz',manifest.treeSha256,1048576],['occupancy.gz',manifest.occupancySha256,125000]]){
      const response=await fetch(`${candidate.base}/${file}`,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('snapshot-index-unavailable');const raw=Buffer.from(await response.arrayBuffer()),bytes=raw[0]===31&&raw[1]===139?gunzipSync(raw,{maxOutputLength:size}):raw;
      if(bytes.length!==size||createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('snapshot-index-checksum-mismatch');
    }
    return db.runTransaction(async tx=>{
    const state=(await tx.get(ref)).data()||{},candidate=body.candidate;
    if(candidate?.base!==`${origin}/releases/artwork/${candidate?.snapshotId}`)throw Error('invalid-snapshot-origin');
    const active=validateCompilerCommit(state,body.job,candidate,now);
    const totals=state.revision===active.revision?{totals:{claimedCells:manifest.cellCount,placements:manifest.placements}}:{};
    tx.set(ref,{active,job:null,compileRequested:state.revision!==active.revision,...totals},{merge:true});
    tx.set(db.collection('stagingArtworkReleases').doc(active.snapshotId),active);
    return{ok:true,active};
    });
  }
  throw Error('unknown-artwork-action');
}
