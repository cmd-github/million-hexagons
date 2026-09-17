import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const reports = [], errors = [];
fs.mkdirSync('artifacts/studio-scale', { recursive: true });

try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    page.setDefaultTimeout(180000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/topology/occupancy-v1.gz', route => route.fulfill({ contentType: 'application/gzip', body: gzipSync(Buffer.alloc(1000000)) }));
    await page.goto((process.env.SMOKE_URL || 'http://127.0.0.1:4180') + '/?geodesicQA');
    await page.waitForFunction(() => window.geodesicQA);
    await page.locator('#claimButton').click();
    await page.locator('#locationStep').waitFor({ state: 'visible' });
    const anchor = await page.evaluate(() => geodesicQA.state().designAnchor);
    await page.evaluate(id => geodesicQA.start(id), anchor);
    await page.locator('#shapeStep').waitFor({ state: 'visible' });

    for (const count of [50000, 100000]) {
      const started = Date.now();
      await page.locator('#hexAmount').fill(String(count));
      await page.locator('#hexAmount').press('Enter');
      await page.waitForFunction(expected => geodesicQA.state().design.length === expected, count);
      const shapeMs = Date.now() - started;
      assert.ok(shapeMs < 60000, 'Large connected selection must stay bounded');
      const ids = await page.evaluate(() => geodesicQA.state().design);
      assert.equal(new Set(ids).size, count);
      assert.equal(await page.evaluate(() => geodesicQA.state().connected), true);
      await page.locator('#toDesign').click();
      await page.locator('#designStep').waitFor({ state: 'visible' });
      await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');
      await page.waitForFunction(() => document.querySelector('#addImageLabel').textContent === 'Replace image');
      const imageStarted = Date.now();
      await page.locator('#moveImageMode').click();
      await page.locator('#logoScale').fill('160');
      const imageMs = Date.now() - imageStarted;
      assert.ok(imageMs < 3000, 'Image controls must stay responsive');
      const selectedBefore = await page.evaluate(() => geodesicQA.state().design);
      await page.locator('#toPlacement').click();
      await page.locator('#reviewStep').waitFor({ state: 'visible' });
      assert.deepEqual(await page.evaluate(() => geodesicQA.state().selected), selectedBefore);
      assert.equal(await page.locator('#reviewPrice').textContent(), `$${count.toLocaleString()}`);
      await page.screenshot({ path: `artifacts/studio-scale/${mobile ? 'mobile' : 'desktop'}-${count}-review.png` });
      await page.locator('#reviewEditDesign').click();
      assert.deepEqual(await page.evaluate(() => geodesicQA.state().design), selectedBefore);
      reports.push({ mobile, count, shapeMs, imageMs, reviewParity: true, connected: true });
      console.log(reports.at(-1));
      if (count === 50000) await page.locator('[data-flow-target="shape"]').click();
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/studio-scale/results.json', JSON.stringify({ reports, errors }, null, 2));
  console.log('Current globe studio scale checks passed');
} finally {
  await browser.close();
}
