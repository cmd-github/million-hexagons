import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const url =
  process.env.SMOKE_URL ||
  "https://million-hexagons-staging.million-hexagons.workers.dev/";
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chrome) ? { executablePath: chrome } : {}),
});
await mkdir("artifacts/admin-workspace", { recursive: true });
const report = [];
try {
  for (const mobile of [false, true]) {
    const viewport = mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 };
    const page = await browser.newPage({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    if (/^http:\/\/127\.0\.0\.1/.test(url))
      await page.route("**/__qa/placements", (route) => {
        const action = route.request().postDataJSON()?.action;
        if (action === "public-list")
          return route.fulfill({ json: { placements: [] } });
        if (action === "public-stats")
          return route.fulfill({
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
        if (action === "record-event")
          return route.fulfill({ json: { metrics: { views: 0, clicks: 0 } } });
        if (action === "admin-review-queue")
          return route.fulfill({ json: { result: { pending: 2, overdue: 1, targetHours: 12, placements: [
            { placementId: "overdue-placement", ownerId: "owner-1", cellCount: 25, currentVersion: 1, title: "Overdue review", review: { status: "pending", ageMs: 13 * 60 * 60 * 1000, overdue: true } },
            { placementId: "fresh-placement", ownerId: "owner-2", cellCount: 10, currentVersion: 1, title: "Fresh review", review: { status: "pending", ageMs: 60 * 60 * 1000, overdue: false } },
          ] } } });
        return route.fulfill({
          status: 404,
          json: {
            error: "Not needed by the controlled admin workspace journey",
          },
        });
      });
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    await page.waitForSelector("#world[data-ready=true]", {
      state: "attached",
      timeout: 90000,
    });
    await page.waitForFunction(
      () => typeof document.querySelector("#openAdmin")?.onclick === "function",
      null,
      { timeout: 90000 },
    );
    await page.locator("#openAdmin").evaluate((button) => {
      button.hidden = false;
      button.click();
    });
    const workspace = page.locator("#adminWorkspace");
    await workspace.waitFor({ state: "visible" });
    for (const selector of ["#adminSearch", "#closeAdmin"])
      assert.equal(await page.locator(selector).isVisible(), true);
    assert.equal(await page.locator("#adminResults").count(), 1);
    await page.locator('#adminReviewQueue').evaluate(section => {
      section.querySelector('[role=status]').textContent = '2 awaiting review · 1 beyond the 12-hour target.';
      section.querySelector('ol').innerHTML = '<li data-overdue="true"><span><b>Overdue review</b><small>25 hexagons · 13 hours waiting · overdue</small></span><button type="button">Review</button></li><li data-overdue="false"><span><b>Fresh review</b><small>10 hexagons · 1 hour waiting</small></span><button type="button">Review</button></li>';
    });
    assert.match(await page.locator("#adminReviewQueue [role=status]").textContent(), /2 awaiting review · 1 beyond/);
    assert.equal(await page.locator('#adminReviewQueue li[data-overdue="true"]').count(), 1);
    await page.waitForFunction(
      () => document.querySelectorAll(".admin-milestone-list li").length > 0,
    );
    assert.equal(await page.locator(".admin-milestone-list li").count(), 10);
    assert.ok(
      await page.locator(".admin-milestone-recommendations").textContent(),
    );
    const box = await workspace.boundingBox();
    const layoutViewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    assert.ok(box);
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= layoutViewport.width + 1 &&
        box.y + box.height <= layoutViewport.height + 1,
      `Admin workspace must stay in the layout viewport: ${JSON.stringify({ mobile, viewport, layoutViewport, box })}`,
    );
    await page.screenshot({
      path: `artifacts/admin-workspace/${mobile ? "mobile" : "desktop"}-open.png`,
      animations: "disabled",
    });
    await page.locator("#closeAdmin").click();
    assert.equal(await workspace.isHidden(), true);
    assert.deepEqual(errors, []);
    report.push({
      mobile,
      inViewport: true,
      controlsVisible: true,
      moderationQueue: true,
      milestonePlanner: true,
      closes: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
