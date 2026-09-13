import {chromium} from 'playwright';
const base=(process.env.SMOKE_URL||'http://127.0.0.1:4180').replace(/\/$/,'');
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
for(const [width,height] of [[320,568],[390,844],[1024,768],[1440,900]]){
 const p=await b.newPage({viewport:{width,height}});await p.goto(base+'/?geodesicQA');await p.waitForSelector('#world[data-ready=true]',{timeout:60000});
 if(width<=390){
  const targets=await p.locator('.globe-controls button:visible, #claimButton').evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{id:element.id,width:box.width,height:box.height,right:box.right,bottom:box.bottom};}));
  assert.ok(targets.every(target=>target.width>=44&&target.height>=41&&target.right<=width&&target.bottom<=height),`Mobile globe controls must be reachable touch targets: ${JSON.stringify(targets)}`);
 }
 await p.locator('#claimButton').click();await p.locator('#designStep').waitFor({state:'visible'});
 await p.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await p.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Change image');await p.locator('#moveImageMode').click();
 const box=await p.locator('#buyPanel').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth}));console.log(width,height,box);assert.ok(box.scroll<=box.height+1&&box.scrollWidth<=box.width+1);
 if(width<=390){const close=await p.locator('#closeBuy').boundingBox();assert.ok(close&&close.width>=44&&close.height>=44,'Mobile editor close control must be a full touch target');}
 await p.screenshot({path:'artifacts/globe-design/fit-'+width+'.png'});await p.close();
}
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto(base+'/?geodesicQA');await p.waitForSelector('#world[data-ready=true]',{timeout:60000});await p.locator('#claimButton').click();await p.locator('#designStep').waitFor({state:'visible'});
const id=await p.evaluate(()=>window.geodesicQA.state().design[0]);await p.locator('#closeBuy').click();
await p.evaluate(id=>window.geodesicQA.focus(id,.98),id);await p.waitForTimeout(300);
const pos=await p.evaluate(id=>window.geodesicQA.screen(id),id);await p.mouse.click(pos.x,pos.y);await p.locator('#claimCell').waitFor({state:'visible'});
const before=await p.evaluate(()=>window.geodesicQA.state().camera);await p.locator('#claimCell').click();const after=await p.evaluate(()=>window.geodesicQA.state().camera);assert.ok(Math.abs(Math.hypot(...before)-Math.hypot(...after))<.0001);
await p.locator('#closeBuy').click();await p.evaluate(id=>window.geodesicQA.focus(id,1.5),id);await p.waitForTimeout(200);
const wide=await p.evaluate(id=>window.geodesicQA.screen(id),id);await p.mouse.click(wide.x,wide.y);assert.equal(await p.locator('#claimCell').isVisible(),false);
await p.mouse.dblclick(wide.x,wide.y);await p.waitForTimeout(600);assert.ok(Math.hypot(...await p.evaluate(()=>window.geodesicQA.state().camera))<5.5);
await p.goto(base+'/?geodesicQA#cell='+id);await p.waitForSelector('#world[data-ready=true]',{timeout:60000});await p.waitForTimeout(3000);assert.ok(Math.hypot(...await p.evaluate(()=>window.geodesicQA.state().camera))<4.5);
console.log('Viewport, claim zoom preservation, detail gating, double-click and link arrival passed');
}finally{await b.close();}
