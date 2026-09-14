// One layout contract across desktop and phones. Mobile browsers use the fixed desktop
// layout viewport from index.html; no mobile dock, bottom sheet or alternate control rail exists.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=(process.env.SMOKE_URL||'http://127.0.0.1:4180').replace(/\/$/,'');
const shots='artifacts/desktop-composition';
await mkdir(shots,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const cases=[
  {name:'desktop',viewport:{width:1440,height:900},mobile:false},
  {name:'phone-390',viewport:{width:390,height:844},mobile:true},
  {name:'phone-320',viewport:{width:320,height:568},mobile:true},
];
const report=[];

try {
  for(const item of cases){
    const page=await browser.newPage({viewport:item.viewport,isMobile:item.mobile,hasTouch:item.mobile,deviceScaleFactor:item.mobile?2:1});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/?geodesicQA');
    await page.waitForSelector('#world[data-ready=true]',{timeout:60000});
    await page.waitForTimeout(400);
    const browse=await page.evaluate(()=>{
      const rect=selector=>{const box=document.querySelector(selector).getBoundingClientRect();return {top:box.top,right:box.right,bottom:box.bottom,left:box.left,width:box.width,height:box.height};};
      return {innerWidth,innerHeight,mobileDock:!!document.querySelector('#mobileDock'),topbar:rect('.topbar'),intro:rect('.intro'),controls:rect('.globe-controls'),controlDisplay:getComputedStyle(document.querySelector('.globe-controls')).display};
    });
    assert.ok(browse.innerWidth>=1100,`${item.name}: must use the desktop layout viewport, got ${browse.innerWidth}`);
    assert.equal(browse.mobileDock,false,`${item.name}: mobile dock must not exist`);
    assert.equal(Math.round(browse.topbar.height),88,`${item.name}: desktop topbar must remain 88px`);
    assert.equal(Math.round(browse.intro.width),340,`${item.name}: desktop hero width must remain 340px`);
    assert.equal(browse.controlDisplay,'grid',`${item.name}: controls must keep the desktop vertical rail`);
    await page.screenshot({path:`${shots}/${item.name}-globe.png`});

    await page.locator('#claimButton').click();
    await page.locator('#designStep').waitFor({state:'visible'});
    await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');
    await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Change image');
    const design=await page.evaluate(()=>{const box=document.querySelector('#buyPanel').getBoundingClientRect();return {top:box.top,right:innerWidth-box.right,bottom:innerHeight-box.bottom,width:box.width};});
    assert.deepEqual(Object.fromEntries(Object.entries(design).map(([key,value])=>[key,Math.round(value)])),{top:16,right:16,bottom:16,width:458},`${item.name}: Design must use the desktop side panel`);
    await page.screenshot({path:`${shots}/${item.name}-design.png`});

    await page.locator('#toPlacement').click();
    await page.locator('#placeStep').waitFor({state:'visible'});
    const place=await page.evaluate(()=>{const box=document.querySelector('#buyPanel').getBoundingClientRect();return {top:box.top,right:innerWidth-box.right,bottom:innerHeight-box.bottom,width:box.width};});
    assert.deepEqual(Object.fromEntries(Object.entries(place).map(([key,value])=>[key,Math.round(value)])),{top:16,right:16,bottom:16,width:458},`${item.name}: Place must keep the same desktop side panel`);
    await page.screenshot({path:`${shots}/${item.name}-place.png`});
    assert.deepEqual(errors,[],`${item.name}: browser errors`);
    report.push({name:item.name,layoutViewport:{width:browse.innerWidth,height:browse.innerHeight},desktopSidePanel:design});
    await page.close();
  }
} finally {
  await browser.close();
}

console.table(report);
console.log('Desktop composition is identical across desktop and mobile browser contexts');
