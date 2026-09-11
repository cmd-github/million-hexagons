import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.SMOKE_URL||'http://127.0.0.1:4180';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/regions',{recursive:true});
const reports=[];
try {
  for(const mobile of [false,true]) {
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const requests=[];page.on('request',r=>{if(r.url().includes('/topology/'))requests.push(r.url());});
    await page.goto(base,{waitUntil:'commit'});await page.waitForSelector('#world[data-ready=true]');
    assert.equal(requests.some(url=>url.includes('regions-v1')),false,'Overview must not preload exact geometry');
    const cdp=await context.newCDPSession(page);
    // Deliberately isolate the cold exact-geometry transition from Vite's dev
    // module loading. This is emulated bandwidth/CPU, not physical mobile QA.
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:10_000_000/8,uploadThroughput:2_000_000/8});
    if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    for(const warm of [false,true]) {
      await page.locator('#toggleHexSearch').click();await page.locator('#hexSearchInput').fill('965773');
      const started=await page.evaluate(()=>performance.now());
      await page.locator('#hexSearchInput').press('Enter');
      await page.waitForFunction(()=>performanceQA.state().detailVertices>0&&performanceQA.state().detailOpacity>.9&&Math.hypot(...performanceQA.state().camera)<4.5,null,{timeout:30000});
      const readyMs=await page.evaluate(start=>performance.now()-start,started);
      // Real canvas picking must expose the available-cell claim action.
      await page.locator('#toggleHexSearch').click();
      const point=await page.evaluate(()=>performanceQA.screen(965773));
      await page.mouse.click(point.x,point.y);
      await page.locator('#claimCell').waitFor({state:'visible',timeout:10000});
      const picked=Number(await page.locator('#claimCell').getAttribute('data-anchor'));
      assert.equal(picked,965773);
      const state=await page.evaluate(()=>performanceQA.state());
      const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/topology/regions-v1/')).map(r=>({url:r.name,bytes:r.encodedBodySize,ms:r.duration})));
      const report={mobile,warm,readyMs:Math.round(readyMs),picked,geometryBytes:resources.reduce((sum,r)=>sum+r.bytes,0),state,errors};reports.push(report);console.log(JSON.stringify(report));
      assert.equal(requests.some(url=>url.includes('geodesic-v1.packed')||url.includes('geodesic-v1.bin')),false,'Close-up must never request the whole topology');
      assert.ok(state.regions.loadedCells<50000,'Cold close-up must retain only a small fraction of the topology');
      await page.screenshot({path:`artifacts/regions/${mobile?'mobile':'desktop'}-${warm?'warm':'cold'}.png`});
      if(!warm){await page.locator('#homeView').click();await page.waitForTimeout(2400);}
    }
    assert.deepEqual(errors,[]);await context.close();
  }
}finally{await writeFile('artifacts/regions/browser-timings.json',JSON.stringify(reports,null,2));await browser.close();}
