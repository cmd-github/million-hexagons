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
  {name:'desktop',viewport:{width:1440,height:900},mobile:false,layoutWidth:1440},
  {name:'phone-390',viewport:{width:390,height:844},mobile:true,layoutWidth:800},
  {name:'phone-320',viewport:{width:320,height:568},mobile:true,layoutWidth:800},
];
const report=[];
const assertDesktopPanel=(box,name)=>{
  assert.equal(Math.round(box.width),458,`${name}: desktop panel width`);
  for(const edge of ['top','right','bottom'])assert.ok(Math.abs(box[edge]-16)<=1,`${name}: desktop panel ${edge} inset`);
};

try {
  for(const item of cases){
    const page=await browser.newPage({viewport:item.viewport,isMobile:item.mobile,hasTouch:item.mobile,deviceScaleFactor:item.mobile?2:1});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/?geodesicQA');
    await page.waitForSelector('#world[data-ready=true]',{timeout:60000});
    await page.waitForTimeout(400);
    const browse=await page.evaluate(()=>{
      const rect=selector=>{const box=document.querySelector(selector).getBoundingClientRect();return {top:box.top,right:box.right,bottom:box.bottom,left:box.left,width:box.width,height:box.height};};
      return {innerWidth,innerHeight,mobileDock:!!document.querySelector('#mobileDock'),topbar:rect('.topbar'),intro:rect('.intro'),headline:rect('.intro h1'),controls:rect('.globe-controls'),controlDisplay:getComputedStyle(document.querySelector('.globe-controls')).display};
    });
    assert.equal(browse.innerWidth,item.layoutWidth,`${item.name}: must use the readable desktop layout viewport`);
    assert.equal(browse.mobileDock,false,`${item.name}: mobile dock must not exist`);
    assert.equal(Math.round(browse.topbar.height),88,`${item.name}: desktop topbar must remain 88px`);
    assert.equal(Math.round(browse.intro.width),340,`${item.name}: desktop hero width must remain 340px`);
    assert.equal(browse.controlDisplay,'grid',`${item.name}: controls must keep the desktop vertical rail`);
    await page.waitForFunction(()=>document.querySelector('#heroChangingWord')?.textContent.endsWith('.')&&document.querySelector('#heroChangingWord').textContent!=='brand.',null,{timeout:7000});
    const changedHeadline=await page.locator('.intro h1').boundingBox();
    assert.equal(Math.round(changedHeadline.width),Math.round(browse.headline.width),`${item.name}: rotating word must not change headline width`);
    assert.equal(Math.round(changedHeadline.height),Math.round(browse.headline.height),`${item.name}: rotating word must not reflow headline`);
    await page.screenshot({path:`${shots}/${item.name}-globe.png`});

    await page.locator('#claimButton').click();
    await page.locator('#locationStep').waitFor({state:'visible'});
    const start=await page.evaluate(()=>window.geodesicQA.state().designAnchor);await page.evaluate(id=>window.geodesicQA.focus(id,.6),start);await page.waitForFunction(()=>window.geodesicQA.state().detailVertices>0);await page.waitForTimeout(250);const point=await page.evaluate(id=>window.geodesicQA.screen(id),start);if(item.mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);await page.locator('#claimCell').waitFor({state:'visible'});await page.locator('#claimCell').click();await page.locator('#shapeStep').waitFor({state:'visible'});await page.locator('#toDesign').click();await page.locator('#designStep').waitFor({state:'visible'});
    await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');
    await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Add another image');
    await page.waitForFunction(()=>Math.abs(innerWidth-document.querySelector('#buyPanel').getBoundingClientRect().right-16)<=1);
    const design=await page.evaluate(()=>{const box=document.querySelector('#buyPanel').getBoundingClientRect();return {top:box.top,right:innerWidth-box.right,bottom:innerHeight-box.bottom,width:box.width};});
    assertDesktopPanel(design,`${item.name}: Design`);
    await page.screenshot({path:`${shots}/${item.name}-design.png`});

    await page.locator('#toPlacement').click();
    await page.locator('#reviewStep').waitFor({state:'visible'});
    await page.waitForFunction(()=>Math.abs(innerWidth-document.querySelector('#buyPanel').getBoundingClientRect().right-16)<=1);
    const place=await page.evaluate(()=>{const box=document.querySelector('#buyPanel').getBoundingClientRect();return {top:box.top,right:innerWidth-box.right,bottom:innerHeight-box.bottom,width:box.width};});
    assertDesktopPanel(place,`${item.name}: Review`);
    await page.screenshot({path:`${shots}/${item.name}-review.png`});
    assert.deepEqual(errors,[],`${item.name}: browser errors`);
    report.push({name:item.name,layoutViewport:{width:browse.innerWidth,height:browse.innerHeight},desktopSidePanel:design});
    await page.close();
  }
  const reduced=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await reduced.goto(base+'/?geodesicQA');await reduced.waitForSelector('#world[data-ready=true]',{timeout:60000});await reduced.waitForTimeout(3200);
  assert.equal(await reduced.locator('#heroChangingWord').textContent(),'brand.');
  assert.equal(await reduced.locator('.hero-cursor').evaluate(element=>getComputedStyle(element).display),'none');
  await reduced.close();
} finally {
  await browser.close();
}

console.table(report);
console.log('Desktop composition is identical across desktop and mobile browser contexts');
