import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Exercise the real browser client and renderer against controlled HTTP responses.
// No Stripe sessions, reservations or durable placements are created by this suite.
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null},define:{'import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_STAGING_API_URL':JSON.stringify('/__qa/placements'),'import.meta.env.VITE_STAGING_CHECKOUT_URL':JSON.stringify('/__qa/checkout'),'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY':JSON.stringify('pk_test_fixture')}});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
await mkdir('artifacts/persistent-checkout',{recursive:true});
const report=[];
try {
  for(const {mobile,reducedMotion} of [{mobile:false,reducedMotion:'no-preference'},{mobile:true,reducedMotion:'no-preference'},{mobile:true,reducedMotion:'reduce'}]) {
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,reducedMotion});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const records=[{placementId:'existing-a',anchor:966329,cells:[966329],cellCount:1,title:'Saved first placement',createdAt:1,artworkDataUrl:`${origin}/__qa/stalled.webp`},{placementId:'existing-b',anchor:966630,cells:[966630],cellCount:1,title:'Saved second placement',createdAt:2}];
    let failList=false,checkoutPlacement=null,releaseSeen=false;
    await page.route('**/__qa/stalled.webp',()=>{});
    await page.route('**/__qa/placements',async route=>{
      const body=route.request().postDataJSON();let result;
      if(body.action==='public-list'){
        await new Promise(resolve=>setTimeout(resolve,80));
        if(failList){await route.fulfill({status:503,json:{error:'temporarily-unavailable'}});return;}
        result={placements:records};
      } else if(body.action==='quote-reserve') result={quote:{displayTotal:'$1',currency:'usd',totalAmountMinor:100,cellCount:1},reservation:{reservationId:'qa-reservation',expiresAtMs:Date.now()+900000},checkoutToken:'test-token'};
      else if(body.action==='release-checkout-reservation'){releaseSeen=true;result={reservation:{reservationId:body.reservationId,status:'released'}};}
      else if(body.action==='record-event')result={metrics:{views:1,clicks:0}};
      else throw Error(`Unexpected action ${body.action}`);
      await route.fulfill({json:result});
    });
    await page.route('**/__qa/checkout',async route=>{
      checkoutPlacement={...route.request().postDataJSON().placement,placementId:'fresh-paid-placement',cellCount:1,createdAt:Date.now()};
      await new Promise(resolve=>setTimeout(resolve,500));
      await route.fulfill({json:{checkout:{clientSecret:'test-secret',placementId:checkoutPlacement.placementId}}});
    });
    await page.addInitScript(()=>{window.Stripe=()=>({initEmbeddedCheckout:async options=>{await options.fetchClientSecret();window.__completeTestCheckout=options.onComplete;return {mount:selector=>{document.querySelector(selector).textContent='Embedded checkout test fixture';},destroy(){}};}});});
    await page.goto(`${origin}/?geodesicQA${reducedMotion==='reduce'?'':'#cell=966630'}`);
    await page.waitForFunction(()=>window.geodesicQA?.state().inspectedId===966630,null,{timeout:90000});
    assert.deepEqual((await page.evaluate(()=>window.geodesicQA.state().committed)).sort(),[966329,966630]);
    assert.match(await page.locator('#claimTicker').getAttribute('aria-label'),/Saved first placement.*Saved second placement|Saved second placement.*Saved first placement/);
    assert.equal(await page.locator('#inspectorName').textContent(),'Saved second placement');
    // Delayed HTTP responses must unwrap to records, and failures must reject the caller.
    assert.equal(await page.evaluate(async()=>{const client=await import('/src/staging-client.js');return (await client.listPublicClaims()).length;}),2);
    assert.equal(await page.evaluate(async()=>{const client=await import('/src/staging-client.js');return (await client.releaseCheckoutReservation('qa-release','token')).status;}),'released');
    assert.equal(releaseSeen,true);failList=true;
    assert.equal(await page.evaluate(async()=>{try{await (await import('/src/staging-client.js')).listPublicClaims();return 'did-not-reject';}catch(error){return error.code;}}),'temporarily-unavailable');failList=false;
    await page.locator('#placementInspector').waitFor({state:'visible'});await page.waitForTimeout(1500);await page.screenshot({path:`artifacts/persistent-checkout/${mobile?'mobile':'desktop'}-restored.png`});
    await page.evaluate(()=>window.geodesicQA.focus(965773));
    await page.locator('#claimButton').click();await page.locator('#hexAmount').fill('1');await page.locator('#toPlacement').click();await page.waitForFunction(()=>!document.querySelector('#toReview').disabled);await page.locator('#toReview').click();await page.waitForFunction(()=>!document.querySelector('#previewPurchase').disabled);
    await page.locator('#companyName').fill('Fresh saved placement');await page.locator('#previewPurchase').click();await page.locator('.checkout-loading').waitFor({state:'visible'});
    await page.waitForFunction(()=>!!window.__completeTestCheckout);records.push(checkoutPlacement);
    await page.evaluate(()=>window.__completeTestCheckout());await page.waitForFunction(()=>document.querySelector('#embeddedCheckoutPanel').hidden&&!document.body.classList.contains('creating'));
    assert.equal(await page.locator('#inspectorName').textContent(),'Fresh saved placement');
    await page.waitForFunction(()=>window.geodesicQA.state().retainedPlacements===1);
    const anchor=checkoutPlacement.anchor;
    await page.goto(`${origin}/?geodesicQA#cell=${anchor}`);await page.reload();await page.waitForFunction(id=>window.geodesicQA?.state().inspectedId===id,anchor,{timeout:90000});
    assert.ok((await page.evaluate(()=>window.geodesicQA.state().committed)).includes(anchor));
    await page.waitForFunction(()=>window.geodesicQA.state().retainedPlacements===1);
    await page.locator('#placementInspector').waitFor({state:'visible'});await page.waitForTimeout(1500);await page.screenshot({path:`artifacts/persistent-checkout/${mobile?'mobile':'desktop'}-completed.png`});
    await page.evaluate(id=>window.geodesicQA.focus(id),anchor);await page.locator('#claimButton').click();await page.locator('#hexAmount').fill('1');assert.ok(!(await page.evaluate(()=>window.geodesicQA.state().design)).includes(anchor));await page.locator('#toPlacement').click();await page.locator('#placeDesignMode').click();await page.evaluate(id=>window.geodesicQA.focus(id),anchor);await page.waitForTimeout(200);const point=await page.evaluate(id=>window.geodesicQA.screen(id),anchor);if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);assert.equal(await page.locator('#toReview').isDisabled(),true);assert.match(await page.locator('#selectionStatus').textContent(),/already purchased/);
    assert.deepEqual(errors,[]);report.push({mobile,reducedMotion,restoration:true,stalledArtworkDoesNotBlock:true,clientResultsAndErrors:true,loader:true,embeddedCompletion:true,reloadWithArtwork:true,overlapBlockedBeforeCheckout:true});await page.close();
  }
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
