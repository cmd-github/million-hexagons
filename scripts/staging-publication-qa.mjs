import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import sharp from 'sharp';

const env=Object.fromEntries(fs.readFileSync('.env.staging.local','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const at=line.indexOf('=');return [line.slice(0,at).trim(),line.slice(at+1).trim()];}));
const api='https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
const qaKey=env.MH_STAGING_QA_KEY||env.MH_R2_SECRET_ACCESS_KEY;
const qaOwner=`staging-qa-${crypto.randomUUID()}`;
assert.ok(qaKey,'Set MH_STAGING_QA_KEY in ignored .env.staging.local');

const request=async body=>{
  const response=await fetch(api,{method:'POST',headers:{'content-type':'application/json','x-mh-qa-key':qaKey,'x-mh-qa-owner':qaOwner},body:JSON.stringify(body)});
  const responseText=await response.text();
  let result;
  try{result=JSON.parse(responseText);}catch{result={raw:responseText};}
  return {response,result};
};

const waitForPublication=async placementId=>{
  let placement;
  for(let attempt=0;attempt<45;attempt++){
    await new Promise(resolve=>setTimeout(resolve,2000));
    const listed=await request({action:'list'});
    assert.ok(listed.response.ok,JSON.stringify(listed.result));
    placement=listed.result.placements.find(item=>item.placementId===placementId);
    if(placement?.publicationStatus==='published')return placement;
    if(placement?.publicationStatus==='failed')break;
  }
  assert.fail(`Placement did not publish: ${JSON.stringify(placement)}`);
};

const artwork=await sharp({create:{width:640,height:360,channels:4,background:'#17303b'}}).composite([{input:Buffer.from('<svg width="640" height="360"><text x="320" y="195" text-anchor="middle" font-size="64" fill="#d7ff55">QA</text></svg>')}]).webp({quality:95}).toBuffer();
const artworkDataUrl=`data:image/webp;base64,${artwork.toString('base64')}`;
const placementInput=cell=>({topologyVersion:'geodesic-v1',anchor:cell,cells:[cell],title:'Automated publication QA',description:'Disposable staging acceptance placement',destinationUrl:'https://example.com/',artworkDataUrl,sourceArtworkDataUrl:artworkDataUrl});
const designState=cell=>({topologyVersion:'geodesic-v1',anchor:cell,cells:[{id:cell,color:'#d7ff55'}],baseColour:'#17303b',imageTransform:{scale:115,x:7,y:-4,rotation:12,treatment:'original'}});
const createdIds=[];
const draftIds=[];
const reservationIds=[];

try{
  let largeReservation,largeConflictCell;
  for(let block=0;block<10&&!largeReservation;block++){
    const cells=Array.from({length:100_000},(_,index)=>block*100_000+index+1);
    const candidate=await request({action:'reserve',reservation:{topologyVersion:'geodesic-v1',cells}});
    if(candidate.response.status===409)continue;
    assert.ok(candidate.response.ok,JSON.stringify(candidate.result));
    largeReservation=candidate.result.reservation;largeConflictCell=cells[50_000];
  }
  assert.ok(largeReservation,'Could not find a free 100,000-cell reservation test range');
  reservationIds.push(largeReservation.reservationId);
  assert.equal(largeReservation.cellCount,100_000);
  const reservedConflict=await request({action:'reserve',reservation:{topologyVersion:'geodesic-v1',cells:[largeConflictCell]}});
  assert.equal(reservedConflict.response.status,409,JSON.stringify(reservedConflict.result));
  const largeReleased=await request({action:'release-reservation',reservationId:largeReservation.reservationId});
  assert.ok(largeReleased.response.ok,JSON.stringify(largeReleased.result));
  reservationIds.splice(reservationIds.indexOf(largeReservation.reservationId),1);

  const expiryCell=750000+Math.floor(Math.random()*50000);
  const expiring=await request({action:'reserve',ttlMs:1000,reservation:{topologyVersion:'geodesic-v1',cells:[expiryCell]}});
  assert.ok(expiring.response.ok,JSON.stringify(expiring.result));
  reservationIds.push(expiring.result.reservation.reservationId);
  const earlyExpiry=await request({action:'expire-reservation',reservationId:expiring.result.reservation.reservationId});
  assert.equal(earlyExpiry.response.status,409,JSON.stringify(earlyExpiry.result));
  await new Promise(resolve=>setTimeout(resolve,1100));
  const expiryRace=await Promise.all([request({action:'expire-reservation',reservationId:expiring.result.reservation.reservationId}),request({action:'expire-reservation',reservationId:expiring.result.reservation.reservationId})]);
  assert.equal(expiryRace.every(result=>result.response.ok),true,JSON.stringify(expiryRace.map(result=>result.result)));
  assert.equal(expiryRace.reduce((total,result)=>total+result.result.reservation.releasedCells,0),1);
  reservationIds.splice(reservationIds.indexOf(expiring.result.reservation.reservationId),1);

  let created,cell;
  for(let attempt=0;attempt<30&&!created;attempt++){
    cell=850000+Math.floor(Math.random()*140000);
    const candidate=await request({action:'create',placement:placementInput(cell)});
    if(candidate.response.status===409)continue;
    assert.ok(candidate.response.ok,JSON.stringify(candidate.result));
    created=candidate.result.placement;
  }
  assert.ok(created,'Could not find an unused QA cell');
  createdIds.push(created.placementId);

  const conflict=await request({action:'create',placement:placementInput(cell)});
  assert.equal(conflict.response.status,409,JSON.stringify(conflict.result));
  assert.equal(conflict.result.error,'cells-unavailable');

  const published=await waitForPublication(created.placementId);
  assert.match(published.artworkDataUrl,/^https:\/\/assets-staging\.millionhexagons\.com\/releases\/placements\//);
  const artworkResponse=await fetch(published.artworkDataUrl);
  assert.equal(artworkResponse.status,200);
  assert.equal(artworkResponse.headers.get('cache-control')?.includes('immutable'),true);
  const metadataUrl=`https://assets-staging.millionhexagons.com/releases/placements/${created.placementId}/versions/1/placement.json`;
  const metadataResponse=await fetch(metadataUrl);
  assert.equal(metadataResponse.status,200);
  const metadata=await metadataResponse.json();
  assert.equal(metadata.placementId,created.placementId);
  assert.equal(JSON.stringify(metadata).includes(qaOwner),false);

  const savedDraft=await request({action:'save-draft',draft:{title:'Recoverable QA draft',description:'Private editable state',destinationUrl:'https://draft.example.com/',designState:designState(cell),originalArtworkDataUrl:artworkDataUrl}});
  assert.ok(savedDraft.response.ok,JSON.stringify(savedDraft.result));
  const draftId=savedDraft.result.draft.draftId;
  draftIds.push(draftId);
  const loadedDraft=await request({action:'get-draft',draftId});
  assert.ok(loadedDraft.response.ok,JSON.stringify(loadedDraft.result));
  assert.deepEqual(loadedDraft.result.draft.designState,{schemaVersion:1,...designState(cell)});
  assert.equal(loadedDraft.result.draft.originalArtworkDataUrl,artworkDataUrl);

  const updated=await request({action:'update-content',placementId:created.placementId,content:{title:'Updated publication QA',description:'Immutable version two',destinationUrl:'https://updated.example.com/',artworkDataUrl,sourceArtworkDataUrl:artworkDataUrl,originalArtworkDataUrl:artworkDataUrl,designState:designState(cell)}});
  assert.ok(updated.response.ok,JSON.stringify(updated.result));
  assert.equal(updated.result.placement.placementId,created.placementId);
  assert.equal(updated.result.placement.version,2);
  const republished=await waitForPublication(created.placementId);
  assert.match(republished.artworkDataUrl,/\/versions\/2\/artwork\.webp$/);
  const recoveredSource=await request({action:'get-content-source',placementId:created.placementId,version:2});
  assert.ok(recoveredSource.response.ok,JSON.stringify(recoveredSource.result));
  assert.deepEqual(recoveredSource.result.placement.designState,{schemaVersion:1,...designState(cell)});
  assert.equal(recoveredSource.result.placement.originalArtworkDataUrl,artworkDataUrl);
  const v2Metadata=await (await fetch(`https://assets-staging.millionhexagons.com/releases/placements/${created.placementId}/versions/2/placement.json`)).json();
  assert.equal(v2Metadata.title,'Updated publication QA');
  assert.equal(JSON.stringify(v2Metadata).includes(qaOwner),false);
  const creditKey=crypto.randomUUID();
  const granted=await request({action:'grant-credits',ownerId:qaOwner,amount:3,reason:'Automated service-credit acceptance',idempotencyKey:creditKey});
  assert.ok(granted.response.ok,JSON.stringify(granted.result));assert.equal(granted.result.credits.available,3);
  const duplicateGrant=await request({action:'grant-credits',ownerId:qaOwner,amount:3,reason:'Automated service-credit acceptance',idempotencyKey:creditKey});
  assert.equal(duplicateGrant.result.credits.available,3);
  const redeemed=await request({action:'redeem-credits',amount:2,placementId:created.placementId,idempotencyKey:crypto.randomUUID()});
  assert.ok(redeemed.response.ok,JSON.stringify(redeemed.result));assert.equal(redeemed.result.credits.available,1);

  const removeLink=await request({action:'moderate',placementId:created.placementId,command:{action:'remove-link',reason:'Automated unsafe-link test'}});assert.ok(removeLink.response.ok,JSON.stringify(removeLink.result));
  let moderated=(await request({action:'list'})).result.placements.find(item=>item.placementId===created.placementId);assert.equal(moderated.destinationUrl,'');assert.equal(moderated.description,'Immutable version two');
  const removeDescription=await request({action:'moderate',placementId:created.placementId,command:{action:'remove-description',reason:'Automated description test'}});assert.ok(removeDescription.response.ok);moderated=(await request({action:'list'})).result.placements.find(item=>item.placementId===created.placementId);assert.equal(moderated.description,'');
  const removeArtwork=await request({action:'moderate',placementId:created.placementId,command:{action:'remove-artwork',reason:'Automated artwork test'}});assert.ok(removeArtwork.response.ok);moderated=(await request({action:'list'})).result.placements.find(item=>item.placementId===created.placementId);assert.equal(moderated.artworkDataUrl,'');assert.equal(moderated.moderationStatus,'artwork-hidden');
  const suspended=await request({action:'moderate',placementId:created.placementId,command:{action:'suspend',reason:'Automated suspension test'}});assert.ok(suspended.response.ok);moderated=(await request({action:'list'})).result.placements.find(item=>item.placementId===created.placementId);assert.equal(moderated.title,'Claimed placement');assert.equal(moderated.description,'Content currently unavailable');
  const restored=await request({action:'moderate',placementId:created.placementId,command:{action:'restore-version',version:1,reason:'Automated rollback test'}});assert.ok(restored.response.ok);moderated=(await request({action:'list'})).result.placements.find(item=>item.placementId===created.placementId);assert.equal(moderated.title,'Automated publication QA');assert.match(moderated.artworkDataUrl,/\/versions\/1\/artwork\.webp$/);
  const adminLookup=await request({action:'admin-lookup',query:created.placementId});assert.ok(adminLookup.response.ok,JSON.stringify(adminLookup.result));assert.equal(adminLookup.result.result.placements.length,1);assert.equal(adminLookup.result.result.placements[0].ownerId,qaOwner);assert.equal(adminLookup.result.result.placements[0].versions.length,2);assert.ok(adminLookup.result.result.placements[0].actions.some(item=>item.action==='restore-version'));assert.ok(adminLookup.result.result.placements[0].actions.some(item=>item.action==='credit-issue'));
  const deletedDraft=await request({action:'delete-draft',draftId});
  assert.ok(deletedDraft.response.ok,JSON.stringify(deletedDraft.result));
  draftIds.splice(draftIds.indexOf(draftId),1);
  const missingDraft=await request({action:'get-draft',draftId});
  assert.equal(missingDraft.response.status,404);

  const removed=await request({action:'revoke',placementId:created.placementId,reason:'Automated repeated-policy-violation test',creditAmount:1});
  assert.ok(removed.response.ok,JSON.stringify(removed.result));
  assert.equal(removed.result.placement.status,'revoked');
  assert.equal(removed.result.credits.available,2);
  createdIds.splice(createdIds.indexOf(created.placementId),1);

  const reused=await request({action:'create',placement:placementInput(cell)});
  assert.ok(reused.response.ok,JSON.stringify(reused.result));
  createdIds.push(reused.result.placement.placementId);
  await waitForPublication(reused.result.placement.placementId);
  const reuseRemoved=await request({action:'delete',placementId:reused.result.placement.placementId});
  assert.ok(reuseRemoved.response.ok,JSON.stringify(reuseRemoved.result));
  createdIds.splice(createdIds.indexOf(reused.result.placement.placementId),1);

  console.log(JSON.stringify({adminLookup:true,adminAudit:true,creditLedger:true,creditIdempotency:true,fieldTakedown:true,fullSuspension:true,versionRollback:true,revocationWithCredit:true,reservation100k:true,reservationConflictSafety:true,expiryRace:true,privateSource:true,recoverableDraft:true,editableDesignSource:true,immutableContentV2:true,backgroundPublication:true,immutableArtwork:true,publicMetadata:true,ownerReload:true,overlapRejected:true,deleteRelease:true,cellReuse:true,cell},null,2));
} finally {
  for(const draftId of draftIds)await request({action:'delete-draft',draftId}).catch(()=>{});
  for(const placementId of createdIds)await request({action:'delete',placementId}).catch(()=>{});
  for(const reservationId of reservationIds)await request({action:'release-reservation',reservationId}).catch(()=>{});
}
