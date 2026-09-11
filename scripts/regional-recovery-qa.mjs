import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const reports=[];await mkdir('artifacts/regions',{recursive:true});
try {
  for(const mobile of [false,true]) {
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));let fail=true;
    await page.route('**/topology/regions-v1/*.gz',route=>/\/\d+\.gz$/.test(route.request().url())&&fail?route.fulfill({status:503,body:'Temporarily unavailable'}):route.continue());
    await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:4180');await page.waitForSelector('#world[data-ready=true]');
    await page.locator('#toggleHexSearch').click();await page.locator('#hexSearchInput').fill('31677');await page.locator('#hexSearchInput').press('Enter');
    await page.waitForFunction(()=>document.querySelector('#hexSearchStatus').textContent.includes('Try searching again'));
    assert.equal(await page.locator('#claimCell').isVisible(),false);
    fail=false;await page.locator('#hexSearchInput').press('Enter');
    await page.waitForFunction(()=>document.querySelector('#hexSearchStatus').textContent.includes('Centred on'));
    await page.locator('#toggleHexSearch').click();await page.waitForTimeout(1800);
    for(const [name,direction] of [['seam',[1,0,1]],['north',[0,1,0]],['south',[0,-1,0]],['opposite',[0,0,-1]]]) {
      const before=await page.evaluate(()=>performanceQA.state().regions.requests);
      await page.evaluate(direction=>performanceQA.focus(direction,.22),direction);
      await page.waitForFunction(before=>performanceQA.state().regions.requests>before&&performanceQA.state().detailVertices>0,before);
      await page.waitForTimeout(1300);
      const rect=await page.locator('#world').boundingBox();
      await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.waitForTimeout(350);
      await page.locator('#cellTooltip').waitFor({state:'visible'});
      await page.screenshot({path:`artifacts/regions/${mobile?'mobile':'desktop'}-${name}.png`});
      const state=await page.evaluate(()=>performanceQA.state());assert.equal(state.tiles.errors,0);
      reports.push({mobile,location:name,regions:state.regions.retained,detailVertices:state.detailVertices});
    }
    assert.deepEqual(errors,[]);await page.close();
  }
}finally{await writeFile('artifacts/regions/recovery-report.json',JSON.stringify(reports,null,2));await browser.close();}
console.log('Desktop/mobile failed-region recovery, seam/pole traversal and exact hover passed');
