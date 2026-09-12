import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null},define:{'import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_STAGING_API_URL':JSON.stringify('/__qa/inventory')}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/__qa/inventory',async route=>{await gate;await route.fulfill({json:{placements:[{placementId:'held-inventory',anchor:966630,cells:[966630],cellCount:1,title:'Saved inventory',createdAt:1}]}});});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'commit'});await page.waitForSelector('#world[data-ready=true]',{state:'attached'});assert.equal(await page.locator('#appLoading').isVisible(),true);
 assert.equal(await page.locator('#designStep').isVisible(),false);
 release();await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});
 await page.locator('#claimButton').click();await page.locator('#designStep').waitFor({state:'visible',timeout:90000});await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});await page.waitForTimeout(1600);assert.equal(await page.locator('#placementInspector').isVisible(),false,'Background restoration must not steal focus from editing');assert.equal(await page.evaluate(()=>performanceQA.state().inventoryLoaded),true);assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,previewWaitsForInventory:true,editorWaitsForInventory:true,noFocusSteal:true}));await page.close();
}}finally{await browser.close();await server.close();}
