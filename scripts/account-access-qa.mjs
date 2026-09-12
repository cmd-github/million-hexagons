import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url=process.env.SMOKE_URL||'https://million-hexagons-staging.million-hexagons.workers.dev/';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
await mkdir('artifacts/account-access',{recursive:true});
const report=[];
try{
  for(const mobile of [false,true]){
    const viewport=mobile?{width:390,height:844}:{width:1440,height:900};
    const page=await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    const response=await page.goto(url);assert.equal(response.status(),200);await page.waitForSelector('#world[data-ready=true]',{timeout:90000});await page.waitForFunction(()=>typeof document.querySelector('#toggleAccount')?.onclick==='function',null,{timeout:90000});
    const toggle=page.locator('#toggleAccount');assert.equal(await toggle.isVisible(),true);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert.equal(await toggle.getAttribute('data-icon'),'key');assert.equal(await toggle.locator('svg.ico').count(),1);
    await toggle.click();const panel=page.locator('#accountPanel');await panel.waitFor({state:'visible'});assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#accountEmail').evaluate(element=>element===document.activeElement),true);assert.equal(await page.locator('#sendAccountLink').isVisible(),true);
    const box=await panel.boundingBox();assert.ok(box);assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,`Account panel must stay in the viewport: ${JSON.stringify({mobile,viewport,box})}`);
    const controls=await page.locator('.globe-controls').boundingBox();assert.ok(controls);assert.ok(box.x+box.width<=controls.x+1||mobile,'Desktop panel must open beside the control bar');
    await page.screenshot({path:`artifacts/account-access/${mobile?'mobile':'desktop'}-open.png`,animations:'disabled'});
    await page.keyboard.press('Escape');assert.equal(await panel.isHidden(),true);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert.deepEqual(errors,[]);report.push({mobile,inViewport:true,emailFocused:true,escapeCloses:true});await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(report,null,2));
