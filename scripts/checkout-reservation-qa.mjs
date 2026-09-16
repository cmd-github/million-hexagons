import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.env.SMOKE_URL || "http://127.0.0.1:4174/";
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
              displayTotal: "$1",
              currency: "usd",
              totalAmountMinor: 100,
              cellCount: 1,
            },
            reservation: {
              reservationId: "qa-reservation",
              cellCount: 1,
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
        await route.fulfill({json:{ok:true,reservation:{reservationId:"qa-reservation",cellCount:1,status:"active",expiresAtMs:reservationExpiry,extended:true}}});
        return;
      }
      await route.abort();
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("#world[data-ready=true]", { timeout: 90000 });
    await page.locator("#claimButton").click();
    await page.locator("#homeView").click();
    await page.waitForTimeout(2300);
    for (let zoom = 0; zoom < 8; zoom++) {
      await page.locator("#zoomIn").click();
      await page.waitForTimeout(160);
    }
    await page.waitForTimeout(500);
    const world = await page.locator("#world").boundingBox(),
      panel = await page.locator("#buyPanel").boundingBox(),
      freeWidth = panel?.x || world.width;
    let confirmed = false;
    for (const fy of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      for (const fx of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
        const x = freeWidth * fx,
          y = world.y + world.height * fy;
        if (mobile) await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
        await page.waitForTimeout(100);
        if (await page.locator("#claimCell").isVisible()) {
          await page.locator("#claimCell").click();
          confirmed = true;
          break;
        }
      }
      if (confirmed) break;
    }
    await page.waitForFunction(
      () => Number(document.querySelector("#hexAmount").value) === 1,
    );
    assert.equal(await page.locator("#hexAmount").inputValue(), "1");
    await page.locator("#toDesign").click();
    await page.locator("#toPlacement").click();
    await page.waitForFunction(() => document.body.dataset.flow === "review", {
      timeout: 90000,
    });
    assert.equal(quotedCells.length, 1);
    assert.equal(new Set(quotedCells).size, 1);
    assert.equal(await page.locator("#reviewPrice").textContent(), "$1");
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
    await page.locator("#backToPlacement").click();
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
}
console.log(JSON.stringify(report, null, 2));
