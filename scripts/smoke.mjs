import { chromium } from 'playwright';
import fs from 'node:fs';

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = candidates.find(fs.existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(6000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
async function chooseAvailableArea() {
  const points = [[720, 450], [620, 430], [820, 430], [550, 520], [850, 520], [650, 330], [780, 600], [470, 390]];
  for (const [x, y] of points) {
    await page.mouse.click(x, y);
    if (await page.locator('#previewPurchase').isEnabled()) return;
  }
  throw new Error('Could not find an available test area');
}
await page.goto('http://127.0.0.1:4175');
await page.waitForTimeout(1200);
await page.click('#claimButton');
await page.click('#selectHexMode');
await chooseAvailableArea();
await page.setInputFiles('#logoUpload', 'scripts/fixtures/test-logo.svg');
await page.selectOption('#logoOrientation', '180');
const logoRotation = await page.locator('#logoPreview').evaluate((element) => getComputedStyle(element).getPropertyValue('--logo-rotation').trim());
if (logoRotation !== '180deg') errors.push(`Logo rotation preview was ${logoRotation || 'not set'}`);
await page.selectOption('#logoOrientation', '0');
await page.fill('#hexAmount', '1');
await page.click('#previewPurchase');
await page.waitForTimeout(300);
await page.click('#claimButton');
await page.fill('#hexAmount', '20');
await page.selectOption('#selectionShape', 'compact');
await page.click('.advanced-settings summary');
await page.selectOption('#logoTreatment', 'span');
await page.click('#selectHexMode');
await chooseAvailableArea();
await page.click('#previewPurchase');
await page.waitForTimeout(300);
await page.click('#claimButton');
await page.selectOption('#selectionShape', 'custom');
await page.click('#selectHexMode');
await page.mouse.move(690, 450);
await page.mouse.down();
await page.mouse.move(760, 450, { steps: 12 });
await page.mouse.up();
const customPrice = await page.locator('#price').textContent();
if (customPrice === '$0') errors.push('Paint selection did not select any hexagons');
await page.click('#closeBuy');
console.log(JSON.stringify({ panel: await page.locator('#buyPanel').getAttribute('aria-hidden'), sold: await page.locator('#soldCount').textContent(), toast: await page.locator('#toast').isVisible(), uploadAccepted: await page.locator('#logoPreview img').count() === 1, logoRotation, customPrice, detectedColours: await page.locator('#logoSwatches button').count(), errors }));
await browser.close();
if (errors.length) process.exit(1);
