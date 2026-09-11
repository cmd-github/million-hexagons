// Isolated rendering acceptance. Does not enable stale snapshots on live staging.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {build} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const latest=process.env.MH_SCALE_ATLAS?{base:process.env.MH_SCALE_ATLAS}:JSON.parse(await fs.readFile('artifacts/artwork-snapshot/latest.json','utf8'));
const output=process.env.MH_SCALE_ATLAS?'artifacts/snapshot-million':'artifacts/snapshot-render';
const previewOverride=process.env.MH_SCALE_ATLAS&&process.env.MH_PREVIEW;
const snapshot=JSON.parse(await fs.readFile(`${previewOverride?'artifacts/million-preview':latest.base}/manifest.json`,'utf8'));
const root=`${output}/app`;
await build({publicDir:false,build:{outDir:root,emptyOutDir:true},define:{'import.meta.env.DEV':'true','import.meta.env.VITE_STAGING_SANDBOX':'false'},plugins:[{name:'snapshot-render-probe',enforce:'pre',transform(code,id){if(id.endsWith('/src/main.js'))return code.replace("runtimeAsset('artwork/empty')","'/snapshot'");}}]});
const app=path.resolve(root),publicRoot=path.resolve('public'),snapshotRoot=path.resolve(latest.base);
const server=createServer(async(request,response)=>{const url=new URL(request.url,'http://localhost'),relative=url.pathname.slice(1)||'index.html';const base=previewOverride&&(relative==='snapshot/manifest.json'||relative.startsWith('snapshot/preview/'))?path.resolve('artifacts/million-preview'):relative.startsWith('snapshot/')?snapshotRoot:relative.startsWith('topology/')?publicRoot:app;const file=path.resolve(base,relative.startsWith('snapshot/')?relative.slice(9):relative);if(!file.startsWith(base+path.sep)){response.writeHead(403);response.end();return;}
  try{const bytes=await fs.readFile(file),extension=path.extname(file),type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp'}[extension]||'application/octet-stream',compress=['.js','.css','.html','.json'].includes(extension);response.writeHead(200,{'content-type':type,...(compress?{'content-encoding':'gzip'}:{}),'cache-control':relative==='index.html'?'no-cache':'public,max-age=31536000,immutable'});response.end(compress?gzipSync(bytes):bytes);}catch{response.writeHead(404);response.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[],inspection=[];
await fs.mkdir(output,{recursive:true});
try{
  for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(e.message));
    if(mobile){await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});}
    for(const repeat of [false,true]){
      await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'commit'});await page.waitForSelector('#world[data-ready=true]',{timeout:90000});await page.locator('#rotationToggle').click();
      if(snapshot.previewTileSize)await page.waitForFunction(()=>performanceQA.tiles.meaningfulMs,null,{timeout:90000});
      const meaningfulMs=snapshot.previewTileSize?await page.evaluate(()=>performanceQA.tiles.meaningfulMs):null;
      await page.waitForFunction(()=>performanceQA.tiles.required>0&&performanceQA.tiles.fallback===0&&performanceQA.tiles.pending===0,null,{timeout:90000});
      const state=await page.evaluate(()=>({readyMs:performance.now(),...performanceQA.state(),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:r.transferSize,duration:r.duration}))}));
      assert.equal(state.retainedPlacements,0);assert.equal(state.topologyLoaded,false);assert.equal(state.tiles.errors,0);assert.ok(!state.resources.some(r=>r.url.includes('/placements/')||r.url.includes('/sources/')));
      await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${repeat?'repeat':'cold'}.png`});report.push({mobile,repeat,meaningfulMs,...state});
    }
    for(const [name,direction,altitude] of [['northstar',[.246,-.309,.919],1.5],['seam',[1,0,1],.4],['north',[0,1,0],.4],['microcell',[0,0,1],.035]]){
      await page.evaluate(({direction,altitude})=>performanceQA.focus(direction,altitude),{direction,altitude});
      await page.waitForTimeout(1500);
      await page.waitForFunction(()=>performanceQA.tiles.required>0&&performanceQA.tiles.fallback===0&&performanceQA.tiles.pending===0,null,{timeout:90000});
      const state=await page.evaluate(()=>performanceQA.state());
      assert.equal(state.tiles.errors,0);assert.ok(state.tiles.resident<=(mobile?64:128));assert.ok(state.tiles.bytes<(mobile?100:200)*1024*1024);
      inspection.push({mobile,name,...state});
      await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${name}.png`});
    }
    assert.deepEqual(errors,[]);await context.close();
  }
}finally{await fs.writeFile(`${output}/report.json`,JSON.stringify({snapshot,report,inspection},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify(report.map(({resources,...r})=>({...r,requests:resources.length})),null,2));
