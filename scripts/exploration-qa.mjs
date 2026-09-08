import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
fs.mkdirSync('artifacts/exploration',{recursive:true});
const errors=[];
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4180/?geodesicQA');await p.waitForFunction(()=>window.geodesicQA);
 await p.locator('#toggleHexSearch').click();await p.locator('#hexSearchInput').fill('Nike');await p.locator('#companyResults button').first().click();
 assert.match(await p.locator('#inspectorDate').textContent(),/Sample placement/);
 await p.locator('#inspectorVisit').dispatchEvent('auxclick',{button:1});assert.match(await p.locator('#inspectorClicks').textContent(),/^1 link clicks/);
 await p.locator('#homeView').click();const start=await p.evaluate(()=>Math.hypot(...window.geodesicQA.state().camera));await p.waitForTimeout(300);const middle=await p.evaluate(()=>Math.hypot(...window.geodesicQA.state().camera));await p.waitForTimeout(1000);const end=await p.evaluate(()=>Math.hypot(...window.geodesicQA.state().camera));assert.ok(start<middle&&middle<end);assert.equal(await p.locator('#rotationToggle').getAttribute('aria-pressed'),'true');
 await p.locator('#demoTour').click();await p.waitForFunction(()=>document.querySelector('#demoTour').dataset.phase==='approach');await p.locator('#placementInspector').waitFor({state:'visible'});
 assert.equal(await p.locator('#inspectorName').textContent(),await p.locator('#demoTour').getAttribute('data-stop'));
 await p.waitForTimeout(1000);await p.screenshot({path:`artifacts/exploration/${mobile}-tour.png`});await p.locator('#demoTour').click();
 const id=await p.evaluate(()=>window.geodesicQA.available);await p.evaluate(id=>window.geodesicQA.focus(id,.3),id);await p.waitForTimeout(200);const pos=await p.evaluate(id=>window.geodesicQA.screen(id),id);await p.mouse.move(pos.x,pos.y);await p.locator('#cellTooltip.show').waitFor();assert.equal(await p.locator('#cellNumber').textContent(),'#'+id.toLocaleString('en-US'));
 await p.locator('#toggleHexSearch').click();await p.mouse.click(8,100);assert.equal(await p.locator('#hexSearchPanel').isVisible(),false);
 await p.screenshot({path:`artifacts/exploration/${mobile}-overview.png`});await p.close();
}assert.deepEqual(errors,[]);console.log('Home easing/rotation, sample search, session clicks, tour HUD, hover IDs and outside dismissal passed on desktop/mobile');}finally{await browser.close();}
