import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const server=process.env.SMOKE_URL?null:await createServer({server:{host:'127.0.0.1',port:0,watch:null},define:{'import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_STAGING_API_URL':JSON.stringify('/__qa/placements')}});
if(server)await server.listen();
const base=(process.env.SMOKE_URL||`http://127.0.0.1:${server.httpServer.address().port}`).replace(/\/$/,'');
// The tour needs published placements to visit, and the details need more than
// one so Next has somewhere to go.
const catalogue=[966630,720104,410233].map((anchor,index)=>({placementId:`qa-placement-${index}`,topologyVersion:'geodesic-v1',anchor,cells:[anchor],cellCount:index+1,title:`QA placement ${index+1}`,description:'A placement used by the mobile review journey.',destinationUrl:'https://example.com/',artworkDataUrl:'',publicationStatus:'published',status:'active',moderationStatus:'active',createdAt:Date.now()-index*60000,metrics:{views:10*(index+1),clicks:index+1}}));
await mkdir('artifacts/craig-review',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report=[];
try{
  for(const viewport of [{width:390,height:844},{width:320,height:568}]){
    const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const errors=[],consoleErrors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
    if(server)await page.route('**/__qa/placements',async route=>{
      const body=route.request().postDataJSON();
      if(body.action==='public-list')return route.fulfill({json:{placements:catalogue}});
      if(body.action==='public-placement')return route.fulfill({json:{placement:{...catalogue.find(item=>item.placementId===body.placementId)||catalogue[0],version:1}}});
      if(body.action==='public-stats')return route.fulfill({json:{stats:{claimedCells:catalogue.length,remainingCells:1000000-catalogue.length,placements:catalogue.length,views:60,clicks:6},latest:catalogue}});
      return route.fulfill({json:{}});
    });
    await page.goto(`${base}/?geodesicQA`);
    assert.match(await page.locator('#loadingMessage').textContent(),/place|hexagons|spin|ideas/i);
    await page.waitForSelector('#world[data-ready=true]',{timeout:60000});
    const controls=async()=>page.locator('.globe-controls').evaluate(element=>{const box=element.getBoundingClientRect();return{top:box.top,right:box.right,bottom:box.bottom};});
    await page.locator('#toggleAccount').evaluate(element=>element.hidden=false);
    const initial=await controls();
    const searchY=await page.locator('#toggleHexSearch').evaluate(element=>element.getBoundingClientRect().top);
    const accountY=await page.locator('#toggleAccount').evaluate(element=>element.getBoundingClientRect().top);
    const zoomY=await page.locator('#zoomIn').evaluate(element=>element.getBoundingClientRect().top);
    assert.ok(searchY<accountY&&accountY<zoomY,'Account must sit between Search and Zoom In');
    await page.locator('#zoomIn').click();await page.waitForTimeout(350);
    assert.deepEqual(await controls(),initial,'The mobile control rail must not move when zooming');
    await page.locator('#homeView').click();await page.waitForTimeout(100);
    await page.locator('#demoTour').click();
    await page.waitForTimeout(5000);
    assert.equal(await page.locator('#demoTour').getAttribute('aria-pressed'),'true',`Tour failed: ${await page.locator('#demoTour').getAttribute('aria-label')} | ${consoleErrors.join(' | ')}`);
    assert.ok(await page.locator('#demoTour').getAttribute('data-stop'));
    await page.locator('#placementInspector').waitFor({state:'visible',timeout:15000});
    await page.locator('#demoTour').evaluate(button=>button.click());assert.equal(await page.locator('#demoTour').getAttribute('aria-pressed'),'false');
    const detailControls=await controls();assert.deepEqual(detailControls,initial,'The mobile control rail must not move for placement details');
    const fit=await page.locator('#placementInspector').evaluate(element=>{const box=element.getBoundingClientRect();return{top:box.top,right:box.right,bottom:box.bottom,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,overflow:getComputedStyle(element).overflowY};});
    assert.ok(fit.top>=0&&fit.bottom<=viewport.height+1);assert.equal(fit.scrollHeight,fit.clientHeight);assert.notEqual(fit.overflow,'auto');
    const rail=await controls();
    assert.ok(fit.right>=viewport.width-1,'Placement details span the full width');
    assert.ok(fit.top>=rail.bottom,'Placement details sit below the control rail');
    assert.match(await page.locator('#inspectorHexagons').textContent(),/^\d[\d,]*$/);
    const first=await page.locator('#inspectorName').textContent();
    await page.locator('#showNearby').click();
    const nearby=page.locator('#nearbyPlacements button').first();
    await nearby.waitFor({state:'visible',timeout:20000});
    await nearby.click();
    await page.waitForFunction(name=>document.querySelector('#inspectorName').textContent!==name,first,{timeout:20000});
    assert.notEqual(await page.locator('#inspectorName').textContent(),first);
    await page.screenshot({path:`artifacts/craig-review/${viewport.width}-placement.png`,fullPage:true});
    assert.deepEqual(errors,[]);
    report.push({viewport,inspector:fit,controls:initial});
    await page.close();
  }
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();if(server)await server.close();}


