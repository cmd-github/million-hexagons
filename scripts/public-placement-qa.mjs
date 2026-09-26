import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
const placementId = "12345678-1234-1234-1234-123456789abc",
  record = {
    placementId,
    topologyVersion: "geodesic-v1",
    anchor: 966630,
    cells: [966630],
    cellCount: 1,
    title: "A place worth sharing",
    description: "Our permanent corner of the world.",
    destinationUrl: "https://example.com/",
    artworkDataUrl: "",
    publicationStatus: "published",
    currentVersion: 2,
    status: "draft",
    createdAt: Date.now(),
  };
const catalogue = [
  record,
  {
    ...record,
    placementId: "22345678-1234-1234-1234-123456789abc",
    anchor: 966329,
    cells: [966329],
    title: "Closest live neighbour",
    createdAt: record.createdAt - 1000,
  },
  {
    ...record,
    placementId: "32345678-1234-1234-1234-123456789abc",
    anchor: 965773,
    cells: [965773],
    title: "Second live neighbour",
    createdAt: record.createdAt - 2000,
  },
  {
    ...record,
    placementId: "42345678-1234-1234-1234-123456789abc",
    anchor: 966931,
    cells: [966931],
    title: "Third live neighbour",
    createdAt: record.createdAt - 3000,
  },
  {
    ...record,
    placementId: "52345678-1234-1234-1234-123456789abc",
    anchor: 967232,
    cells: [967232],
    title: "Unpublished placement",
    publicationStatus: "preview-only",
    createdAt: record.createdAt + 1000,
  },
];
const server = await createServer({
  server: { host: "127.0.0.1", port: 0, watch: null },
  define: {
    "import.meta.env.VITE_STAGING_SANDBOX": "true",
    "import.meta.env.VITE_STAGING_API_URL": JSON.stringify("/__qa/placements"),
  },
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`,
  chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe",
  browser = await chromium.launch({
    headless: true,
    ...(existsSync(chrome) ? { executablePath: chrome } : {}),
  });
await mkdir("artifacts/public-placement", { recursive: true });
const report = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
        isMobile: mobile,
        hasTouch: mobile,
      }),
      events = [];
    let releaseCatalogue;
    const catalogueGate = new Promise((resolve) => {
      releaseCatalogue = resolve;
    });
    await page.addInitScript(() => {
      window.open=(url)=>{window.__shareDestination=url;return null;};
      Object.defineProperty(navigator,"share",{value:async data=>{window.__nativeShare=data;}});
      Object.defineProperty(navigator,"canShare",{value:()=>false});
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (value) => {
            window.__copied = value;
          },
        },
      });
    });
    await page.route("**/__qa/placements", (route) => {
      const body = route.request().postDataJSON();
      if (body.action === "public-placement")
        return route.fulfill({ json: { placement: record } });
      if (body.action === "public-list")
        return catalogueGate.then(() =>
          route.fulfill({ json: { placements: catalogue } }),
        );
      if (body.action === "public-stats")
        return route.fulfill({
          json: {
            stats: {
              claimedCells: 4,
              remainingCells: 999996,
              placements: 4,
              views: 1,
              clicks: 1,
            },
            latest: catalogue,
          },
        });
      if (body.action === "record-event") {
        events.push(body.event);
        return route.fulfill({
          json: {
            metrics: {
              views: 1,
              clicks: body.event.type === "outbound_link_clicked" ? 1 : 0,
            },
          },
        });
      }
      throw Error(`Unexpected ${body.action}`);
    });
    await page.route("https://example.com/**", (route) => route.abort());
    await page.goto(`${origin}/placement/${placementId}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("#placementInspector:not([hidden])", {
      timeout: 90000,
    });
    assert.equal(
      await page.locator("#inspectorName").textContent(),
      record.title,
    );
    releaseCatalogue();
    await page.waitForFunction(
      () => document.querySelectorAll("#claimFeedItems button").length === 4,
    );
    assert.match(
      await page.locator("#claimTicker").getAttribute("aria-label"),
      /^Latest activity: A place worth sharing/,
    );
    assert.doesNotMatch(
      await page.locator("#claimTicker").getAttribute("aria-label"),
      /Unpublished placement/,
    );
    assert.match(
      await page.locator("#claimFeedItems small").first().textContent(),
      /^1 minute ago$/,
    );
    assert.equal(await page.locator("#claimFeed").getAttribute("open"), mobile ? null : "");
    await page.locator("#toggleHexSearch").click();
    await page.locator("#hexSearch").evaluate((form) => form.requestSubmit());
    assert.equal(await page.locator("#hexSearchStatus").textContent(), "");
    assert.equal(await page.locator("#hexSearchInput").getAttribute("aria-invalid"), null);
    const searchButtonBox = await page.locator("#toggleHexSearch").boundingBox();
    const searchPanelBox = await page.locator("#hexSearchPanel").boundingBox();
    assert.ok(Math.abs(searchButtonBox.y - searchPanelBox.y) < 2);
    await page.locator("#toggleHexSearch").click();
    await page.route("**/topology/regions-v1/*.gz", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.keyboard.press("Escape");
    if (mobile) {
      await page.locator("#claimFeed summary").click();
      await page.locator("#claimFeedItems button").first().waitFor({ state: "visible" });
    }
    const hudStarted = Date.now();
    await page.locator("#claimFeedItems button").first().click();
    await page.waitForSelector("#placementInspector:not([hidden])", {
      timeout: 10000,
    });
    const hudImmediateMs = Date.now() - hudStarted;
    assert.ok(
      hudImmediateMs < 500,
      `Cached placement HUD took ${hudImmediateMs}ms while unrelated regional geometry was delayed`,
    );
    assert.equal(
      await page.locator("#inspectorName").textContent(),
      record.title,
    );
    await page.locator("#showNearby").click();
    await page.waitForFunction(
      () => document.querySelectorAll("#nearbyPlacements button").length === 3,
    );
    assert.equal(await page.locator("#nearbyPlacements button").count(), 3);
    assert.doesNotMatch(
      await page.locator("#nearbyPlacements").textContent(),
      /A place worth sharing|Unpublished placement/,
    );
    await page.screenshot({
      path: `artifacts/public-placement/${mobile ? "mobile" : "desktop"}-nearby.png`,
      animations: "disabled",
    });
    await page.locator("#backNearby").click();
    await page.locator("#inspectorShare").click();
    const card = page.locator("#shareCard");
    await card.waitFor({ state: "visible" });
    assert.equal(await page.locator(".share-image>span").count(),0,"the frame needs no caption");
    assert.equal(await page.locator("[data-share-destination]").count(),3);
    assert.deepEqual(await page.locator("[data-share-destination]").evaluateAll(nodes=>nodes.map(n=>n.dataset.shareDestination)),["x","linkedin","facebook"]);
    assert.equal(await page.locator("[data-share-download]").count(),0);
    assert.equal(await page.locator("#shareCardFormat").count(),0,"one image, so no format picker");
    assert.equal(await page.locator("#shareCardPreview").getAttribute("width"), "1200");
    assert.equal(await page.locator("#downloadSharePlacement").isVisible(), true);
    assert.equal(await page.locator("#copySharePlacement").isVisible(), true);
    for(const id of ["downloadSharePlacement","copySharePlacement"])
      assert.ok((await page.locator(`#${id} svg.ico`).count())===1,`${id} shows an icon`);
    const box = await card.boundingBox(),
      viewport = await page.evaluate(() => ({width: innerWidth, height: innerHeight}));
    assert.ok(
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width &&
        box.y + box.height <= viewport.height,
      `Share card ${JSON.stringify(box)} exceeded viewport ${JSON.stringify(viewport)}`,
    );
    await page.locator("#copySharePlacement").click();
    assert.match(
      await page.evaluate(() => window.__copied),
      new RegExp(`/placement/${placementId}$`),
    );
    await page.locator('[data-share-destination="x"]').click();
    assert.match(await page.evaluate(() => window.__shareDestination),/twitter\.com\/intent\/tweet/);
    assert.match(await page.locator('#shareCardStatus').textContent(),/Opening X/);
    await page.screenshot({
      path: `artifacts/public-placement/${mobile ? "mobile" : "desktop"}.png`,
      animations: "disabled",
    });
    await page.locator("#closeShareCard").click();
    await page.locator("#inspectorVisit").dispatchEvent("click");
    await page.waitForFunction(
      () => document.querySelector("#inspectorInfo")?.textContent === "1",
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "placement_viewed" &&
          event.placementId === placementId,
      ),
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "outbound_link_clicked" &&
          event.placementId === placementId,
      ),
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "placement_shared" &&
          event.placementId === placementId,
      ),
    );
    assert.ok(events.some((event) => event.type === "globe_viewed"));
    report.push({
      mobile,
      directPlacementLink: true,
      catalogueBlockedUntilInspector: true,
      authoritativeActivity: true,
      activityNavigation: true,
      hudImmediateMs,
      nearbyClosestLive: true,
      shareCard: true,
      typedEvents: true,
      liveGlobalStats: true,
      inViewport: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(JSON.stringify(report, null, 2));
