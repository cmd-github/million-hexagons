import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const origin='https://million-hexagons-staging.million-hexagons.workers.dev';
const fixtures=JSON.parse(await fs.readFile('artifacts/editable-brands/report.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report=[];
try{
  for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    for(const repeat of [false,true]){
      const started=Date.now();
      await page.goto(origin,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('#world[data-ready=true]',{timeout:90000});
      const readyMs=Date.now()-started;
      await page.waitForTimeout(5000);
      assert.equal(await page.locator('#placementInspector').isVisible(),false,'Ordinary startup must keep the globe overview');
      const metrics=await page.evaluate(()=>({elapsedMs:performance.now(),heap:performance.memory?.usedJSHeapSize,resources:performance.getEntriesByType('resource').map(r=>({url:r.name,duration:r.duration,transferSize:r.transferSize}))}));
      assert.equal(metrics.resources.some(r=>r.url.includes('sample-hq')||r.url.includes('/brands/')),false);
      await page.screenshot({path:`artifacts/editable-brands/${mobile?'mobile':'desktop'}-${repeat?'repeat':'cold'}.png`});
      report.push({mobile,repeat,readyMs,...metrics});
    }
    for(const name of ['Northstar','Fable','Nightjar','Kite']){
      const fixture=fixtures.find(p=>p.name===name),started=Date.now();
      await page.goto(`${origin}/#placement=${fixture.placementId}`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(name=>document.querySelector('#inspectorName')?.textContent===name,name,{timeout:90000});
      const inspectorMs=Date.now()-started;
      await page.waitForTimeout(5500);
      await page.screenshot({path:`artifacts/editable-brands/${mobile?'mobile':'desktop'}-${name.toLowerCase()}.png`});
      report.push({mobile,name,inspectorMs});
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
}finally{
  await fs.writeFile('artifacts/editable-brands/browser-report.json',JSON.stringify(report,null,2));
  await browser.close();
}
console.log(JSON.stringify(report.map(({resources,...row})=>({...row,...(resources?{requests:resources.length}: {})})),null,2));
