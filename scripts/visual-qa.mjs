import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const errors=[];let completed=0;
fs.mkdirSync('artifacts/visual-qa',{recursive:true});
const url=process.env.SMOKE_URL||'http://127.0.0.1:4180';
try {
 for(const mobile of [false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForSelector('#world[data-ready="true"]',{timeout:60000});
  const prefix=mobile?'mobile':'desktop';
  const more=async id=>{await page.locator('.studio-more summary').click();await page.locator(`#${id}`).click();};
  const pixels=()=>page.locator('#designCanvas').evaluate(c=>c.toDataURL());
  const clickCanvas=async(x=.5,y=.5)=>{const r=await page.locator('#designCanvas').boundingBox();if(mobile)await page.touchscreen.tap(r.x+r.width*x,r.y+r.height*y);else await page.mouse.click(r.x+r.width*x,r.y+r.height*y);};
  const ready=()=>page.waitForFunction(()=>!document.querySelector('#suggestLocation').disabled);
  for(const type of ['logo','colour','paint'])for(const count of type==='logo'?[1,50,150,400,500]:type==='colour'?[50,150,400]:[50]) {
    await page.locator('#claimButton').click();await page.locator('#designStep').waitFor({state:'visible'});
    assert.equal(await page.locator('#typeStep').count(),0);
    assert.equal(await page.locator('#logoPositionX').count(),0);
    if(type!=='logo' && await page.locator('#removeImage').getAttribute('hidden')===null)await more('removeImage');
    await more('clearPaint');await page.locator('#hexAmount').fill(String(count));await page.locator('#editorFit').click();
    if(type==='logo') {
      await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');
      await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Change image'&&document.querySelector('#uploadStatus').hidden);
      await page.locator('#moveImageMode').click();await page.locator('#logoScale').fill('220');
      const before=await pixels(),r=await page.locator('#designCanvas').boundingBox();
      if(mobile){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width*.5,y:r.y+r.height*.5}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width*.58,y:r.y+r.height*.54}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
      else{await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.58,r.y+r.height*.54,{steps:5});await page.mouse.up();}
      await page.waitForTimeout(50);assert.notEqual(await pixels(),before,'Image drag must change framing');
      await page.locator('.studio-more summary').click();await page.locator('#logoOrientation').selectOption(count===150?'90':'0');await page.locator('#logoTreatment').selectOption(count===400?'repeat':'span');await page.locator('.studio-more summary').click();
    }
    if(type!=='colour'){
      await page.locator('#paintCells').click();const original=await pixels();await page.locator('#brushColor').fill('#ff4d6d');await clickCanvas();const painted=await pixels();assert.notEqual(painted,original);
      await page.locator('#undoPaint').click();assert.equal(await pixels(),original);await page.locator('#redoPaint').click();assert.equal(await pixels(),painted);
      await page.locator('#eraseCells').click();await clickCanvas();const cleared=await pixels();assert.notEqual(cleared,painted);
      assert.ok(await page.locator('#designCanvas').evaluate(c=>c.getContext('2d').getImageData(Math.floor(c.width*.5),Math.floor(c.height*.5),1,1).data[3]===0),'Clear creates transparency');
      await page.locator('#restoreCells').click();await clickCanvas();assert.equal(await pixels(),original);
      await page.locator('#undoPaint').click();assert.equal(await pixels(),cleared);
      if(count>1){await page.locator('#colourBrush').click();await page.locator('#brushColor').fill('#4d7cff');await clickCanvas(.6,.5);}
    }
    if(count===50&&type==='logo'){
      await page.locator('#editHexMode').click();const before=await page.locator('#designCount').textContent();
      for(const [x,y] of [[.5,.16],[.18,.5],[.82,.5],[.5,.84],[.3,.25],[.7,.25]]){await clickCanvas(x,y);if(await page.locator('#designCount').textContent()!==before)break;}
      assert.notEqual(await page.locator('#designCount').textContent(),before);await page.locator('#undoPaint').click();assert.equal(await page.locator('#designCount').textContent(),before);
      await page.locator('#paintCells').click();
    }
    const size=await page.locator('#buyPanel').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth}));
    assert.ok(size.scroll<=size.height+1&&size.scrollWidth<=size.width+1,'Studio must fit without scrolling');
    const draft=await pixels(),countBefore=await page.locator('#designCount').textContent();
    await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-design.png`});
    for(let round=0;round<2;round++){
      await page.locator('#toPlacement').click();await ready();await page.locator('#suggestLocation').click();await ready();
      if(round){await page.locator('#toReview').click();await page.locator('#reviewEditDesign').click();}else await page.locator('#backToDesign').click();
      assert.equal(await pixels(),draft,'Editing must preserve exact draft pixels');assert.equal(await page.locator('#designCount').textContent(),countBefore);
    }
    await page.locator('#toPlacement').click();await ready();await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-place.png`});await page.locator('#toReview').click();
    assert.equal(await page.locator('#reviewPrice').textContent(),`$${count}`);await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-review.png`});
    await page.locator('#website').fill('javascript:alert(1)');await page.locator('#previewPurchase').click();assert.equal(await page.locator('#websiteError').isVisible(),true);
    await page.locator('#website').fill('https://example.com/');const soldBefore=Number((await page.locator('#soldCount').textContent()).replaceAll(',',''));
    await page.locator('#previewPurchase').click();await page.waitForFunction(()=>document.querySelector('#buyPanel').getAttribute('aria-hidden')==='true',null,{timeout:60000});
    assert.equal(Number((await page.locator('#soldCount').textContent()).replaceAll(',',''))-soldBefore,count);await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-committed.png`});await page.locator('#dismissToast').click();completed++;
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({completedJourneys:completed,errors,screenshots:'artifacts/visual-qa'}));
}finally{await browser.close();}
