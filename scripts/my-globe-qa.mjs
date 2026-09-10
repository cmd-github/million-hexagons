import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null},define:{'import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_STAGING_API_URL':JSON.stringify('/__qa/placements')}});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});await mkdir('artifacts/my-globe',{recursive:true});
const report=[];
try{
  for(const mobile of [false,true]){
    const viewport=mobile?{width:390,height:844}:{width:1440,height:900},page=await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const records=[{placementId:'stripe-owned-placement',anchor:966630,cells:[966630],cellCount:1,title:'Recovered Stripe purchase',description:'Original description',destinationUrl:'https://example.com/',publicationStatus:'published',currentVersion:1,status:'draft',createdAt:Date.now()}];
    let update=null;
    await page.addInitScript(()=>{window.__MH_OWNER_QA__={user:{uid:'firebase-user',email:'buyer@example.com',getIdToken:async()=>'qa-token'}};});
    await page.route('**/__qa/placements',async route=>{const body=route.request().postDataJSON();assert.equal(body.action==='public-list'||route.request().headers().authorization==='Bearer qa-token',true);if(body.action==='public-list')return route.fulfill({json:{placements:records}});if(body.action==='account-summary')return route.fulfill({json:{summary:{placements:1,credits:3,administrator:false}}});if(body.action==='list')return route.fulfill({json:{placements:records}});if(body.action==='update-metadata'){update=body;records[0]={...records[0],...body.content,currentVersion:2,publicationStatus:'queued'};return route.fulfill({json:{placement:{placementId:records[0].placementId,version:2}}});}throw Error(`Unexpected action ${body.action}`);});
    await page.goto(`${origin}/?geodesicQA`);await page.waitForSelector('#world[data-ready=true]',{timeout:90000});
    await page.waitForFunction(()=>document.querySelector('#accountPlacementCount')?.textContent==='1');assert.equal(await page.locator('#accountCreditCount').textContent(),'3');await page.locator('#toggleAccount').click();await page.locator('#accountSignedIn').waitFor({state:'visible'});await page.locator('#openMyGlobe').click();
    const workspace=page.locator('#myGlobe');await workspace.waitFor({state:'visible'});assert.match(await page.locator('#myGlobeSummary').textContent(),/1 placement.*1 cells owned/);assert.equal(await page.locator('.my-globe-card h3').textContent(),'Recovered Stripe purchase');
    const box=await workspace.boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height);
    await page.locator('[data-owner-action=edit]').click();await page.locator('.my-globe-edit [name=title]').fill('Updated from My Globe');await page.locator('.my-globe-edit [name=description]').fill('A new immutable version');await page.locator('.my-globe-edit [type=submit]').click();await page.waitForFunction(()=>document.querySelector('.my-globe-card h3')?.textContent==='Updated from My Globe');assert.equal(update.placementId,'stripe-owned-placement');assert.equal(update.content.destinationUrl,'https://example.com/');
    await page.screenshot({path:`artifacts/my-globe/${mobile?'mobile':'desktop'}.png`,animations:'disabled'});await page.locator('[data-owner-action=view]').click();assert.equal(await workspace.isHidden(),true);assert.deepEqual(errors,[]);report.push({mobile,recoveredPurchase:true,summary:true,metadataVersion:true,inViewport:true,viewOnGlobe:true});await page.close();
  }
}finally{await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
