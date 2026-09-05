import { chromium } from 'playwright';
import fs from 'node:fs';

const candidates = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const executablePath = candidates.find(fs.existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(7000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.stack || error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

const globePoints = [[720, 450], [620, 430], [820, 430], [550, 520], [850, 520], [650, 330], [780, 600], [470, 390]];
async function placeAvailableArea() {
  await page.click('#suggestLocation');
  if (await page.locator('#toReview').isEnabled()) return;
  for (const [x, y] of globePoints) {
    await page.mouse.click(x, y);
    if (await page.locator('#toReview').isEnabled()) return;
  }
  throw new Error('Could not find an available placement area');
}

await page.goto(process.env.SMOKE_URL || 'http://127.0.0.1:4175');
await page.waitForTimeout(1200);

await page.click('#claimButton');
if (!(await page.locator('#typeStep').isVisible())) errors.push('Creation type step did not open');
await page.click('#logoArtwork');
if (!(await page.locator('#designStep').isVisible())) errors.push('Logo design step did not open');
if (await page.locator('#toPlacement').isEnabled()) errors.push('Logo placement enabled before upload');
await page.setInputFiles('#logoUpload', 'scripts/fixtures/test-logo.svg');
await page.locator('#logoOptions summary').click();
await page.selectOption('#logoOrientation', '180');
const logoRotation = await page.locator('#logoPreview').evaluate((element) => getComputedStyle(element).getPropertyValue('--logo-rotation').trim());
if (logoRotation !== '180deg') errors.push(`Logo rotation preview was ${logoRotation || 'not set'}`);
if (!(await page.locator('#toPlacement').isEnabled())) errors.push('Logo placement did not enable after upload');
await page.click('#toPlacement');
if (!(await page.locator('#moveGlobeMode').evaluate((el) => el.classList.contains('active')))) errors.push('Move was not the default placement mode');
await page.click('#placeDesignMode');
await page.waitForTimeout(650);
await placeAvailableArea();
await page.click('#toReview');
if (!(await page.locator('#reviewStep').isVisible())) errors.push('Review step did not open');
if ((await page.locator('#reviewPrice').textContent()) !== '$150') errors.push('Logo review price was not $150');
await page.click('#previewPurchase');
await page.waitForTimeout(250);

await page.click('#claimButton');
await page.click('#paintArtwork');
const editor = await page.locator('#designCanvas').boundingBox();
if (!editor) throw new Error('Design canvas was unavailable');
await page.locator('#brandColor').fill('#ff4d6d');
await page.mouse.click(editor.x + editor.width * .48, editor.y + editor.height * .48);
await page.locator('#brandColor').fill('#4d7cff');
await page.mouse.click(editor.x + editor.width * .53, editor.y + editor.height * .52);
const paintedCount = await page.locator('#designCount').textContent();
if (paintedCount === '0 hexagons') errors.push('Flat paint editor did not create cells');
if (!(await page.locator('#toPlacement').isEnabled())) errors.push('Painted design could not continue');

console.log(JSON.stringify({
  logoRotation,
  uploadAccepted: await page.locator('#logoPreview img').count() === 1,
  reviewPrice: '$150',
  paintedCount,
  activeScreen: await page.locator('.flow-screen.active').getAttribute('id'),
  detectedColours: await page.locator('#logoSwatches button').count(),
  errors,
}));
await browser.close();
if (errors.length) process.exitCode = 1;
