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
  await page.waitForTimeout(500);
  const prefix=mobile?'mobile':'desktop';
  await page.screenshot({path:`artifacts/visual-qa/${prefix}-explore.png`});
  await page.locator('#toggleHexSearch').click();
  await page.locator('#hexSearchInput').fill('#1');
  await page.locator('#hexSearch').evaluate(form=>form.requestSubmit());
  assert.equal(await page.locator('#hexSearchStatus').textContent(),'Centred on hex #1.');
  await page.screenshot({path:`artifacts/visual-qa/${prefix}-explore-hex-1.png`});
  await page.locator('#toggleHexSearch').click();
  for(const type of ['logo','colour','paint']) {
   for(const count of type==='paint'?[2]:type==='logo'?[1,50,150,400,500]:[50,150,400]) {
    await page.locator('#claimButton').click();
    assert.equal(await page.locator('#toggleHexSearch').isVisible(),false);
    await page.locator(`#${type}Artwork`).click();
    if(type==='logo') {
      await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');
      await page.locator('#toPlacement').waitFor({state:'visible'});
      if (!(await page.locator('#logoOptions').evaluate(el=>el.open))) await page.locator('#logoOptions summary').click();
      await page.selectOption('#logoOrientation',count===150?'90':count===400?'180':'0');
      await page.locator(`[data-treatment="${count===400?'repeat':'span'}"]`).click();
    }
    if(type!=='paint') {
      const preset=page.locator(`[data-size="${count}"]`);
      if(await preset.count()) await preset.click();
      else {
        if (!(await page.locator('.custom-options').evaluate(el=>el.open))) await page.locator('.custom-options summary').click();
        await page.locator('#hexAmount').fill(String(count));
      }
    }
    if(type==='logo' && count===50) {
      const before=await page.locator('#designCount').textContent();
      const editor=page.locator('#designCanvas');
      const box=await editor.boundingBox();
      for(const [x,y] of [[.5,.16],[.18,.5],[.82,.5],[.5,.84],[.3,.25],[.7,.25]]) {
        await page.mouse.click(box.x+box.width*x,box.y+box.height*y);
        if(await page.locator('#designCount').textContent()!==before) break;
      }
      assert.notEqual(await page.locator('#designCount').textContent(),before,'Logo footprint canvas did not add or remove a hexagon');
      await page.locator('[data-size="50"]').click();
    }
    if(type==='paint') {
      const rect=await page.locator('#designCanvas').boundingBox();
      await page.mouse.click(rect.x+rect.width*.48,rect.y+rect.height*.48);
      await page.locator('#brandColor').fill('#ff4d6d');
      await page.mouse.click(rect.x+rect.width*.65,rect.y+rect.height*.52);
      const painted=await page.locator('#designCount').textContent();
      await page.locator('#clearPaint').click();
      assert.equal(await page.locator('#toPlacement').isDisabled(),true);
      await page.locator('#undoPaint').click();
      assert.equal(await page.locator('#designCount').textContent(),painted);
    }
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
    const price=await page.locator('#reviewPrice').textContent();
    if(type!=='paint') assert.equal(price,`$${count}`);
    await page.screenshot({path:`artifacts/visual-qa/${prefix}-${type}-${count}-review.png`});
    await page.locator('#website').fill('javascript:alert(1)');
    await page.locator('#previewPurchase').click();
    assert.equal(await page.locator('#websiteError').isVisible(),true);
    await page.locator('#website').fill('https://example.com/');
    const soldBefore=Number((await page.locator('#soldCount').textContent()).replaceAll(',',''));
    await page.locator('#previewPurchase').click();
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
