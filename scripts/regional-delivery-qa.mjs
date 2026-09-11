import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.SMOKE_URL||'http://127.0.0.1:4183';
const prefix=process.env.REGIONAL_QA_PREFIX||'delivery';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const reports=[];await mkdir('artifacts/regions',{recursive:true});
try {
  for(const mobile of [false,true]) {
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
    const page=await context.newPage(),errors=[],topologyRequests=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().includes('/topology/'))topologyRequests.push(r.url());});
    await page.addInitScript(()=>{
      window.deliveryTiming={};
      new MutationObserver(()=>{
        if(!deliveryTiming.overviewMs&&document.querySelector('#world[data-ready=true]'))deliveryTiming.overviewMs=performance.now();
        const panel=document.querySelector('#placementInspector');
        if(!deliveryTiming.inspectorMs&&panel&&!panel.hidden)requestAnimationFrame(()=>requestAnimationFrame(()=>{
          if(!deliveryTiming.inspectorMs&&!panel.hidden)deliveryTiming.inspectorMs=performance.now();
        }));
      }).observe(document,{subtree:true,attributes:true,childList:true});
    });
    const cdp=await context.newCDPSession(page);if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    for(const warm of [false,true]) {
      if(warm)await page.reload({waitUntil:'commit'});else await page.goto(origin+'/#cell=966630',{waitUntil:'commit'});
      await page.waitForSelector('#placementInspector:not([hidden])',{timeout:30000});
      assert.equal(await page.locator('#inspectorName').textContent(),'Untitled placement');
      await page.waitForTimeout(1200);
      await page.waitForFunction(()=>deliveryTiming.inspectorMs);
      const timing=await page.evaluate(()=>deliveryTiming);
      const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/topology|stagingPlacements/.test(r.name)).map(r=>({url:r.name,start:r.startTime,ms:r.duration,bytes:r.encodedBodySize})));
      const cache=await page.evaluate(async()=>Object.fromEntries(await Promise.all(['mh-region-index-v1','mh-regions-v1'].map(async name=>[name,(await(await caches.open(name)).keys()).length]))));
      assert.ok(cache['mh-region-index-v1']===1&&cache['mh-regions-v1']>0&&cache['mh-regions-v1']<=192);
      assert.equal(topologyRequests.some(url=>/geodesic-v1\.(packed|bin)/.test(url)),false);
      await page.screenshot({path:`artifacts/regions/${prefix}-${mobile?'mobile':'desktop'}-${warm?'warm':'cold'}.png`});
      reports.push({origin,mobile,cpuRate:mobile?4:1,warm,...timing,cache,resources,errors:[...errors]});console.log(JSON.stringify({...reports.at(-1),resources:undefined}));
    }
    if(process.env.REGIONAL_TIMINGS_ONLY){assert.deepEqual(errors,[]);await context.close();continue;}
    // Review creates a temporary reservation; close the editor to release it.
    await page.locator('#claimButton').click();await page.locator('#designStep').waitFor({state:'visible',timeout:30000});
    await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Change image');
    await page.locator('#logoOrientation').fill('37');const cells=await page.locator('#hexAmount').inputValue();
    await page.locator('#toPlacement').click();
    for(let attempt=0;attempt<5;attempt++){
      await page.locator('#toReview').click();
      await page.waitForFunction(()=>!document.querySelector('#reviewStep').hidden||(!document.querySelector('#toReview').disabled&&document.querySelector('#selectionStatus').textContent.includes('Choose another location.')));
      if(await page.locator('#reviewEditDesign').isVisible())break;
      assert.ok(attempt<4,'Could not find an unreserved location');
      await page.locator('#suggestLocation').click();
    }
    await page.locator('#reviewEditDesign').click();
    assert.equal(await page.locator('#hexAmount').inputValue(),cells);assert.equal(await page.locator('#logoOrientation').inputValue(),'37');
    await page.screenshot({path:`artifacts/regions/${prefix}-${mobile?'mobile':'desktop'}-editor.png`});
    const released=page.waitForResponse(response=>response.url().includes('stagingPlacements')&&response.request().postData()?.includes('release-checkout-reservation'));
    await page.locator('#closeBuy').click();await released;
    assert.deepEqual(errors,[]);await context.close();
  }
}catch(error){
  for(const context of browser.contexts())for(const page of context.pages()){
    await page.screenshot({path:`artifacts/regions/${prefix}-failure.png`}).catch(()=>{});
    console.error(await page.locator('body').innerText().catch(()=>''));
  }
  throw error;
}finally{await writeFile(`artifacts/regions/${prefix}-report.json`,JSON.stringify(reports,null,2));await browser.close();}
