// Measures how hard the globe works the real GPU on this Windows machine.
// Opens a visible Chrome window (headless Chrome does not use the GPU the same
// way), then samples Windows' 3D-engine utilisation alongside the page's frame
// rate, first on the rotating overview and then zoomed in to the cell grid.
//
//   SMOKE_URL=http://127.0.0.1:4180 node scripts/gpu-load-qa.mjs
//
// Utilisation is for the whole machine, so close other GPU-heavy apps first and
// compare runs taken on the same machine; the absolute figure is not portable.
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { withSettledConsent } from './qa-consent.mjs';

const base = (process.env.SMOKE_URL || 'http://127.0.0.1:4180').replace(/\/$/, '');
const seconds = Number(process.env.GPU_SECONDS || 12);
const sampleGpu = () => new Promise((resolve, reject) => execFile('powershell', ['-NoProfile', '-Command',
  `$samples=Get-Counter -Counter '\\GPU Engine(*engtype_3D)\\Utilization Percentage' -SampleInterval 1 -MaxSamples ${seconds};` +
  `($samples | ForEach-Object { ($_.CounterSamples | Measure-Object CookedValue -Sum).Sum } | Measure-Object -Average).Average`],
  (error, stdout) => error ? reject(error) : resolve(Number(Number(stdout.trim()).toFixed(1)))));
const frameRate = page => page.evaluate(ms => new Promise(resolve => {
  let frames = 0; const start = performance.now();
  const tick = now => { frames++; if (now - start < ms) requestAnimationFrame(tick); else resolve(Math.round(frames * 1000 / (now - start))); };
  requestAnimationFrame(tick);
}), seconds * 1000);
// How many frames the app actually rendered, which is lower than the display's
// rate once rendering is paced or skipped.
const rendered = page => page.evaluate(() => window.performanceQA?.state().renderedFrames ?? null);

const browser = withSettledConsent(await chromium.launch({ headless: false, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] }));
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/');
  await page.waitForSelector('#world[data-ready=true]', { timeout: 90000 });
  await page.locator('#appLoading').waitFor({ state: 'hidden', timeout: 90000 });
  await page.waitForTimeout(4000);
  const measure = async label => {
    const before = await rendered(page), started = Date.now();
    const [gpu, displayFps] = await Promise.all([sampleGpu(), frameRate(page)]);
    const after = await rendered(page), elapsed = (Date.now() - started) / 1000;
    report[label] = { gpuPercent: gpu, displayFps, renderedFps: before === null ? null : Math.round((after - before) / elapsed) };
    console.log(label, JSON.stringify(report[label]));
  };
  await measure('overview-rotating');
  await page.evaluate(() => window.performanceQA.focus([0.3, 0.4, 0.86], 0.4));
  await page.waitForTimeout(3000);
  await measure('zoomed-in-still');
} finally { await browser.close(); }
console.log(JSON.stringify(report));
