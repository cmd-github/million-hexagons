import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Exercise the real browser client and renderer against controlled HTTP responses.
// No Stripe sessions, reservations or durable placements are created by this suite.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null},define:{'import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_STAGING_API_URL':JSON.stringify('/__qa/placements'),'import.meta.env.VITE_STAGING_CHECKOUT_URL':JSON.stringify('/__qa/checkout'),'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY':JSON.stringify('pk_test_fixture')}});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
await mkdir('artifacts/purchase-polish',{recursive:true});
const report=[];
try {
  const scenarios=[{width:1440,height:900},{width:1024,height:768},{width:390,height:844},{width:320,height:568}];
  for(const {width,height} of process.env.QA_PENDING?[{width:390,height:844}]:scenarios) {
    const mobile=width<700;const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
    page.on('console',m=>{if(m.type()==='error')console.log(m.text());});
    // Reuse downloaded brand fonts when present, avoiding external font timing in visual captures.
    if(existsSync('artifacts/purchase-polish/fonts.css')){
      await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({path:'artifacts/purchase-polish/fonts.css',contentType:'text/css'}));
      await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({path:`artifacts/purchase-polish/${new URL(route.request().url()).pathname.split('/').pop()}`,contentType:'font/ttf'}));
    }
    const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
    const records=[{placementId:'existing-a',anchor:966329,cells:[966329],cellCount:1,title:'Saved first placement',createdAt:1,publicationStatus:'published',status:'active'},{placementId:'existing-b',anchor:966630,cells:[966630],cellCount:1,title:'Saved second placement',createdAt:2,publicationStatus:'published',status:'active'}];
    let failList=false,checkoutPlacement=null,releaseSeen=false;

    await page.route('**/__qa/placements',async route=>{
      const body=route.request().postDataJSON();let result;
      if(body.action==='public-list'){
        await new Promise(resolve=>setTimeout(resolve,process.env.QA_PENDING&&checkoutPlacement?15000:80));
        if(failList){await route.fulfill({status:503,json:{error:'temporarily-unavailable'}});return;}
        result={placements:records};
      } else if(body.action==='quote-reserve') result={quote:{displayTotal:'$10',currency:'usd',totalAmountMinor:1000,cellCount:10},reservation:{reservationId:'qa-reservation',expiresAtMs:Date.now()+900000},checkoutToken:'test-token'};
      else if(body.action==='release-checkout-reservation'){releaseSeen=true;result={reservation:{reservationId:body.reservationId,status:'released'}};}
      else if(body.action==='record-event')result={metrics:{views:1,clicks:0}};
      else if(body.action==='public-stats')result={stats:{claimedCells:records.reduce((sum,record)=>sum+record.cellCount,0),remainingCells:1000000-records.reduce((sum,record)=>sum+record.cellCount,0),placements:records.length,views:1,clicks:0},latest:records};
      else if(body.action==='account-summary')result={summary:{placements:records.length,credits:0,administrator:false}};
      else if(body.action==='list')result={placements:records};
      else throw Error(`Unexpected action ${body.action}`);
      await route.fulfill({json:result});
    });
    await page.route('**/__qa/checkout',async route=>{
      checkoutPlacement={...route.request().postDataJSON().placement,placementId:'fresh-paid-placement',cellCount:10,createdAt:Date.now(),publicationStatus:'published',status:'active'};
      await new Promise(resolve=>setTimeout(resolve,500));
      await route.fulfill({json:{checkout:{clientSecret:'test-secret',placementId:checkoutPlacement.placementId}}});
    });
    await page.addInitScript(()=>{window.__MH_OWNER_QA__={user:{uid:'verified-owner',email:'owner@example.com',getIdToken:async()=>'qa-token'}};window.Stripe=()=>({initEmbeddedCheckout:async options=>{await options.fetchClientSecret();window.__completeTestCheckout=options.onComplete;return {mount:selector=>{document.querySelector(selector).textContent='Embedded checkout test fixture';},destroy(){}};}});});
    const shot=async name=>{console.log(width,name);await page.screenshot({timeout:15000,path:`artifacts/purchase-polish/${width}-${name}.png`});};
    console.log('Navigating',width);await page.goto(`${origin}/?geodesicQA`,{waitUntil:"commit"});
    console.log('Loaded',width);await page.waitForSelector('#world[data-ready=true]',{timeout:90000});
    await page.evaluate(()=>document.fonts.ready);await shot('hero');
    await page.locator('#claimButton').click();await page.locator('#locationStep').waitFor({state:'visible'});await shot('location');
    const anchor=await page.evaluate(()=>window.geodesicQA.state().designAnchor);
    await page.evaluate(id=>window.geodesicQA.focus(id,.6),anchor);await page.waitForFunction(()=>window.geodesicQA.state().detailVertices>0);await page.waitForTimeout(500);
    const point=await page.evaluate(id=>window.geodesicQA.screen(id),anchor);
    if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
    await page.locator('#claimCell').click();await page.locator('#shapeStep').waitFor({state:'visible'});await shot('shape');
    await page.locator('#toDesign').click();await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Replace image');await page.waitForTimeout(750);await shot('image');await page.locator('#resetLogo').scrollIntoViewIfNeeded();await shot('image-controls');
    await page.locator('#paintCells').click();await shot('colour');await page.locator('#fillCells').scrollIntoViewIfNeeded();await shot('colour-controls');assert.notEqual(await page.locator('[data-colour]').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    await page.locator('#fillCells').click();assert.ok(await page.evaluate(()=>window.geodesicQA.state().designCells.every(cell=>cell.color==='#ff4d6d')));
    await page.locator('#clearAllDesign').click();await page.locator('#designConfirm').waitFor({state:'visible'});await shot('dialog');await page.keyboard.press('Escape');assert.equal(await page.locator('#designConfirm').isVisible(),false);assert.equal(await page.locator('#designStep').isVisible(),true);
    await page.locator('#clearAllDesign').click();await page.locator('#designConfirm [value=confirm]').click();await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Add image');assert.equal(await page.evaluate(()=>window.geodesicQA.state().design.length),10);await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Replace image');
    await page.locator('#closeBuy').click();await page.locator('#claimButton').click();await page.locator('#draftNotice').waitFor({state:'visible'});await shot('draft');
    await page.locator('#toPlacement').click();await page.waitForFunction(()=>!document.querySelector('#previewPurchase').disabled);await page.locator('#companyName').fill('A little piece of our world');await shot('review');await page.locator('#previewPurchase').scrollIntoViewIfNeeded();await shot('review-total');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#previewPurchase').click();await page.waitForFunction(()=>!!window.__completeTestCheckout);await shot('checkout');
    if(!process.env.QA_PENDING)records.push(checkoutPlacement);
    if(process.env.QA_PENDING){await page.evaluate(()=>{void window.__completeTestCheckout();});await page.locator('.checkout-complete').waitFor({state:'visible'});await shot('payment-wait');await page.locator('.purchase-confirmation').waitFor({state:'visible',timeout:80000});}else await page.evaluate(()=>window.__completeTestCheckout());await page.locator('.purchase-confirmation').waitFor({state:'visible'});await shot('confirmation');
    assert.equal(await page.locator('.reference').textContent(),'fresh-paid-placement');assert.equal(await page.locator('.confirmation-total').textContent(),'$10');
    await page.locator('.purchase-confirmation button').click();if(process.env.QA_PENDING){assert.equal(await page.locator('#shareCard').isVisible(),false);await page.locator('#claimButton').click();await page.locator('#locationStep').waitFor({state:'visible'});assert.equal(await page.locator('#hexAmount').inputValue(),'0');assert.deepEqual(errors,[]);console.log('Delayed publication: confirmation retained, no repeat payment, fresh next draft');await page.close();continue;}await page.locator('#shareCard').waitFor({state:'visible',timeout:10000});await shot('share');
    assert.deepEqual(errors,[]);report.push({width,height,realGlobeTap:true,draft:true,confirmation:true,errors});await page.close();
  }
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
