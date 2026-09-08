import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
fs.mkdirSync('artifacts/exploration',{recursive:true});
const errors=[];
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4180/?geodesicQA');await p.waitForFunction(()=>window.geodesicQA);
 await p.locator('#toggleHexSearch').click();await p.locator('#hexSearchInput').fill('Nike');await p.locator('#companyResults button').first().click();await p.locator('#placementInspector').waitFor({state:'visible'});
 assert.match(await p.locator('#inspectorDate').textContent(),/^Example claim/);
 assert.equal(await p.locator('#companyResults button').count(),1);
 assert.equal(await p.locator('.example-activity').count(),4);
 assert.ok(await p.locator('#inspectorLogo').evaluate(e=>e.complete&&e.naturalWidth>0));
 const anchor=await p.evaluate(()=>window.geodesicQA.state().inspectedId);
 await p.evaluate(id=>window.geodesicQA.focus(id,.3),anchor);await p.waitForTimeout(200);
 await p.evaluate(()=>{window.hudChanges=[];window.hudObserver=new MutationObserver(ms=>window.hudChanges.push(...ms.filter(m=>!m.target.closest?.('#inspectorHex')).map(m=>m.target.id)));window.hudObserver.observe(document.querySelector('#placementInspector'),{subtree:true,childList:true,attributes:true});});
 const hit=await p.evaluate(id=>window.geodesicQA.screen(id),anchor);await p.mouse.click(hit.x+35,hit.y);await p.waitForTimeout(100);
 assert.notEqual(await p.evaluate(()=>window.geodesicQA.state().inspectedId),anchor);assert.deepEqual(await p.evaluate(()=>window.hudChanges),[]);await p.evaluate(()=>window.hudObserver.disconnect());

 await p.evaluate(()=>localStorage.removeItem('mh-link-totals-v1'));
 await p.locator('#inspectorVisit').dispatchEvent('auxclick',{button:1});assert.match(await p.locator('#inspectorClicks').textContent(),/^329 visits/);
 await p.reload();await p.waitForFunction(()=>window.geodesicQA);await p.locator('#toggleHexSearch').click();await p.locator('#hexSearchInput').fill('Nike');await p.locator('#companyResults button').first().click();assert.equal(await p.locator('#inspectorClicks').textContent(),'329 visits');
 await p.waitForTimeout(1700);await p.locator('#homeView').click();const start=await p.evaluate(()=>Math.hypot(...window.geodesicQA.state().camera));await p.waitForTimeout(300);const middle=await p.evaluate(()=>Math.hypot(...window.geodesicQA.state().camera));await p.waitForTimeout(2200);const end=await p.evaluate(()=>Math.hypot(...window.geodesicQA.state().camera));assert.ok(start<middle&&middle<end);assert.equal(await p.locator('#rotationToggle').getAttribute('aria-pressed'),'true');
 await p.locator('#demoTour').click();await p.waitForFunction(()=>document.querySelector('#demoTour').dataset.phase==='hold');await p.locator('#placementInspector').waitFor({state:'visible'});
 assert.equal(await p.locator('#inspectorName').textContent(),await p.locator('#demoTour').getAttribute('data-stop'));
 await p.waitForTimeout(1000);await p.screenshot({path:`artifacts/exploration/${mobile}-tour.png`});await p.locator('#demoTour').click();
 const id=await p.evaluate(()=>window.geodesicQA.available);await p.evaluate(id=>window.geodesicQA.focus(id,.3),id);await p.waitForTimeout(200);const pos=await p.evaluate(id=>window.geodesicQA.screen(id),id);await p.mouse.move(pos.x,pos.y);await p.locator('#cellTooltip.show').waitFor();assert.equal(await p.locator('#cellNumber').textContent(),'Hexagon #'+id.toLocaleString('en-US'));
 await p.locator('#toggleHexSearch').click();await p.mouse.click(8,100);assert.equal(await p.locator('#hexSearchPanel').isVisible(),false);
 await p.screenshot({path:`artifacts/exploration/${mobile}-overview.png`});await p.close();
}assert.deepEqual(errors,[]);console.log('Home, search, persistent clicks, same-owner HUD stability, logos, example feed, tour and hover passed on desktop/mobile');}finally{await browser.close();}
