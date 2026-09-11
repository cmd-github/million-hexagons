// Audit the current live placement path using production data/assets, with
// instrumentation injected only into this local Vite build (never deployed).
import fs from 'node:fs/promises';
import {build} from 'vite';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const monitor=JSON.parse(await fs.readFile('deploy/staging-monitor.json','utf8'));
const assetBase=`${monitor.assetOrigin}/releases/${monitor.release}`;
const capture=`const artworkAudit=window.artworkAudit={records:[],images:[],meshes:[],frames:[],visibleReadyMs:null};`;
await build({build:{outDir:'artifacts/artwork-readiness/app',emptyOutDir:true},publicDir:false,define:{'import.meta.env.DEV':'true','import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_RUNTIME_ASSET_BASE':JSON.stringify(assetBase),'import.meta.env.VITE_STAGING_API_URL':JSON.stringify('https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements')},plugins:[{
  name:'artwork-readiness-audit',enforce:'pre',transform(code,id){
    if(!id.endsWith('/src/main.js'))return;
    assert.ok(code.includes('const pendingPersistentArtwork=new Map();'));
    return code.replace('const pendingPersistentArtwork=new Map();',`const pendingPersistentArtwork=new Map();${capture}`)
      .replace('const {record,image}=entry;',`const {record,image}=entry;const auditStart=performance.now();`)
      .replace('pendingPersistentArtwork.delete(id);',`pendingPersistentArtwork.delete(id);artworkAudit.meshes.push({id,readyMs:performance.now(),workMs:performance.now()-auditStart,cells:record.cellCount});`)
      .replace('image.onload=()=>{pendingPersistentArtwork.set',`image.onload=()=>{artworkAudit.images.push({id:record.placementId,readyMs:performance.now(),width:image.naturalWidth,height:image.naturalHeight});pendingPersistentArtwork.set`)
      .replace('stagingInventoryLoaded=true;',`stagingInventoryLoaded=true;artworkAudit.records=records;artworkAudit.inventoryMs=performance.now();`)
      .replace('renderer.render(scene, camera);',`renderer.render(scene, camera);
        if(artworkAudit.frames.length<6000)artworkAudit.frames.push(performance.now());
        if(topology&&stagingInventoryLoaded&&!artworkAudit.visibleReadyMs){
        if(!artworkAudit.visible){
          const direction=globe.worldToLocal(camera.position.clone()).normalize().toArray(),altitude=camera.position.length()-radius;
          const cap=Math.min(Math.acos(radius/camera.position.length())+.03,Math.max(.06,altitude/radius*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(camera.aspect,1)*2));
          const visible=artworkAudit.records.filter(r=>r.artworkDataUrl&&topology.cellsIntersectCap(r.cells,direction,cap));
          artworkAudit.visible=visible.map(r=>r.placementId);
        }
          if(artworkAudit.visible.length&&artworkAudit.visible.every(id=>artworkAudit.meshes.some(m=>m.id===id)))artworkAudit.visibleReadyMs=performance.now();
        }`);
  }
}]});
const appRoot=path.resolve('artifacts/artwork-readiness/app');
const server=createServer(async(request,response)=>{
  const relative=new URL(request.url,'http://localhost').pathname==='/'?'index.html':new URL(request.url,'http://localhost').pathname.slice(1);
  const file=path.resolve(appRoot,relative);
  if(!file.startsWith(appRoot+path.sep)){response.writeHead(403);response.end();return;}
  try{const bytes=await fs.readFile(file),type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';response.writeHead(200,{'content-type':type,'content-encoding':'gzip','cache-control':relative.startsWith('assets/')?'public,max-age=31536000,immutable':'no-cache'});response.end(gzipSync(bytes));}catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await fs.mkdir('artifacts/artwork-readiness',{recursive:true});
const report=[];
try{
  for(const profile of [{name:'desktop',mobile:false,cpu:1},{name:'mobile-constrained',mobile:true,cpu:4}]){
    const context=await browser.newContext({viewport:profile.mobile?{width:390,height:844}:{width:1440,height:900},isMobile:profile.mobile,hasTouch:profile.mobile});
    const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpu});
    if(profile.mobile)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
    page.on('pageerror',error=>errors.push(error.message));
    for(const repeat of [false,true]){
      await page.goto(origin,{waitUntil:'commit'});
      await page.waitForSelector('#world[data-ready=true]',{timeout:90000});
      const firstDrawMs=await page.evaluate(()=>performance.now());
      // Freeze the view so completion refers to one view, not changing visibility.
      await page.locator('#rotationToggle').click();
      await page.waitForFunction(()=>window.artworkAudit?.visibleReadyMs,null,{timeout:90000});
      await page.screenshot({path:`artifacts/artwork-readiness/${profile.name}-${repeat?'repeat':'cold'}.png`});
      const result=await page.evaluate(()=>({audit:artworkAudit,state:performanceQA.state(),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,start:r.startTime,duration:r.duration,bytes:r.transferSize})),heap:performance.memory?.usedJSHeapSize}));
      const frameTimes=result.audit.frames.slice(1).map((v,i)=>v-result.audit.frames[i]).sort((a,b)=>a-b);
      const item={profile:profile.name,repeat,firstDrawMs,visibleArtworkReadyMs:result.audit.visibleReadyMs,inventoryMs:result.audit.inventoryMs,placements:result.audit.records.length,visible:result.audit.visible.length,images:result.audit.images,meshes:result.audit.meshes,regions:result.state.regions,heap:result.heap,maxFrameMs:frameTimes.at(-1),p95FrameMs:frameTimes[Math.floor(frameTimes.length*.95)],resources:result.resources,errors};
      report.push(item);await fs.writeFile('artifacts/artwork-readiness/report.json',JSON.stringify(report,null,2));
      console.log(JSON.stringify({...item,images:item.images.length,meshes:item.meshes.length,resources:item.resources.length}));
    }
    await context.close();
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
