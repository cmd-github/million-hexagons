// Restartable leased staging compiler. Run periodically on a trusted worker.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {S3Client,PutObjectCommand,HeadObjectCommand} from '@aws-sdk/client-s3';
import {settings,concurrent} from './staging-release.mjs';
const config=settings(),workerId=crypto.randomUUID(),api=config.VITE_STAGING_API_URL||'https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
if(config.MH_R2_BUCKET!=='million-hexagons-staging-public'||!config.MH_STAGING_QA_KEY)throw Error('Staging compiler credentials required');
const call=async body=>{const r=await fetch(api,{method:'POST',headers:{'content-type':'application/json','x-mh-qa-key':config.MH_STAGING_QA_KEY},body:JSON.stringify(body)}),value=await r.json();if(!r.ok)throw Error(value.error);return value;};
if(!(await call({action:'artwork-needed'})).needed){console.log('Artwork release is current.');process.exit(0);}
const {job}=await call({action:'artwork-claim',workerId});
const workspace=`artifacts/artwork-workers/${workerId}`;
let leaseError=null;
const renewal=setInterval(()=>void call({action:'artwork-renew',workerId}).catch(error=>{leaseError=error;}),60000);
const client=new S3Client({region:'auto',endpoint:`https://${config.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:config.MH_R2_ACCESS_KEY_ID,secretAccessKey:config.MH_R2_SECRET_ACCESS_KEY}});
try{
  const records=[];let cursor=null;
  do{const page=await call({action:'public-list',pageSize:1000,cursor});records.push(...page.placements);if(page.nextCursor===undefined)throw Error('Paged export endpoint required');cursor=page.nextCursor;}while(cursor);
  const state=await call({action:'artwork-state',revision:job.revision});
  if(state.revision!==job.revision)throw Error('Catalogue changed during export; retry job');
  for(let offset=0;offset<records.length;offset+=100)await call({action:'artwork-index',ids:records.slice(offset,offset+100).map(r=>r.placementId)});
  await fs.mkdir(workspace,{recursive:true});
  const exportPath=path.resolve(`${workspace}/export.json`);await fs.writeFile(exportPath,JSON.stringify({revision:job.revision,records}));
  await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/build-artwork-snapshot.mjs'],{stdio:'inherit',env:{...process.env,MH_ARTWORK_EXPORT:exportPath,MH_SNAPSHOT_OUTPUT:workspace}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`Compiler failed: ${code}`)));});
  if(leaseError)throw leaseError;
  const latest=JSON.parse(await fs.readFile(`${workspace}/latest.json`,'utf8')),objects=[];
  async function walk(dir,prefix=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())await walk(path.join(dir,entry.name),relative+'/');else if(!['records.json','checksums.json'].includes(relative))objects.push(relative);}}
  await walk(latest.base);
  await concurrent(objects,async relative=>{
    if(leaseError)throw leaseError;
    const Body=await fs.readFile(path.join(latest.base,relative)),sha256=crypto.createHash('sha256').update(Body).digest('hex'),Key=`releases/artwork/${latest.snapshotId}/${relative}`,Bucket=config.MH_R2_BUCKET;
    let exists=false;
    try{const head=await client.send(new HeadObjectCommand({Bucket,Key}));if(head.Metadata?.sha256!==sha256)throw Error('Immutable snapshot collision');exists=true;}catch(error){if(error.$metadata?.httpStatusCode!==404)throw error;}
    if(!exists)await client.send(new PutObjectCommand({Bucket,Key,Body,IfNoneMatch:'*',ContentType:relative.endsWith('.json')?'application/json':relative.endsWith('.webp')?'image/webp':'application/octet-stream',CacheControl:'public,max-age=31536000,immutable,no-transform',Metadata:{sha256}}));
    const response=await fetch(`${config.MH_ASSET_ORIGIN}/${Key}`,{signal:AbortSignal.timeout(30000)});if(!response.ok||crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex')!==sha256)throw Error(`Public snapshot verification failed: ${relative}`);
  });
  const candidate={snapshotId:latest.snapshotId,revision:job.revision,base:`${config.MH_ASSET_ORIGIN}/releases/artwork/${latest.snapshotId}`};
  console.log(await call({action:'artwork-commit',job,candidate}));
}catch(error){await call({action:'artwork-release',workerId,error:error.message}).catch(()=>{});throw error;}finally{clearInterval(renewal);client.destroy();}
