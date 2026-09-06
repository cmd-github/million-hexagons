import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const errors=[];let completed=0;
try {
 for(const mobile of [false,true]) for(const type of ['logo','colour','paint']) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto((process.env.SMOKE_URL||'http://127.0.0.1:4180')+'/?geodesicQA');await page.waitForFunction(()=>window.geodesicQA,{timeout:60000});
  await page.locator('#claimButton').click();await page.locator(`#${type}Artwork`).click();
  if(type==='logo') {
    await page.locator('#logoUpload').setInputFiles('scripts/fixtures/geodesic-reference.svg');await page.waitForFunction(()=>!document.querySelector('#toPlacement').disabled);
    await page.locator('#logoOptions summary').click();await page.locator('[data-treatment="repeat"]').click();await page.selectOption('#logoOrientation','180');
  }
  if(type!=='paint')await page.locator('[data-size="400"]').click();
  else {
    const r=await page.locator('#designCanvas').boundingBox();
    await page.locator('#brandColor').fill('#ff4d6d');await page.mouse.click(r.x+r.width*.48,r.y+r.height*.48);
    await page.locator('#brandColor').fill('#4d7cff');await page.mouse.click(r.x+r.width*.65,r.y+r.height*.52);
  }
  const count=(await page.evaluate(()=>geodesicQA.state())).design.length;assert.ok(count>0);
  await page.locator('#toPlacement').click();await page.locator('#toReview').click();await page.waitForTimeout(700);
  const state=await page.evaluate(()=>geodesicQA.state());assert.equal(state.selected.length,count);assert.equal(state.connected,true);assert.deepEqual(state.selected,state.design);
  await page.screenshot({path:`artifacts/geodesic-qa/${mobile?'mobile':'desktop'}-${type}-settled-review.png`});
  await page.locator('#previewPurchase').click();await page.waitForFunction(()=>document.querySelector('#buyPanel').getAttribute('aria-hidden')==='true',null,{timeout:60000});await page.waitForTimeout(700);
  assert.equal((await page.evaluate(()=>geodesicQA.state())).sold-state.sold,count);
  completed++;await page.close();
 }
 assert.deepEqual(errors,[]);console.log({completed,errors});
} finally {await browser.close();}
