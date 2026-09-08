import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const errors=[];fs.mkdirSync('artifacts/globe-design',{recursive:true});
try{
for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
 page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4180/?geodesicQA');await page.waitForSelector('#world[data-ready=true]',{timeout:60000});
 await page.locator('#claimButton').click();await page.locator('#hexAmount').fill('7');await page.locator('#toPlacement').click();
 await page.waitForFunction(()=>!document.querySelector('#suggestLocation').disabled);
 await page.locator('#editThisSpace').click();
 await page.waitForTimeout(800);
 const ids=await page.evaluate(()=>window.geodesicQA.state().design);
 assert.equal(ids.length,7);
 await page.locator('#paintCells').click();
 const point=await page.evaluate(id=>window.geodesicQA.screen(id),ids[0]);
 if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
 await page.locator('#undoPaint').waitFor({state:'visible'});assert.equal(await page.locator('#undoPaint').isEnabled(),true);
 await page.locator('#undoPaint').click();
 await page.screenshot({path:'artifacts/globe-design/'+mobile+'-globe.png'});
 await page.locator('#editHexMode').click();
 const edge=await page.evaluate(id=>window.geodesicQA.screen(id),ids.at(-1));
 if(mobile)await page.touchscreen.tap(edge.x,edge.y);else await page.mouse.click(edge.x,edge.y);
 await page.waitForFunction(()=>window.geodesicQA.state().design.length===6);
 await page.locator('#undoPaint').click();
 await page.locator('#canvasSurface').click();
 assert.deepEqual(await page.evaluate(()=>window.geodesicQA.state().design),ids);
 await page.locator('#globeSurface').click();await page.locator('#toPlacement').click();
 assert.deepEqual(await page.evaluate(()=>window.geodesicQA.state().selected),ids);
 await page.locator('#toReview').click();assert.deepEqual(await page.evaluate(()=>window.geodesicQA.state().selected),ids);
 await page.locator('#closeBuy').click();await page.locator('#discoverPlacement').click();
 await page.locator('#placementInspector').waitFor({state:'visible'});
 await page.waitForTimeout(1500);
 await page.screenshot({path:'artifacts/globe-design/'+mobile+'-inspect.png'});
 await page.locator('#inspectorNearby').click();await page.locator('#designStep').waitFor({state:'visible'});
 assert.equal((await page.evaluate(()=>window.geodesicQA.state().design)).length,1);
 await page.close();
}
assert.deepEqual(errors,[]);console.log('Globe/canvas exact footprint and inspector journeys passed');
}finally{await browser.close();}
