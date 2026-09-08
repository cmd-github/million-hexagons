import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('artifacts/loading',{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
for(const mobile of [false,true]){
 const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile});
 await p.route('**/topology/bootstrap.json',async route=>{await new Promise(r=>setTimeout(r,1800));await route.continue();});
 await p.goto('http://127.0.0.1:4180',{waitUntil:'domcontentloaded'});
 await p.locator('#appLoading').waitFor({state:'visible'});
 assert.equal(await p.locator('.topbar').isVisible(),false);
 assert.equal(await p.locator('#loadingError').isVisible(),false);
 await p.screenshot({path:'artifacts/loading/'+mobile+'-boot.png'});
 await p.locator('#appLoading').waitFor({state:'hidden',timeout:60000});
 await p.route('**/geodesic-v1.bin',async route=>{await new Promise(r=>setTimeout(r,1800));await route.continue();});
 await p.locator('#claimButton').click();await p.locator('#appLoading').waitFor({state:'visible'});
 await p.screenshot({path:'artifacts/loading/'+mobile+'-editor.png'});
 await p.locator('#appLoading').waitFor({state:'hidden',timeout:60000});assert.equal(await p.locator('#designStep').isVisible(),true);
 await p.close();
}
const p=await b.newPage();await p.route('**/topology/bootstrap.json',r=>r.abort());await p.goto('http://127.0.0.1:4180');
await p.locator('#loadingRetry').waitFor({state:'visible'});assert.equal(await p.locator('#loadingError').isVisible(),true);
console.log('Desktop/mobile boot and editor loader plus startup failure recovery passed');
}finally{await b.close();}
