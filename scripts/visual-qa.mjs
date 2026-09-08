import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const errors=[];
fs.mkdirSync('artifacts/visual-qa',{recursive:true});
const url=process.env.SMOKE_URL||'http://127.0.0.1:4180';
let completed=0;
try {
 for(const mobile of [false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.waitForSelector('#world[data-ready="true"]', { timeout: 60000 });
  const prefix=mobile?'mobile':'desktop';
  await page.screenshot({path:`artifacts/visual-qa/${prefix}-explore.png`});
  await page.locator('#toggleHexSearch').click();
  await page.locator('#hexSearchInput').fill('#1');
  await page.locator('#hexSearch').evaluate(form=>form.requestSubmit());
  await page.waitForFunction(()=>document.querySelector('#hexSearchStatus').textContent==='Centred on pentagon #1.',null,{timeout:60000});
  assert.equal(await page.locator('#hexSearchStatus').textContent(),'Centred on pentagon #1.');
  await page.screenshot({path:`artifacts/visual-qa/${prefix}-explore-hex-1.png`});
  await page.locator('#toggleHexSearch').click();
  for(const type of ['logo','colour','paint']) {
   for(const count of type==='paint'?[50]:type==='logo'?[1,50,150,400,500]:[50,150,400]) {
    await page.locator('#claimButton').click();
    assert.equal(await page.locator('#toggleHexSearch').isVisible(),false);
    assert.equal(await page.locator('#designStep').isVisible(),true);
    if(type!=='logo' && await page.locator('#removeImage').isVisible()) await page.locator('#removeImage').click();
    await page.locator('#clearPaint').click();
    if(type==='logo') {
      await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');
      await page.locator('#toPlacement').waitFor({state:'visible'});
      if (!(await page.locator('#logoOptions').evaluate(el=>el.open))) await page.locator('#logoOptions summary').click();
      await page.selectOption('#logoOrientation',count===150?'90':count===400?'180':'0');
      await page.locator(`[data-treatment="${count===400?'repeat':'span'}"]`).click();
    }
    {
      const preset=page.locator(`[data-size="${count}"]`);
      if(await preset.count()) await preset.click();
      else {
        if (!(await page.locator('.custom-options').evaluate(el=>el.open))) await page.locator('.custom-options summary').click();
        await page.locator('#hexAmount').fill(String(count));
      }
    }
    if(type==='logo' && count===50) {
      await page.locator('#editHexMode').click();
      const before=await page.locator('#designCount').textContent();
      const editor=page.locator('#designCanvas');
      await editor.scrollIntoViewIfNeeded();
      const box=await editor.boundingBox();
      for(const [x,y] of [[.5,.16],[.18,.5],[.82,.5],[.5,.84],[.3,.25],[.7,.25]]) {
        await page.mouse.click(box.x+box.width*x,box.y+box.height*y);
        if(await page.locator('#designCount').textContent()!==before) break;
      }
      assert.notEqual(await page.locator('#designCount').textContent(),before,'Logo footprint canvas did not add or remove a hexagon');
      await page.locator('[data-size="50"]').click();
    }
    if(type==='logo') {
      await page.locator('#moveImageMode').click();
      const countBefore = await page.locator('#designCount').textContent();
      const original = await page.locator('#designCanvas').evaluate(c=>c.toDataURL());
      await page.locator('#logoScale').fill('250');
      const beforeDrag=await page.locator('#designCanvas').evaluate(c=>c.toDataURL());
      await page.locator('#designCanvas').scrollIntoViewIfNeeded();
      const box = await page.locator('#designCanvas').boundingBox();
      if(mobile) {
        const touch = await page.context().newCDPSession(page);
        await touch.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
        await touch.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:box.x+box.width*.6,y:box.y+box.height*.55}]});
        await touch.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
        await touch.detach();
      } else {
        await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
        await page.mouse.down();
        await page.mouse.move(box.x+box.width*.6,box.y+box.height*.55,{steps:4});
        await page.mouse.up();
      }

      assert.notEqual(await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),beforeDrag,'Dragging must move image independently of zoom');
      assert.equal(await page.locator('#designCount').textContent(),countBefore);
      assert.notEqual(await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),original);
      await page.screenshot({path:`artifacts/visual-qa/${prefix}-logo-${count}-cropped.png`});
      await page.locator('#resetLogo').click();
      assert.equal(await page.locator('#logoScale').inputValue(),'100');

      await page.locator('#logoScale').fill('200');

    }
    if(type==='paint' || type==='logo') {
      const editor=page.locator('#designCanvas');
      const pixels=()=>editor.evaluate(c=>c.toDataURL());
      const original=await pixels();
      await page.locator('#paintCells').click();
      await page.locator('#brushColor').fill('#ff4d6d');
      await editor.scrollIntoViewIfNeeded();
      let rect=await editor.boundingBox();
      await page.mouse.click(rect.x+rect.width*.48,rect.y+rect.height*.48);
      assert.notEqual(await pixels(),original,'Painting must override a cell, including its image');
      const painted=await pixels();
      await page.locator('#undoPaint').click();
      assert.equal(await pixels(),original,'Undo must restore the original artwork');
      await page.locator('#redoPaint').click();
      assert.equal(await pixels(),painted);
      await page.locator('#eraseCells').click();
      await editor.scrollIntoViewIfNeeded();rect=await editor.boundingBox();
      await page.mouse.click(rect.x+rect.width*.48,rect.y+rect.height*.48);
      assert.notEqual(await pixels(),painted,'Transparent must clear the painted cell');
      const transparent=await pixels();
      const hasClearPixel=await editor.evaluate(c=>{const d=c.getContext('2d').getImageData(Math.floor(c.width*.48),Math.floor(c.height*.48),1,1).data;return d[3]===0;});
      assert.ok(hasClearPixel,'Transparent cell must have zero alpha');
      await page.locator('#restoreCells').click();
      await editor.scrollIntoViewIfNeeded();rect=await editor.boundingBox();
      await page.mouse.click(rect.x+rect.width*.48,rect.y+rect.height*.48);
      assert.equal(await pixels(),original,'Restore artwork must recover the source image/background');
      await page.locator('#undoPaint').click();
      assert.equal(await pixels(),transparent);
      await page.locator('#paintCells').click();
      await page.locator('#brushColor').fill('#4d7cff');
      await editor.scrollIntoViewIfNeeded();rect=await editor.boundingBox();
      if(count>1)await page.mouse.click(rect.x+rect.width*.60,rect.y+rect.height*.52);
    }
    const draftBefore=await page.locator('#designCanvas').evaluate(c=>c.toDataURL());
    const whitePixels=async selector=>page.locator(selector).evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>230&&d[i+1]>230&&d[i+2]>230&&d[i+3]>230)n++;return n;});
    const designInk=await whitePixels('#designCanvas');
    for(let repeat=0;repeat<2;repeat++) {
      await page.locator('#toPlacement').click();
      await page.locator('#suggestLocation').click();
      if(repeat===1) {await page.locator('#toReview').click();await page.locator('#reviewEditDesign').click();}
      else await page.locator('#backToDesign').click();
      assert.equal(await page.locator('#designCanvas').evaluate(c=>c.toDataURL()),draftBefore,'Returning from placement/review must preserve the exact editable design');
    }
    await page.locator('#designCanvas').evaluate(c=>c.scrollIntoView({block:'center'}));
    await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-design.png`});
    await page.locator('#toPlacement').click();
    assert.equal(await page.locator('#toReview').isEnabled(),true);
    assert.equal(await page.locator('#moveGlobeMode').evaluate(el=>el.classList.contains('active')),true);
    if(mobile) {
      const globe=await page.locator('#world').boundingBox();
      const panel=await page.locator('#buyPanel').boundingBox();
      assert.ok(globe.y+globe.height<=panel.y+1,'Mobile panel covers globe');
      assert.ok(globe.height>=300,'Mobile globe area too small');
      assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x:globe.width/2,y:globe.height/2}), 'world');
    }
    await page.locator('#suggestLocation').click();
    assert.equal(await page.locator('#toReview').isEnabled(),true);
    await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-place.png`});
    await page.locator('#toReview').click();
    if(type==='logo' && [50,150,500].includes(count)) assert.ok(await whitePixels('#reviewCanvas')>=designInk*.8,'Relocation must not shrink the source image framing');
    const price=await page.locator('#reviewPrice').textContent();
    if(type!=='paint') assert.equal(price,`$${count}`);
    await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-review.png`});
    await page.locator('#website').fill('javascript:alert(1)');
    await page.locator('#previewPurchase').click();
    assert.equal(await page.locator('#websiteError').isVisible(),true);
    await page.locator('#website').fill('https://example.com/');
    const soldBefore=Number((await page.locator('#soldCount').textContent()).replaceAll(',',''));
    await page.locator('#previewPurchase').click();
    await page.waitForFunction(()=>document.querySelector('#buyPanel').getAttribute('aria-hidden')==='true',null,{timeout:60000});
    assert.equal(await page.locator('#buyPanel').getAttribute('aria-hidden'),'true');
    assert.equal(await page.locator('#placementWebsite').getAttribute('href'),'https://example.com/');
    const soldAfter=Number((await page.locator('#soldCount').textContent()).replaceAll(',',''));
    assert.equal(soldAfter-soldBefore,Number(price.replace(/[$,]/g,'')));
    await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-committed.png`});
    await page.locator('#dismissToast').click();
    completed++;
   }
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({completedJourneys:completed,errors,screenshots:'artifacts/visual-qa'}));
} finally { await browser.close(); }
