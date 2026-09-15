import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.SMOKE_URL || 'http://127.0.0.1:4183';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const report = { url, journeys: [], errors: [], runtimeRequests: 0, firestoreRequests: 0 };
async function screenshot(page, file) {
  // Allow the existing panel/camera transition and replacement tiles to settle.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `artifacts/staging/${file}.png`, animations: 'disabled' });
}
await mkdir('artifacts/staging', { recursive: true });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    page.on('request', request => {
      if (request.url().includes('/releases/')) report.runtimeRequests++;
      if (request.url().includes('firestore.googleapis.com')) report.firestoreRequests++;
    });
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-security-policy'], /default-src 'self'/);
    await page.waitForSelector('#world[data-ready=true]', { timeout: 90000 });
    await screenshot(page, `${mobile ? 'mobile' : 'desktop'}-globe`);
    // Real mouse/touch movement on the rendered globe before entering the studio.
    if (mobile) {
      const session = await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 360 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 245, y: 390 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    } else {
      await page.mouse.move(720, 400); await page.mouse.down(); await page.mouse.move(820, 445, { steps: 8 }); await page.mouse.up();
      await page.mouse.wheel(0, -180);
    }
    await page.locator('#claimButton').click();
    await page.locator('#designStep').waitFor({ state: 'visible', timeout: 90000 });
    await page.locator('#homeView').click();await page.waitForTimeout(2300);for(let zoom=0;zoom<8;zoom++){await page.locator('#zoomIn').click();await page.waitForTimeout(160);}await page.waitForTimeout(500);
    const world=await page.locator('#world').boundingBox(),panel=await page.locator('#buyPanel').boundingBox(),freeWidth=panel?.x||world.width;let confirmed=false;for(const fy of [.2,.35,.5,.65,.8]){for(const fx of [.1,.2,.3,.4,.5,.6,.7,.8,.9]){const x=freeWidth*fx,y=world.y+world.height*fy;if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await page.waitForTimeout(100);if(await page.locator('#claimCell').isVisible()){assert.equal(await page.locator('#claimCell').textContent(),'Start here');await page.locator('#claimCell').click();confirmed=true;break;}}if(confirmed)break;}
    await page.waitForFunction(()=>Number(document.querySelector('#hexAmount').value)===1);
    assert.equal(await page.locator('#toPlacement').isEnabled(),true,'Confirming the starting hexagon must establish the placement');
    await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');
    await page.waitForFunction(() => document.querySelector('#addImageLabel').textContent === 'Change image');
    await page.locator('#moveImageMode').click();
    await page.locator('#logoOrientation').fill('37');
    const count = await page.locator('#hexAmount').inputValue();
    await screenshot(page, `${mobile ? 'mobile' : 'desktop'}-design`);
    await page.locator('#toPlacement').click();
    assert.equal(await page.locator('#reviewKind').textContent(),'Preview');assert.equal(await page.locator('#stagingOwnerAccess').isHidden(),true);
    await page.locator('#reviewEditDesign').click();
    assert.equal(await page.locator('#hexAmount').inputValue(), count);
    assert.equal(await page.locator('#logoOrientation').inputValue(), '37');
    await page.locator('#toPlacement').click();
    await page.locator('#companyName').fill('Staging verification');
    await page.locator('#website').fill('https://example.com/');
    await screenshot(page, `${mobile ? 'mobile' : 'desktop'}-review`);
    await page.locator('#previewPurchase').click();
    // Durable staging opens Stripe rather than publishing a session preview. Prove that the
    // secure checkout mounts, but do not submit a payment; then close the studio so its test
    // reservation is released before the next journey.
    await page.locator('#embeddedCheckoutPanel').waitFor({ state: 'visible', timeout: 90000 });
    await page.locator('#embeddedCheckout iframe').first().waitFor({ state: 'visible', timeout: 90000 });
    await screenshot(page, `${mobile ? 'mobile' : 'desktop'}-checkout`);
    await page.locator('#closeEmbeddedCheckout').click();
    await page.locator('#closeBuy').click();
    await page.waitForFunction(() => document.querySelector('#buyPanel').getAttribute('aria-hidden') === 'true');
    await page.waitForTimeout(500);
    await page.reload(); await page.waitForSelector('#world[data-ready=true]', { timeout: 90000 });
    report.journeys.push({ mobile, count, roundTrip: true, checkoutMounted: true, paymentSubmitted: false, warmReload: true });
    await page.close();
  }
  const page = await browser.newPage();
  await page.route('**/topology/bootstrap.json', route => route.abort());
  await page.goto(url); await page.locator('#loadingRetry').waitFor({ state: 'visible' });
  await page.unroute('**/topology/bootstrap.json');
  await page.locator('#loadingRetry').click();
  await page.waitForSelector('#world[data-ready=true]', { timeout: 90000 });
  const missing = await page.request.get(`${url}/topology/does-not-exist.gz`);
  assert.equal(missing.status(), 404);
  assert.ok(report.runtimeRequests > 0); assert.equal(report.firestoreRequests, 0);
  assert.deepEqual(report.errors, []);
  report.failureRetry = true; report.missingAsset404 = true;
} finally {
  await writeFile('artifacts/staging/browser-report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
