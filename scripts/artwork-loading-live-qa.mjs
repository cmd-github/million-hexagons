import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const origin='https://million-hexagons-staging.million-hexagons.workers.dev';
const output='artifacts/artwork-loading-live';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[];
try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    new MutationObserver(()=>{
      if(!window.artworkReveal&&document.querySelector('#world')?.dataset.artworkReady==='true')window.artworkReveal={ms:performance.now(),resources:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/placements/')).length};
    }).observe(document,{subtree:true,attributes:true,childList:true});
  });
  for(const repeat of [false,true]){
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#world[data-artwork-ready=true]',{state:'attached',timeout:90000});
    assert.equal(await page.locator('#appLoading').isVisible(),false);
    await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${repeat?'repeat':'cold'}-reveal.png`});
    report.push({mobile,repeat,...await page.evaluate(()=>window.artworkReveal)});
  }
  let release;const gate=new Promise(resolve=>release=resolve);let held=0;
  const artworkPattern='**/releases/placements/**';
  await page.route(artworkPattern,async route=>{held++;await gate;await route.continue();});
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#world[data-ready=true]',{state:'attached',timeout:90000});
  for(let attempt=0;attempt<100&&!held;attempt++)await page.waitForTimeout(100);
  assert.ok(held>0,'Live artwork downloads must be exercised');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#appLoading').isVisible(),true,'The live globe stays covered while artwork is withheld');
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-held.png`});
  release();await page.waitForSelector('#world[data-artwork-ready=true]',{state:'attached',timeout:90000});
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-released.png`});
  await page.unroute(artworkPattern);
  assert.deepEqual(errors,[]);report.push({mobile,heldRequests:held,previewGate:true,pageErrors:errors});await context.close();
}}finally{await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
