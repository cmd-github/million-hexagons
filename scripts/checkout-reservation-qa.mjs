import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";

const server = process.env.SMOKE_URL ? null : await createServer({
  server: { host: "127.0.0.1", port: 0, watch: null },
  define: {
    "import.meta.env.VITE_STAGING_SANDBOX": "true",
    "import.meta.env.VITE_STAGING_API_URL": JSON.stringify("https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements"),
  },
});
if (server) await server.listen();
const url = process.env.SMOKE_URL || `http://127.0.0.1:${server.httpServer.address().port}/`;
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chrome) ? { executablePath: chrome } : {}),
});
await mkdir("artifacts/checkout-reservation", { recursive: true });
const report = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    let quotedCells = [],
      released = false,
      extended = false,
      reservationExpiry = Date.now() + 1_200_000;
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date); let offset = 0;
      Date.now = () => realNow() + offset;
      window.__advanceReservationClock = (milliseconds) => { offset = milliseconds; };
    });
    await page.route("**/stagingPlacements", async (route) => {
      const body = route.request().postDataJSON();
      if (body.action === "public-list") {
        await route.fulfill({ json: { placements: [] } });
        return;
      }
      if (body.action === "public-stats") {
        await route.fulfill({
          json: {
            stats: {
              claimedCells: 0,
              remainingCells: 1000000,
              placements: 0,
              views: 0,
              clicks: 0,
            },
            latest: [],
          },
        });
        return;
      }
      if (body.action === "record-event") {
        await route.fulfill({ json: { metrics: { views: 0, clicks: 0 } } });
        return;
      }
      if (body.action === "quote-reserve") {
        quotedCells = body.reservation.cells;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            quote: {
              displayTotal: "$10",
              currency: "usd",
              totalAmountMinor: 1000,
              cellCount: 10,
            },
            reservation: {
              reservationId: "qa-reservation",
              cellCount: 10,
              status: "active",
              expiresAtMs: reservationExpiry,
            },
            checkoutToken: "x".repeat(43),
          }),
        });
        return;
      }
      if (body.action === "release-checkout-reservation") {
        released = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            reservation: {
              reservationId: "qa-reservation",
              status: "released",
            },
          }),
        });
        return;
      }
      if (body.action === "extend-checkout-reservation") {
        extended = true; reservationExpiry += 600_000;
        await route.fulfill({json:{ok:true,reservation:{reservationId:"qa-reservation",cellCount:10,status:"active",expiresAtMs:reservationExpiry,extended:true}}});
        return;
      }
      if (body.action === "public-list") { await route.fulfill({ json: { placements: [] } }); return; }
      if (body.action === "public-stats") { await route.fulfill({ json: { stats: { claimedCells: 0, remainingCells: 1_000_000, placements: 0, views: 0, clicks: 0 }, latest: [] } }); return; }
      if (["record-event", "public-search", "public-placement"].includes(body.action)) { await route.fulfill({ json: {} }); return; }
      await route.abort();
    });
    await page.goto(`${url}${url.includes("?") ? "&" : "?"}geodesicQA`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("#world[data-ready=true]", { timeout: 90000 });
    await page.waitForFunction(() => window.geodesicQA);
    await page.locator("#claimButton").click();
    await page.locator("#locationStep").waitFor({ state: "visible" });
    const anchor = await page.evaluate(() => window.geodesicQA.state().designAnchor);
    await page.evaluate((id) => window.geodesicQA.start(id), anchor);
    await page.locator("#shapeStep").waitFor({ state: "visible", timeout: 90000 });
    await page.waitForFunction(
      () => Number(document.querySelector("#hexAmount").value) >= 5,
    );
    assert.equal(await page.locator("#hexAmount").inputValue(), "10");
    await page.locator("#toDesign").click();
    await page.locator("#toPlacement").click();
    await page.waitForFunction(() => document.body.dataset.flow === "review", {
      timeout: 90000,
    });
    assert.equal(quotedCells.length, 10);
    assert.equal(new Set(quotedCells).size, 10, "every quoted cell is distinct");
    assert.equal(await page.locator("#reviewPrice").textContent(), "$10");
    assert.match(
      await page.locator("#serverQuoteStatus").textContent(),
      /^Location reserved for (?:19|20):/,
    );
    await page.evaluate(() => window.__advanceReservationClock(16 * 60_000));
    await page.locator("#extendReservation").waitFor({state:"visible",timeout:3000});
    await page.locator("#extendReservation").click();
    await page.waitForFunction(() => /Location reserved for 1[34]:/.test(document.querySelector("#serverQuoteStatus").textContent));
    assert.equal(extended,true);assert.equal(await page.locator("#extendReservation").isHidden(),true);
    const actionBox = await page.locator("#previewPurchase").boundingBox(),
      layoutHeight = await page.evaluate(
        () => document.documentElement.clientHeight,
      );
    assert.ok(
      actionBox &&
        actionBox.y >= 0 &&
        actionBox.y + actionBox.height <= layoutHeight,
      `Final action must be visible with the server quote: ${JSON.stringify({ mobile, layoutHeight, actionBox })}`,
    );
    await page.screenshot({
      path: `artifacts/checkout-reservation/${mobile ? "mobile" : "desktop"}-review.png`,
      animations: "disabled",
    });
    await page.locator("#reviewEditDesign").click();
    await page.waitForFunction(() => document.body.dataset.flow === "design");
    await page.waitForTimeout(200);
    assert.equal(released, true);
    report.push({
      mobile,
      exactCells: true,
      serverPrice: true,
      expiryVisible: true,
      releasedOnBack: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
  if (server) await server.close();
}
console.log(JSON.stringify(report, null, 2));
