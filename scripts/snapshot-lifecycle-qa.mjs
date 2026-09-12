import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import sharp from 'sharp';

const latest=JSON.parse(await fs.readFile('artifacts/artwork-snapshot/latest.json','utf8'));
const manifest=JSON.parse(await fs.readFile(`${latest.base}/manifest.json`,'utf8'));
const records=JSON.parse(await fs.readFile(`${latest.base}/records.json`,'utf8'));
const target=records.find(r=>r.cells.length>=48&&r.cells.length<200);
const editedImage='data:image/png;base64,'+(await sharp({create:{width:128,height:64,channels:4,background:'#ff0000'}}).png().toBuffer()).toString('base64');
assert.ok(target,'A small real placement is required');
manifest.revision=10;manifest.occupancySha256=crypto.createHash('sha256').update(gunzipSync(await fs.readFile(`${latest.base}/occupancy.gz`))).digest('hex');
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null},define:{'import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_ARTWORK_SNAPSHOTS':JSON.stringify('true'),'import.meta.env.VITE_STAGING_API_URL':JSON.stringify('/__qa/artwork')},plugins:[{name:'lifecycle-probe',enforce:'pre',transform(code,id){if(id.endsWith('/src/main.js'))return code+'\nwindow.snapshotFocus=async id=>{await prepareLocation(id);performanceQA.focus(topology.centre(id),.08);};window.snapshotProbe=()=>({current:snapshotRuntime?.current?.revision,visible:snapshotRuntime?.current?.tiles.group.visible,changes:snapshotRuntime?.current?.changes.children.length,inventory:stagingInventoryLoaded,sold,tiles:snapshotRuntime?.current?.tiles.stats});';}}]});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[];
await fs.mkdir('artifacts/snapshot-lifecycle',{recursive:true});
try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile}),errors=[];
  let revision=10,removed=false,offline=false,catalogueRequests=0,mode='deleted',rollover=false,failManifest=false,manifestFailures=0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(`**/${latest.base}/manifest.json`,route=>route.fulfill({json:manifest}));
  await page.route('**/__qa/replacement/**',async route=>{
    if(failManifest&&route.request().url().endsWith('/manifest.json')){manifestFailures++;return route.fulfill({status:503,body:'Unavailable'});}
    const relative=new URL(route.request().url()).pathname.split('/__qa/replacement/')[1];
    if(relative==='manifest.json')return route.fulfill({json:{...manifest,snapshotId:'replacement',revision:14}});
    return route.fulfill({body:await fs.readFile(`${latest.base}/${relative}`),contentType:relative.endsWith('.json')?'application/json':relative.endsWith('.webp')?'image/webp':'application/octet-stream'});
  });
  await page.route('**/__qa/artwork',async route=>{
    const body=route.request().postDataJSON();
    if(body.action==='public-list'){catalogueRequests++;return route.fulfill({json:{placements:[]}});}
    if(body.action==='artwork-state'){
      if(offline)return route.fulfill({status:503,json:{error:'offline'}});
      if(rollover)return route.fulfill({json:{active:{snapshotId:'replacement',base:`${origin}/__qa/replacement`,revision:14},revision:14,baseRevision:body.revision??14,complete:true,overflow:false,changes:[]}});
      return route.fulfill({json:{active:{snapshotId:manifest.snapshotId,base:`${origin}/${latest.base}`,revision:10},revision,baseRevision:body.revision??10,complete:true,overflow:false,changes:removed&&body.revision!==revision?[{revision,changedAt:Date.now(),record:{...target,status:mode==='deleted'?'deleted':'active',artworkDataUrl:mode==='deleted'?'':mode==='edited'?editedImage:target.artworkDataUrl}}]:[]}});
    }
    if(body.action==='public-stats')return route.fulfill({json:{stats:{claimedCells:manifest.cellCount,remainingCells:1000000-manifest.cellCount,placements:records.length,views:0,clicks:0}}});
    if(body.action==='record-event')return route.fulfill({json:{ok:true}});
    if(body.action==='public-placement')return route.fulfill({json:{placement:target}});
    return route.fulfill({json:{ok:true,placements:[]}});
  });
  await page.goto(origin);await page.waitForFunction(()=>window.snapshotProbe?.().current===10&&snapshotProbe().visible,{timeout:90000});
  const initial=await page.evaluate(()=>snapshotProbe());assert.equal(catalogueRequests,0);assert.equal(initial.inventory,true);
  await page.evaluate(id=>{location.hash=`placement=${id}`;},target.placementId);
  await page.waitForFunction(title=>document.querySelector('#inspectorName')?.textContent===title,target.title,{timeout:90000});
  await page.keyboard.press('Escape');
  await page.evaluate(id=>snapshotFocus(id),target.anchor);await page.waitForTimeout(2000);await page.screenshot({path:`artifacts/snapshot-lifecycle/${mobile?"mobile":"desktop"}-before.png`});revision=11;removed=true;
  await page.waitForFunction(()=>snapshotProbe().current===11&&snapshotProbe().visible,{timeout:90000});
  const after=await page.evaluate(()=>snapshotProbe());assert.equal(after.sold,initial.sold-target.cells.length);assert.ok(after.changes>0);
  await page.screenshot({path:`artifacts/snapshot-lifecycle/${mobile?'mobile':'desktop'}-removed.png`});
  const viewport=page.viewportSize();
  const pixels=await sharp(`artifacts/snapshot-lifecycle/${mobile?'mobile':'desktop'}-removed.png`).extract({left:0,top:Math.floor(viewport.height*.35),width:viewport.width,height:Math.floor(viewport.height*.4)}).removeAlpha().raw().toBuffer();
  let yellow=0;for(let i=0;i<pixels.length;i+=3)if(pixels[i]>150&&pixels[i+1]>130&&pixels[i+2]<110)yellow++;
  assert.ok(yellow<100,'Removed yellow artwork must not remain visible');
  offline=true;await page.waitForFunction(()=>!snapshotProbe().visible,{timeout:20000});
  offline=false;await page.waitForFunction(()=>snapshotProbe().visible,{timeout:20000});
  revision=12;mode='edited';await page.waitForFunction(()=>snapshotProbe().current===12&&snapshotProbe().visible,{timeout:90000});
  await page.screenshot({path:`artifacts/snapshot-lifecycle/${mobile?'mobile':'desktop'}-edited.png`});
  const editedPixels=await sharp(`artifacts/snapshot-lifecycle/${mobile?'mobile':'desktop'}-edited.png`).removeAlpha().raw().toBuffer();let red=0;
  for(let i=0;i<editedPixels.length;i+=3)if(editedPixels[i]>180&&editedPixels[i+1]<70&&editedPixels[i+2]<70)red++;
  assert.ok(red>1000,'Replacement artwork must be rendered');
  revision=13;mode='restored';await page.waitForFunction(()=>snapshotProbe().current===13&&snapshotProbe().visible,{timeout:90000});
  assert.equal((await page.evaluate(()=>snapshotProbe())).sold,initial.sold);
  await page.screenshot({path:`artifacts/snapshot-lifecycle/${mobile?'mobile':'desktop'}-restored.png`});
  rollover=true;failManifest=true;
  await page.waitForFunction(()=>!snapshotProbe().visible,{timeout:20000});
  for(let attempt=0;attempt<200&&!manifestFailures;attempt++)await page.waitForTimeout(100);
  assert.ok(manifestFailures>0,'The replacement manifest must actually fail before retry');
  failManifest=false;
  await page.waitForFunction(()=>snapshotProbe().current===14&&snapshotProbe().visible,{timeout:90000});
  const replaced=await page.evaluate(()=>snapshotProbe());assert.equal(replaced.changes,0);assert.equal(replaced.sold,initial.sold);
  await page.screenshot({path:`artifacts/snapshot-lifecycle/${mobile?'mobile':'desktop'}-rollover.png`});
  assert.deepEqual(errors,[]);report.push({mobile,catalogueRequests,initial,after,removal:true,replacement:true,stateFailureHidden:true,recovery:true,failedRolloverRecovery:true,rollover:true});await page.close();
}}finally{await fs.writeFile('artifacts/snapshot-lifecycle/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
