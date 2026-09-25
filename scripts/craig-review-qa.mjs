import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=(process.env.SMOKE_URL||'http://127.0.0.1:4180').replace(/\/$/,'');
await mkdir('artifacts/craig-review',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report=[];
try{
  for(const viewport of [{width:390,height:844},{width:320,height:568}]){
    const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const errors=[],consoleErrors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
    await page.goto(`${base}/?geodesicQA`);
    assert.match(await page.locator('#loadingMessage').textContent(),/place|hexagons|spin|ideas/i);
    await page.waitForSelector('#world[data-ready=true]',{timeout:60000});
    const controls=async()=>page.locator('.globe-controls').evaluate(element=>{const box=element.getBoundingClientRect();return{top:box.top,right:box.right,bottom:box.bottom};});
    await page.locator('#toggleAccount').evaluate(element=>element.hidden=false);
    const initial=await controls();
    const searchY=await page.locator('#toggleHexSearch').evaluate(element=>element.getBoundingClientRect().top);
    const accountY=await page.locator('#toggleAccount').evaluate(element=>element.getBoundingClientRect().top);
    const zoomY=await page.locator('#zoomIn').evaluate(element=>element.getBoundingClientRect().top);
    assert.ok(searchY<accountY&&accountY<zoomY,'Account must sit between Search and Zoom In');
    await page.locator('#zoomIn').click();await page.waitForTimeout(350);
    assert.deepEqual(await controls(),initial,'The mobile control rail must not move when zooming');
    await page.locator('#homeView').click();await page.waitForTimeout(100);
    await page.locator('#demoTour').click();
    await page.waitForTimeout(5000);
    assert.equal(await page.locator('#demoTour').getAttribute('aria-pressed'),'true',`Tour failed: ${await page.locator('#demoTour').getAttribute('aria-label')} | ${consoleErrors.join(' | ')}`);
    assert.ok(await page.locator('#demoTour').getAttribute('data-stop'));
    await page.locator('#placementInspector').waitFor({state:'visible',timeout:15000});
    await page.locator('#demoTour').evaluate(button=>button.click());assert.equal(await page.locator('#demoTour').getAttribute('aria-pressed'),'false');
    const detailControls=await controls();assert.deepEqual(detailControls,initial,'The mobile control rail must not move for placement details');
    const fit=await page.locator('#placementInspector').evaluate(element=>{const box=element.getBoundingClientRect();return{top:box.top,right:box.right,bottom:box.bottom,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,overflow:getComputedStyle(element).overflowY};});
    assert.ok(fit.top>=0&&fit.bottom<=viewport.height+1);assert.equal(fit.scrollHeight,fit.clientHeight);assert.notEqual(fit.overflow,'auto');
    const railLeft=await page.locator('.globe-controls').evaluate(element=>element.getBoundingClientRect().left);assert.ok(fit.right<railLeft,'Placement details must reserve the fixed control rail');
    assert.match(await page.locator('#inspectorHexagons').textContent(),/^\d[\d,]*$/);
    const first=await page.locator('#inspectorName').textContent();
    assert.equal(await page.locator('#nextPlacement').isEnabled(),true);
    await page.locator('#nextPlacement').click();await page.waitForFunction(name=>document.querySelector('#inspectorName').textContent!==name,first);
    assert.notEqual(await page.locator('#inspectorName').textContent(),first);
    await page.screenshot({path:`artifacts/craig-review/${viewport.width}-placement.png`,fullPage:true});
    assert.deepEqual(errors,[]);
    report.push({viewport,inspector:fit,controls:initial});
    await page.close();
  }
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}


