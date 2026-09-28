import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// The bootstrap treats a rejected `import('/src/main.js')` as a dead globe. An
// error thrown late in module evaluation therefore flashes "Could not load the
// globe" over a boot that is actually fine, which no other journey noticed
// because the globe still worked. This fails on any uncaught boot error.
const server = process.env.SMOKE_URL ? null : await createServer({
  server: { host: '127.0.0.1', port: 0, watch: null },
  define: {
    'import.meta.env.VITE_STAGING_SANDBOX': 'true',
    'import.meta.env.VITE_STAGING_API_URL': JSON.stringify('/__qa/placements'),
  },
});
if (server) await server.listen();
const base = process.env.SMOKE_URL || `http://127.0.0.1:${server.httpServer.address().port}`;
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const report = [];
try {
  for (const [mobile, slow] of [[false, false], [true, false], [false, true]]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    if (slow) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 110 * 1024, uploadThroughput: 110 * 1024 });
    }
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    if (server) await page.route('**/__qa/placements', route => {
      const body = route.request().postDataJSON();
      if (body.action === 'public-list') return route.fulfill({ json: { placements: [] } });
      if (body.action === 'public-stats') return route.fulfill({ json: { stats: { claimedCells: 0, remainingCells: 1_000_000, placements: 0, views: 0, clicks: 0 }, latest: [] } });
      return route.fulfill({ json: {} });
    });
    await page.goto(`${base}/`, { waitUntil: 'commit', timeout: 120000 });

    // Watch the loader for a failure state at any point, not just at the end.
    const failures = [];
    const started = Date.now();
    while (Date.now() - started < 120000) {
      const state = await page.evaluate(() => ({
        message: document.querySelector('#loadingMessage')?.textContent || '',
        error: document.querySelector('#loadingError')?.hidden === false ? document.querySelector('#loadingError').textContent : '',
        retry: document.querySelector('#loadingRetry')?.hidden === false,
        loading: document.querySelector('#appLoading')?.hidden === false,
      })).catch(() => null);
      if (state) {
        if (/Could not load the globe/.test(state.message) || /Could not load the globe/.test(state.error) || state.retry) failures.push({ at: Date.now() - started, ...state });
        if (!state.loading) break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    await page.waitForSelector('#world[data-ready=true]', { timeout: 120000 });
    assert.deepEqual(pageErrors, [], `The boot must not throw: ${pageErrors.join(' | ')}`);
    assert.deepEqual(failures, [], `A healthy boot must never offer a retry or claim the globe failed: ${JSON.stringify(failures)}`);
    report.push({ mobile, slow, bootErrors: 0, falseFailures: 0 });
    await page.close();
    await context.close();
  }
} finally {
  await browser.close();
  if (server) await server.close();
}
console.log(JSON.stringify(report, null, 2));
