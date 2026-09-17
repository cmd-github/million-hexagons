import {chromium} from 'playwright';
const base=(process.env.SMOKE_URL||'http://127.0.0.1:4180').replace(/\/$/,'');
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
for(const [width,height] of [[320,568],[390,844],[1024,768],[1440,900]]){
 const mobile=width<=390;
 const p=await b.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile});await p.goto(base+'/?geodesicQA');await p.waitForSelector('#world[data-ready=true]',{timeout:60000});
 const rail=await p.locator('.globe-controls').evaluate(element=>({display:getComputedStyle(element).display,columns:getComputedStyle(element).gridTemplateColumns}));
 assert.equal(rail.display,'grid');assert.ok(rail.columns.split(' ').length===1,'Every viewport must keep the desktop vertical control rail');
 await p.locator('#claimButton').click();await p.locator('#locationStep').waitFor({state:'visible'});
 const start=await p.evaluate(()=>window.geodesicQA.state().designAnchor);await p.evaluate(id=>window.geodesicQA.focus(id,.6),start);await p.waitForFunction(()=>window.geodesicQA.state().detailVertices>0);await p.waitForTimeout(250);const startPos=await p.evaluate(id=>window.geodesicQA.screen(id),start);if(mobile)await p.touchscreen.tap(startPos.x,startPos.y);else await p.mouse.click(startPos.x,startPos.y);await p.locator('#claimCell').waitFor({state:'visible'});await p.locator('#claimCell').click();await p.locator('#shapeStep').waitFor({state:'visible'});await p.locator('#toDesign').click();await p.locator('#designStep').waitFor({state:'visible'});
 await p.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await p.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Replace image');await p.locator('#moveImageMode').click();
 const box=await p.locator('#buyPanel').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth}));console.log(width,height,box);assert.ok(box.scroll<=box.height+1&&box.scrollWidth<=box.width+1);
 await p.screenshot({path:'artifacts/globe-design/fit-'+width+'.png'});await p.close();
}
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto(base+'/?geodesicQA');await p.waitForSelector('#world[data-ready=true]',{timeout:60000});await p.locator('#claimButton').click();await p.locator('#locationStep').waitFor({state:'visible'});
const id=await p.evaluate(()=>window.geodesicQA.state().designAnchor);await p.locator('#closeBuy').click();
await p.evaluate(id=>window.geodesicQA.focus(id,.98),id);await p.waitForTimeout(300);
const pos=await p.evaluate(id=>window.geodesicQA.screen(id),id);await p.mouse.click(pos.x,pos.y);await p.locator('#claimCell').waitFor({state:'visible'});
const before=await p.evaluate(()=>window.geodesicQA.state().camera);await p.locator('#claimCell').click();await p.locator('#shapeStep').waitFor({state:'visible'});assert.equal(await p.locator('#locationStep').isHidden(),true);assert.equal(await p.locator('#hexAmount').inputValue(),'10');const after=await p.evaluate(()=>window.geodesicQA.state().camera);assert.ok(Math.abs(Math.hypot(...before)-Math.hypot(...after))<.0001);
await p.locator('#closeBuy').click();await p.evaluate(id=>window.geodesicQA.focus(id,10),id);await p.waitForTimeout(500);
const wide=await p.evaluate(id=>window.geodesicQA.screen(id),id);await p.mouse.click(wide.x,wide.y);assert.equal(await p.locator('#claimCell').isVisible(),false);
await p.evaluate(id=>window.geodesicQA.focus(id,1.5),id);await p.waitForTimeout(1800);const detail=await p.evaluate(id=>window.geodesicQA.screen(id),id),beforeDoubleClick=Math.hypot(...await p.evaluate(()=>window.geodesicQA.state().camera));await p.locator('#world').dispatchEvent('dblclick',{clientX:detail.x,clientY:detail.y});await p.waitForFunction(before=>Math.hypot(...window.geodesicQA.state().camera)<before-.2,beforeDoubleClick);assert.ok(Math.hypot(...await p.evaluate(()=>window.geodesicQA.state().camera))<beforeDoubleClick-.2);
await p.goto(base+'/?geodesicQA#cell='+id);await p.waitForSelector('#world[data-ready=true]',{timeout:60000});await p.waitForTimeout(3000);assert.ok(Math.hypot(...await p.evaluate(()=>window.geodesicQA.state().camera))<4.5);
console.log('Viewport, claim zoom preservation, detail gating, double-click and link arrival passed');
}finally{await b.close();}
