import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import sharp from 'sharp';

const latest=JSON.parse(await fs.readFile('artifacts/artwork-snapshot/latest.json','utf8'));
const records=JSON.parse(await fs.readFile(`${latest.base}/records.json`,'utf8'));
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null,hmr:false},define:{'import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_STAGING_API_URL':JSON.stringify('/__qa/loading')}});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const png=await sharp({create:{width:128,height:64,channels:4,background:'#ff0000'}}).png().toBuffer();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await fs.mkdir('artifacts/artwork-loading',{recursive:true});const report=[];
try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,reducedMotion:mobile?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let releaseInventory,releaseImage,releaseTarget,fail=false,empty=false;
  const inventoryGate=new Promise(resolve=>releaseInventory=resolve),imageGate=new Promise(resolve=>releaseImage=resolve);
  let targetGate=Promise.resolve();
  const fixtures=records.map(record=>({...record,artworkDataUrl:`${origin}/__qa/art.png`}));
  await page.route('**/__qa/art.png',async route=>{await imageGate;await route.fulfill({body:png,contentType:'image/png'});});
  await page.route('**/__qa/loading',async route=>{
    const body=route.request().postDataJSON();
    if(body.action==='public-list'){await inventoryGate;return route.fulfill({status:fail?503:200,json:fail?{error:'unavailable'}:{placements:empty?[]:fixtures}});}
    if(body.action==='public-placement'){await targetGate;return route.fulfill({json:{placement:fixtures.find(record=>record.placementId===body.placementId)}});}
    if(body.action==='public-stats')return route.fulfill({json:{stats:{claimedCells:0,remainingCells:1000000,placements:0,views:0,clicks:0}}});
    return route.fulfill({json:{metrics:{views:0,clicks:0},ok:true}});
  });
  await page.goto(origin);await page.waitForSelector('#world[data-ready=true]',{state:'attached',timeout:90000});
  assert.equal(await page.locator('#appLoading').isVisible(),true);
  assert.equal(await page.locator('.topbar').isVisible(),false);
  releaseInventory();await page.waitForTimeout(8500);
  assert.equal(await page.locator('#appLoading').isVisible(),true,'Pending visible images keep the globe covered');
  assert.match(await page.locator('#loadingMessage').textContent(),/longer than usual/);
  await page.screenshot({path:`artifacts/artwork-loading/${mobile?'mobile':'desktop'}-waiting.png`});
  releaseImage();await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});
  assert.equal(await page.locator('#world').getAttribute('data-artwork-ready'),'true');
  await page.screenshot({path:`artifacts/artwork-loading/${mobile?'mobile':'desktop'}-ready.png`});
  targetGate=new Promise(resolve=>releaseTarget=resolve);
  await page.evaluate(id=>{location.hash=`placement=${id}`;},fixtures[0].placementId);
  await page.locator('#artworkLoadingStatus').waitFor({state:'visible'});
  assert.equal(await page.locator('#appLoading').isVisible(),false);
  releaseTarget();await page.locator('#artworkLoadingStatus').waitFor({state:'hidden',timeout:90000});
  fail=true;await page.goto(origin);await page.locator('#loadingRetry').waitFor({state:'visible',timeout:90000});
  await page.screenshot({path:`artifacts/artwork-loading/${mobile?'mobile':'desktop'}-error.png`});
  fail=false;empty=true;await page.locator('#loadingRetry').click();
  await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});
  assert.deepEqual(errors,[]);report.push({mobile,previewGate:true,slowStatus:true,locationStatus:true,retry:true,emptyGlobe:true,reducedMotion:mobile});
  await page.close();
}}finally{await fs.writeFile('artifacts/artwork-loading/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
