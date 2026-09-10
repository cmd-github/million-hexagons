import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url=process.env.SMOKE_URL||'http://127.0.0.1:4174/';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
await mkdir('artifacts/checkout-reservation',{recursive:true});const report=[];
try{
  for(const mobile of [false,true]){
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});let quotedCells=[],released=false;
    await page.route('**/stagingPlacements',async route=>{const body=route.request().postDataJSON();if(body.action==='quote-reserve'){quotedCells=body.reservation.cells;await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,quote:{displayTotal:'$1',currency:'usd',totalAmountMinor:100,cellCount:1},reservation:{reservationId:'qa-reservation',cellCount:1,status:'active',expiresAtMs:Date.now()+900000},checkoutToken:'x'.repeat(43)})});return;}if(body.action==='release-checkout-reservation'){released=true;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reservation:{reservationId:'qa-reservation',status:'released'}})});return;}await route.abort();});
    await page.goto(url);await page.waitForSelector('#world[data-ready=true]',{timeout:90000});await page.locator('#claimButton').click();await page.locator('#hexAmount').fill('1');await page.locator('#toPlacement').click();await page.waitForFunction(()=>document.querySelector('#toReview').disabled===false,{timeout:90000});
    await page.locator('#toReview').click();await page.waitForFunction(()=>document.body.dataset.flow==='review');assert.equal(quotedCells.length,1);assert.equal(new Set(quotedCells).size,1);assert.equal(await page.locator('#reviewPrice').textContent(),'$1');assert.match(await page.locator('#serverQuoteStatus').textContent(),/^Server confirmed · reserved for 1[45]:/);const actionBox=await page.locator('#previewPurchase').boundingBox();assert.ok(actionBox&&actionBox.y>=0&&actionBox.y+actionBox.height<=(mobile?844:900),`Final action must be visible with the server quote: ${JSON.stringify({mobile,actionBox})}`);
    await page.screenshot({path:`artifacts/checkout-reservation/${mobile?'mobile':'desktop'}-review.png`,animations:'disabled'});await page.locator('#backToPlacement').click();await page.waitForFunction(()=>document.body.dataset.flow==='place');await page.waitForTimeout(200);assert.equal(released,true);
    report.push({mobile,exactCells:true,serverPrice:true,expiryVisible:true,releasedOnBack:true});await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(report,null,2));
