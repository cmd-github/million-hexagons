import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const reports=[],errors=[];
try {
 for(const mobile of [false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.SMOKE_URL||'http://127.0.0.1:4180')+'/?geodesicQA');await page.waitForFunction(()=>window.geodesicQA,{timeout:60000});
  const id=await page.evaluate(()=>geodesicQA.locations.equator);
  await page.evaluate(id=>geodesicQA.focus(id,1.2),id);await page.waitForTimeout(300);
  const fps=await page.evaluate(async()=>{
    const times=[];let previous=performance.now();
    await new Promise(resolve=>{const frame=now=>{times.push(now-previous);previous=now;if(times.length<100)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});
    times.shift();times.sort((a,b)=>a-b);return{median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],heap:performance.memory?.usedJSHeapSize};
  });
  const box=await page.locator('#world').boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.5;
  const before=await page.evaluate(()=>geodesicQA.state().camera);
  if(mobile) {
    const client=await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*10,y:y+i*2,id:1}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else {await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+110,y+25,{steps:10});await page.mouse.up();}
  await page.waitForTimeout(300);assert.notDeepEqual(await page.evaluate(()=>geodesicQA.state().camera),before,'Drag must rotate');
  await page.screenshot({path:`artifacts/geodesic-qa/${mobile?'mobile':'desktop'}-drag.png`});
  await page.locator('#claimButton').click();await page.locator('#colourArtwork').click();await page.locator('#toPlacement').click();
  const selected=await page.evaluate(()=>geodesicQA.state().selected);await page.locator('#toReview').click();await page.locator('#reviewEditDesign').click();
  assert.deepEqual(await page.evaluate(()=>geodesicQA.state().design),selected,'Edit design preserves chosen IDs');
  await page.locator('#toPlacement').click();await page.locator('#placeDesignMode').click();
  const placeBox=await page.locator('#world').boundingBox(),cx=placeBox.x+placeBox.width/2,cy=placeBox.y+placeBox.height/2;
  const distance=await page.evaluate(()=>Math.hypot(...geodesicQA.state().camera));
  if(mobile) {
    const client=await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}]});
    for(let i=1;i<=5;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-30-i*6,y:cy,id:1},{x:cx+30+i*6,y:cy,id:2}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else {await page.mouse.move(cx,cy);await page.mouse.wheel(0,-220);}
  await page.waitForTimeout(300);assert.notEqual(await page.evaluate(()=>Math.hypot(...geodesicQA.state().camera)),distance,'Zoom must work in Place mode');
  await page.evaluate(id=>geodesicQA.focus(id,.6),id);await page.waitForTimeout(300);
  const p=await page.evaluate(id=>geodesicQA.screen(id),id);
  if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  const placement=await page.evaluate(()=>geodesicQA.state());assert.equal(placement.selected.length,50);assert.ok(placement.selected.includes(id));assert.equal(placement.connected,true);
  await page.locator('#toReview').click();await page.locator('#previewPurchase').click();
  await page.waitForFunction(()=>document.querySelector('#buyPanel').getAttribute('aria-hidden')==='true',null,{timeout:60000});
  await page.locator('#claimButton').click();await page.locator('#colourArtwork').click();await page.locator('#toPlacement').click();
  await page.locator('#placeDesignMode').click();await page.evaluate(id=>geodesicQA.focus(id,.6),id);await page.waitForTimeout(200);
  const occupiedPoint=await page.evaluate(id=>geodesicQA.screen(id),id);
  if(mobile)await page.touchscreen.tap(occupiedPoint.x,occupiedPoint.y);else await page.mouse.click(occupiedPoint.x,occupiedPoint.y);
  assert.equal(await page.locator('#toReview').isDisabled(),true,'Occupied polygon must reject placement');
  await page.locator('#suggestLocation').click();assert.equal(await page.locator('#toReview').isEnabled(),true);
  reports.push({mobile,...fps,...await page.evaluate(()=>geodesicQA.state())});await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('artifacts/geodesic-qa/gestures.json',JSON.stringify(reports,null,2));console.log(reports.map(({mobile,median,p95,heap})=>({mobile,median,p95,heap})));
} finally {await browser.close();}
