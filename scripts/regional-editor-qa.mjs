import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const reports=[];await mkdir('artifacts/regions',{recursive:true});
try {
  for(const mobile of [false,true]) {
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
    page.setDefaultTimeout(90000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    await page.route('**/topology/occupancy-v1.gz',r=>r.fulfill({body:gzipSync(Buffer.alloc(1000000)),contentType:'application/octet-stream'}));
    await page.goto((process.env.SMOKE_URL||'http://127.0.0.1:4180')+'/?geodesicQA');await page.waitForFunction(()=>window.geodesicQA);
    await page.locator('#claimButton').click();await page.locator('#locationStep').waitFor({state:'visible'});
    const anchor=await page.evaluate(()=>geodesicQA.state().designAnchor);await page.evaluate(id=>geodesicQA.start(id),anchor);await page.locator('#shapeStep').waitFor({state:'visible'});
    for(const count of [1500,10000]) {
      const started=Date.now();await page.locator('#hexAmount').fill(String(count));
      await page.waitForFunction(n=>!document.querySelector('#appLoading').hidden?false:geodesicQA.state().design.length===n,count);
      const designMs=Date.now()-started,ids=await page.evaluate(()=>geodesicQA.state().design);
      await page.waitForTimeout(300);
      await page.locator('#toDesign').click();
      await page.waitForFunction(()=>document.body.dataset.flow==='design',null,{timeout:30000})
        .catch(async()=>{await page.locator('#toDesign').click();await page.waitForFunction(()=>document.body.dataset.flow==='design',null,{timeout:30000});});
      await page.locator('#designStep').waitFor({state:'visible'});
      await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Replace image');
      await page.locator('#toPlacement').click();await page.locator('#reviewStep').waitFor({state:'visible'});assert.deepEqual(await page.evaluate(()=>geodesicQA.state().selected),ids);
      assert.equal(await page.evaluate(()=>geodesicQA.state().connected),true);
      await page.screenshot({path:`artifacts/regions/${mobile?'mobile':'desktop'}-${count}-review.png`});
      await page.locator('#reviewEditDesign').click();assert.deepEqual(await page.evaluate(()=>geodesicQA.state().design),ids);
      reports.push({mobile,count,designMs,parity:true,regions:await page.evaluate(()=>performanceQA.state().regions)});console.log(JSON.stringify(reports.at(-1)));
      if(count===1500)await page.locator('[data-flow-target="shape"]').click();
    }
    assert.equal(requests.some(url=>/geodesic-v1\.(packed|bin)/.test(url)),false);assert.deepEqual(errors,[]);await page.close();
  }
}finally{await writeFile('artifacts/regions/editor-report.json',JSON.stringify(reports,null,2));await browser.close();}
