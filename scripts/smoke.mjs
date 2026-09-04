import { chromium } from 'playwright';
import fs from 'node:fs';

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = candidates.find(fs.existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('http://127.0.0.1:4175');
await page.waitForTimeout(1200);
await page.click('#claimButton');
await page.mouse.click(720, 450);
await page.fill('#logoText', 'CODEX');
await page.fill('#hexAmount', '1200');
await page.click('#previewPurchase');
await page.waitForTimeout(300);
console.log(JSON.stringify({ panel: await page.locator('#buyPanel').getAttribute('aria-hidden'), sold: await page.locator('#soldCount').textContent(), toast: await page.locator('#toast').isVisible(), errors }));
await browser.close();
if (errors.length) process.exit(1);
