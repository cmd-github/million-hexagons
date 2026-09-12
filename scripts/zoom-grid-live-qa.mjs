import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://million-hexagons-staging.million-hexagons.workers.dev',output='artifacts/zoom-grid/live';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[];
try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('#world[data-artwork-ready=true]',{state:'attached',timeout:90000});
  assert.equal(await page.locator('#artworkLoadingStatus').count(),0);
  for(let i=0;i<12;i++){await page.locator('#zoomIn').click();await page.waitForTimeout(100);}
  await page.waitForTimeout(500);await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-zoom.png`});
  const rect=await page.locator('#world').boundingBox();await page.mouse.move(rect.width*.5,rect.height*.55);await page.mouse.down();await page.mouse.move(rect.width*.65,rect.height*.6,{steps:12});await page.mouse.up();
  await page.waitForTimeout(1800);await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-pan.png`});
  assert.equal(await page.locator('#appLoading').isVisible(),false);assert.deepEqual(errors,[]);report.push({mobile,zoomAndPan:true,noBrowsingMessage:true,pageErrors:errors});await page.close();
}}finally{await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
