import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await fs.mkdir('artifacts/combined-ui',{recursive:true});
try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?geodesicQA`);await page.waitForFunction(()=>window.geodesicQA);
  await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});
  assert.deepEqual(await page.locator('[data-icon]').evaluateAll(nodes=>nodes.filter(n=>!n.querySelector('svg.ico')).map(n=>n.dataset.icon)),[]);
  const toggle=page.locator('#rotationToggle');await toggle.click();assert.equal(await toggle.getAttribute('data-icon'),'rotate-start');await toggle.click();assert.equal(await toggle.getAttribute('data-icon'),'rotate-pause');
  await page.locator('#claimButton').click();await page.locator('#designStep').waitFor({state:'visible'});
  await page.locator('#hexAmount').fill('37');await page.waitForFunction(()=>geodesicQA.state().design.length===37);
  const ids=await page.evaluate(()=>geodesicQA.state().design);
  await page.locator('.studio-more summary').click();await page.keyboard.press('Escape');
  assert.equal(await page.locator('.studio-more').evaluate(n=>n.open),false);assert.equal(await page.locator('#buyPanel').getAttribute('aria-hidden'),'false');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#buyPanel').getAttribute('aria-hidden'),'true');
  await page.locator('#claimButton').click();await page.locator('#designStep').waitFor({state:'visible'});assert.deepEqual(await page.evaluate(()=>geodesicQA.state().design),ids);
  await page.locator('#toPlacement').click();assert.deepEqual(await page.evaluate(()=>geodesicQA.state().selected),ids);
  await page.locator('#toReview').click();assert.deepEqual(await page.evaluate(()=>geodesicQA.state().selected),ids);
  await page.waitForTimeout(500);await page.screenshot({path:`artifacts/combined-ui/${mobile?'mobile':'desktop'}-review.png`});
  assert.deepEqual(errors,[]);await page.close();console.log(`${mobile?'Mobile':'Desktop'} icons, rotation, Escape, draft and placement parity passed`);
}}finally{await browser.close();await server.close();}
