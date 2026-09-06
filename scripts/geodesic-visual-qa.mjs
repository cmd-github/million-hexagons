import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const directory='artifacts/geodesic-qa';fs.mkdirSync(directory,{recursive:true});
const errors=[],results=[];
try {
 for(const mobile of process.env.QA_QUICK? [false]:[false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto((process.env.SMOKE_URL||'http://127.0.0.1:4180')+'/?geodesicQA');
  await page.waitForFunction(()=>window.geodesicQA,{timeout:60000});
  const prefix=mobile?'mobile':'desktop';
  const locations=await page.evaluate(()=>geodesicQA.locations);
  await page.evaluate(id=>geodesicQA.focus(id,10),locations.equator);await page.waitForTimeout(300);
  await page.screenshot({path:`${directory}/${prefix}-equator-overview.png`});
  for(const [name,id] of Object.entries(locations)) {
    if(process.env.QA_LOCATION && name!==process.env.QA_LOCATION)continue;
    await page.evaluate(id=>geodesicQA.focus(id,.35),id);await page.waitForTimeout(350);
    await page.screenshot({path:`${directory}/${prefix}-${name}-close.png`});
    const point=await page.evaluate(id=>geodesicQA.screen(id),id);
    await page.mouse.move(point.x,point.y);await page.waitForTimeout(100);
    assert.match(await page.locator('#cellId').textContent(),new RegExp('#'+String(id).padStart(6,'0')+'$'));
  }
  if(process.env.QA_QUICK) { console.log({errors});break; }
  for(const [name,id] of Object.entries(locations)) {
    if(process.env.QA_LOCATION && name!==process.env.QA_LOCATION)continue;
    await page.locator('#claimButton').click();await page.locator('#logoArtwork').click();
    await page.locator('#logoUpload').setInputFiles('scripts/fixtures/geodesic-reference.svg');
    await page.waitForFunction(()=>!document.querySelector('#toPlacement').disabled);
    await page.locator('[data-size="150"]').click();await page.locator('#toPlacement').click();
    await page.evaluate(id=>geodesicQA.place(id),id);await page.waitForTimeout(350);
    const before=await page.evaluate(()=>geodesicQA.state());assert.equal(before.selected.length,150);assert.equal(before.connected,true);
    assert.deepEqual(before.design,before.selected);
    await page.screenshot({path:`${directory}/${prefix}-${name}-logo-place.png`});
    await page.locator('#toReview').click();await page.waitForTimeout(300);
    assert.deepEqual((await page.evaluate(()=>geodesicQA.state())).selected,before.selected);
    await page.screenshot({path:`${directory}/${prefix}-${name}-logo-review.png`});
    await page.locator('#previewPurchase').click();await page.waitForFunction(()=>document.querySelector('#buyPanel').getAttribute('aria-hidden')==='true',null,{timeout:60000});await page.waitForTimeout(700);
    const after=await page.evaluate(()=>geodesicQA.state());assert.equal(after.sold-before.sold,150);assert.ok(before.selected.every(id=>after.committed.includes(id)));
    await page.evaluate(id=>geodesicQA.focus(id,.4),id);await page.waitForTimeout(1800);
    await page.screenshot({path:`${directory}/${prefix}-${name}-logo-committed.png`});
    await page.locator('#world').screenshot({path:`${directory}/${prefix}-${name}-logo-canvas.png`});
    results.push({prefix,name,...before});
    // A fresh session keeps the nearby pentagon case independent of the
    // previously committed footprint while exercising real commits each time.
    await page.reload();await page.waitForFunction(()=>window.geodesicQA,{timeout:60000});
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${directory}/results.json`,JSON.stringify(results,null,2));
 console.log(`Geodesic visual checks: ${results.length} placements; no browser errors`);
} finally {await browser.close();}
