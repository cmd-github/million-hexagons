import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://million-hexagons-staging.million-hexagons.workers.dev/',output='artifacts/grid-coverage/live';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[];
try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});
  const name=mobile?'mobile':'desktop';
  for(let i=0;i<12;i++){await page.locator('#zoomIn').click();await page.waitForTimeout(100);}
  await page.waitForTimeout(1000);await page.screenshot({path:`${output}/${name}-zoom-early.png`});
  await page.waitForTimeout(3000);await page.screenshot({path:`${output}/${name}-zoom-settled.png`});
  const rect=await page.locator('#world').boundingBox();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.55);await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.75,rect.y+rect.height*.65,{steps:30});await page.mouse.up();
  await page.waitForTimeout(3000);await page.screenshot({path:`${output}/${name}-pan.png`});
  assert.equal(await page.locator('#artworkLoadingStatus').count(),0);assert.equal(await page.locator('#appLoading').isVisible(),false);assert.deepEqual(errors,[]);
  report.push({mobile,zoomAndPan:true,pageErrors:errors,noBrowsingLoader:true});await page.close();
}}finally{await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
