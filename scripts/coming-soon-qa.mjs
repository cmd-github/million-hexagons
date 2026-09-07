import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const baseUrl = process.env.SMOKE_URL || 'http://127.0.0.1:4190';
const output = 'artifacts/coming-soon';
fs.mkdirSync(output, { recursive: true });

try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'mobile' : 'desktop';
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile
    });
    const errors = [];
    let responseMode = 'success';
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/launch-signup', async route => {
      await new Promise(resolve => setTimeout(resolve, 350));
      await route.fulfill({
        status: responseMode === 'success' ? 200 : 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: responseMode === 'success' })
      });
    });
    await page.goto(baseUrl);
    await page.locator('#globe').waitFor({ state: 'visible' });

    assert.equal(await page.title(), 'Million Hexagons | Coming Soon');
    assert.equal(await page.locator('h1').innerText(), 'Claim your space.\nLaunching soon.');
    assert.equal(await page.locator('.brand-mark').innerText(), 'MH');
    assert.equal(await page.getByText('Launch updates only. Unsubscribe anytime.').count(), 0);
    assert.equal(await page.locator('.build-link').getAttribute('href'), 'https://x.com/MillionHexagons');
    assert.equal(await page.locator('label[for="launch-email"]').innerText(), 'Email address');

    await page.locator('#launch-email').focus();
    assert.notEqual(await page.locator('#launch-email').evaluate(element => getComputedStyle(element).boxShadow), 'none');

    const inputBox = await page.locator('#launch-email').boundingBox();
    const buttonBox = await page.locator('#launch-form button').boundingBox();
    assert.ok(inputBox && buttonBox);
    assert.ok(Math.abs(buttonBox.y - inputBox.y) < 2, `${name} controls should share one compact row`);

    await page.locator('#launch-form button').click();
    assert.equal(await page.locator('#launch-status').innerText(), 'Enter a valid email address.');
    assert.equal(await page.locator('#launch-email').getAttribute('aria-invalid'), 'true');

    await page.locator('#launch-email').fill('person@example.com');
    await page.locator('#launch-form button').click();
    assert.equal(await page.locator('#launch-form button').innerText(), 'Sending…');
    await page.getByText('You’re on the list.').waitFor();

    responseMode = 'error';
    await page.locator('#launch-email').fill('person@example.com');
    await page.locator('#launch-form button').click();
    await page.getByText('Something went wrong. Try again.').waitFor();

    const canvasBox = await page.locator('#globe').boundingBox();
    assert.ok(canvasBox);
    await page.mouse.move(canvasBox.x + canvasBox.width * .62, canvasBox.y + canvasBox.height * .45);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * .69, canvasBox.y + canvasBox.height * .5, { steps: 5 });
    await page.mouse.up();
    await page.screenshot({ path: `${output}/${name}-signup.png` });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Coming-soon signup QA passed for desktop and mobile.');
} finally {
  await browser.close();
}
