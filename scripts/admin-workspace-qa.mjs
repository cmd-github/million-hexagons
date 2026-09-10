import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url=process.env.SMOKE_URL||'https://million-hexagons-staging.million-hexagons.workers.dev/';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
await mkdir('artifacts/admin-workspace',{recursive:true});
const report=[];
try{
  for(const mobile of [false,true]){
    const viewport=mobile?{width:390,height:844}:{width:1440,height:900};
    const page=await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    const response=await page.goto(url);assert.equal(response.status(),200);await page.waitForSelector('#world[data-ready=true]',{timeout:90000});await page.waitForFunction(()=>typeof document.querySelector('#openAdmin')?.onclick==='function',null,{timeout:90000});
    await page.locator('#openAdmin').evaluate(button=>{button.hidden=false;button.click();});
    const workspace=page.locator('#adminWorkspace');await workspace.waitFor({state:'visible'});assert.equal(await page.locator('#adminQuery').evaluate(element=>element===document.activeElement),true);
    for(const selector of ['#adminSearch','#closeAdmin'])assert.equal(await page.locator(selector).isVisible(),true);assert.equal(await page.locator('#adminResults').count(),1);
    const box=await workspace.boundingBox();assert.ok(box);assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,`Admin workspace must stay in the viewport: ${JSON.stringify({mobile,viewport,box})}`);
    await page.screenshot({path:`artifacts/admin-workspace/${mobile?'mobile':'desktop'}-open.png`,animations:'disabled'});
    await page.locator('#closeAdmin').click();assert.equal(await workspace.isHidden(),true);assert.deepEqual(errors,[]);
    report.push({mobile,inViewport:true,queryFocused:true,controlsVisible:true,closes:true});await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(report,null,2));
