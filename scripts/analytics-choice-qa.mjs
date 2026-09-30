import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Counting placement views no longer asks permission, because it no longer
// touches the visitor's device: no consent prompt, no session id, nothing
// persisted. What has to keep working is the objection route — a visitor who
// asks not to be counted stays uncounted, across reloads.
const server = await createServer({
  server: { host: '127.0.0.1', port: 0, watch: null },
  define: { 'import.meta.env.VITE_STAGING_SANDBOX': 'true', 'import.meta.env.VITE_STAGING_API_URL': JSON.stringify('/__qa/placements') },
});
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
let events = 0;
const tokens = new Set();
try {
  await page.route('**/__qa/placements', route => {
    const body = route.request().postDataJSON();
    if (body.action === 'record-event') { events++; if (body.event?.eventToken) tokens.add(body.event.eventToken); }
    return route.fulfill({
      json: body.action === 'public-list' ? { placements: [] }
        : body.action === 'public-stats' ? { stats: { claimedCells: 0, remainingCells: 1_000_000, placements: 0, views: 0, clicks: 0 }, latest: [] }
          : {},
    });
  });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.goto(origin);
  await page.locator('#appLoading').waitFor({ state: 'hidden', timeout: 90000 });
  await page.waitForTimeout(1500);

  // No prompt, and counting happens without one.
  assert.equal(await page.locator('#analyticsChoice').count(), 0, 'the consent prompt is gone');
  assert.ok(events > 0, `browsing is counted without a prompt (${events} events)`);
  const countedBefore = events;

  // Nothing about the visitor is kept on the device.
  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    cookie: document.cookie,
  }));
  assert.equal(stored.session.length, 0, `nothing in sessionStorage, found ${stored.session.join(', ')}`);
  assert.equal(stored.cookie, '', 'no cookies');
  assert.deepEqual(stored.local.filter(k => k !== 'mh-no-measurement-v1'), [], `only the opt-out may be stored, found ${stored.local.join(', ')}`);

  // Each event carries its own token, so nothing links two events together.
  assert.equal(tokens.size, events, 'every event carries a distinct token');

  // Opting out stops counting, and survives a reload.
  await page.waitForFunction(() => typeof document.querySelector('#toggleAccount')?.onclick === 'function', null, { timeout: 90000 });
  await page.locator('#toggleAccount').click();
  await page.locator('#accountPanel').waitFor({ state: 'visible' });
  await page.locator('#privacyChoices').click();
  assert.equal(await page.locator('#privacyChoices').getAttribute('aria-pressed'), 'true');
  const countedAtOptOut = events;
  await page.reload();
  await page.locator('#appLoading').waitFor({ state: 'hidden', timeout: 90000 });
  await page.waitForTimeout(2000);
  assert.equal(events, countedAtOptOut, `opting out stops counting, ${events - countedAtOptOut} events slipped through`);
  await page.locator('#toggleAccount').click();
  await page.locator('#accountPanel').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#privacyChoices').getAttribute('aria-pressed'), 'true', 'the objection persists across a reload');

  // And it can be withdrawn.
  await page.locator('#privacyChoices').click();
  assert.equal(await page.locator('#privacyChoices').getAttribute('aria-pressed'), 'false');
  console.log(JSON.stringify({ noPrompt: true, countsWithoutConsent: countedBefore, noDeviceIdentifiers: true, distinctTokenPerEvent: true, optOutHolds: true }));
} finally { await page.close(); await browser.close(); await server.close(); }
