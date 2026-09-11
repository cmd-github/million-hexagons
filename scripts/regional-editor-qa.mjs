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
    await page.locator('#claimButton').click();await page.locator('#designStep').waitFor({state:'visible'});
    await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Change image');
    for(const count of [1500,100000]) {
      const started=Date.now();await page.locator('#hexAmount').fill(String(count));
      await page.waitForFunction(n=>!document.querySelector('#appLoading').hidden?false:geodesicQA.state().design.length===n,count);
      const designMs=Date.now()-started,ids=await page.evaluate(()=>geodesicQA.state().design);
      await page.locator('#toPlacement').click();assert.deepEqual(await page.evaluate(()=>geodesicQA.state().selected),ids);
      await page.locator('#toReview').click();assert.deepEqual(await page.evaluate(()=>geodesicQA.state().selected),ids);
      assert.equal(await page.evaluate(()=>geodesicQA.state().connected),true);
      await page.screenshot({path:`artifacts/regions/${mobile?'mobile':'desktop'}-${count}-review.png`});
      await page.locator('#reviewEditDesign').click();assert.deepEqual(await page.evaluate(()=>geodesicQA.state().design),ids);
      reports.push({mobile,count,designMs,parity:true,regions:await page.evaluate(()=>performanceQA.state().regions)});console.log(JSON.stringify(reports.at(-1)));
    }
    assert.equal(requests.some(url=>/geodesic-v1\.(packed|bin)/.test(url)),false);assert.deepEqual(errors,[]);await page.close();
  }
}finally{await writeFile('artifacts/regions/editor-report.json',JSON.stringify(reports,null,2));await browser.close();}
