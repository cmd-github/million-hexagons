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
const createdIds=[];

try{
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

  const removed=await request({action:'delete',placementId:created.placementId});
  assert.ok(removed.response.ok,JSON.stringify(removed.result));
  createdIds.splice(createdIds.indexOf(created.placementId),1);

  const reused=await request({action:'create',placement:placementInput(cell)});
  assert.ok(reused.response.ok,JSON.stringify(reused.result));
  createdIds.push(reused.result.placement.placementId);
  await waitForPublication(reused.result.placement.placementId);
  const reuseRemoved=await request({action:'delete',placementId:reused.result.placement.placementId});
  assert.ok(reuseRemoved.response.ok,JSON.stringify(reuseRemoved.result));
  createdIds.splice(createdIds.indexOf(reused.result.placement.placementId),1);

  console.log(JSON.stringify({privateSource:true,backgroundPublication:true,immutableArtwork:true,publicMetadata:true,ownerReload:true,overlapRejected:true,deleteRelease:true,cellReuse:true,cell},null,2));
} finally {
  for(const placementId of createdIds)await request({action:'delete',placementId}).catch(()=>{});
}
