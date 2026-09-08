import {chromium} from 'playwright';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const reports=[],errors=[];fs.mkdirSync('artifacts/studio-scale',{recursive:true});
try {
 for(const mobile of [false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
  // Test-only empty inventory: production/sample availability is left untouched.
  await page.route('**/topology/occupancy-v1.gz',route=>route.fulfill({contentType:'application/gzip',body:gzipSync(Buffer.alloc(1000000))}));
  await page.goto((process.env.SMOKE_URL||'http://127.0.0.1:4180')+'/?geodesicQA');await page.waitForFunction(()=>window.geodesicQA);
  await page.locator('#claimButton').click();await page.locator('#designStep').waitFor({state:'visible'});await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await page.waitForFunction(()=>document.querySelector('#uploadStatus').hidden);
  for(const count of [50000,100000]) {
    const started=Date.now();await page.locator('#hexAmount').fill(String(count));await page.waitForFunction(n=>document.querySelector('#designCount').textContent.startsWith(n.toLocaleString()),count);
    const designMs=Date.now()-started;assert.ok(designMs<10000,'Large design generation must stay bounded');
    await page.locator('#moveImageMode').click();const zoomStart=Date.now();await page.locator('#logoScale').fill('160');const imageZoomMs=Date.now()-zoomStart;assert.ok(imageZoomMs<2000,'Image zoom must stay responsive');
    const panel=await page.locator('#buyPanel').evaluate(e=>({h:e.clientHeight,sh:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth}));assert.ok(panel.sh<=panel.h+1&&panel.sw<=panel.w+1);
    await page.screenshot({path:`artifacts/studio-scale/${mobile?'mobile':'desktop'}-${count}-overview.png`});
    await page.locator('#paintCells').click();await page.waitForTimeout(50);assert.ok(Number.parseInt(await page.locator('#editorZoomValue').textContent())>100,'Paint zooms into editable cells');
    const before=await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),r=await page.locator('#designCanvas').boundingBox();
    const paintStart=Date.now();if(mobile)await page.touchscreen.tap(r.x+r.width*.5,r.y+r.height*.5);else await page.mouse.click(r.x+r.width*.5,r.y+r.height*.5);
    const paintMs=Date.now()-paintStart;assert.notEqual(await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),before);assert.ok(paintMs<2000);
    await page.locator('#undoPaint').click();assert.equal(await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),before);await page.locator('#redoPaint').click();
    await page.screenshot({path:`artifacts/studio-scale/${mobile?'mobile':'desktop'}-${count}-paint.png`});
    await page.locator('#panEditor').click();const pannedBefore=await page.locator('#designCanvas').evaluate(c=>c.toDataURL());
    await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.65,r.y+r.height*.6,{steps:5});await page.mouse.up();await page.waitForTimeout(50);assert.notEqual(await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),pannedBefore);
    await page.locator('#editorFit').click();await page.waitForTimeout(50);
    const draft=await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),placeStart=Date.now();await page.locator('#toPlacement').click();await page.waitForFunction(()=>!document.querySelector('#suggestLocation').disabled);assert.equal(await page.locator('#toReview').isEnabled(),true);
    await page.locator('#suggestLocation').click();await page.waitForFunction(()=>!document.querySelector('#suggestLocation').disabled);assert.equal(await page.locator('#toReview').isEnabled(),true);
    const placeMs=Date.now()-placeStart;await page.locator('#toReview').click();assert.equal(await page.locator('#reviewPrice').textContent(),`$${count.toLocaleString()}`);assert.equal((await page.evaluate(()=>geodesicQA.state())).selected.length,count);
    await page.screenshot({path:`artifacts/studio-scale/${mobile?'mobile':'desktop'}-${count}-review.png`});
    await page.locator('#reviewEditDesign').click();assert.equal(await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),draft);
    reports.push({mobile,count,designMs,imageZoomMs,paintMs,placeMs});console.log(reports.at(-1));
  }
  if(!mobile){await page.locator('#toPlacement').click();await page.waitForFunction(()=>!document.querySelector('#suggestLocation').disabled);await page.locator('#toReview').click();const before=await page.evaluate(()=>geodesicQA.state().sold),start=Date.now();await page.locator('#previewPurchase').click();await page.waitForFunction(()=>document.querySelector('#buyPanel').getAttribute('aria-hidden')==='true',null,{timeout:300000});assert.equal((await page.evaluate(()=>geodesicQA.state())).sold-before,100000);console.log({published:100000,publicationMs:Date.now()-start});await page.waitForTimeout(2500);await page.screenshot({path:'artifacts/studio-scale/desktop-100000-published.png'});}
  await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('artifacts/studio-scale/results.json',JSON.stringify({reports,errors},null,2));console.log('Scale checks passed');
}finally{await browser.close();}
