import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import sharp from "sharp";

const server = await createServer({
  server: { host: "127.0.0.1", port: 0, watch: null },
  define: {
    "import.meta.env.VITE_STAGING_SANDBOX": "true",
    "import.meta.env.VITE_STAGING_API_URL": JSON.stringify("/__qa/placements"),
  },
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`,
  chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chrome) ? { executablePath: chrome } : {}),
});
await mkdir("artifacts/my-globe", { recursive: true });
const currentArtwork = await sharp({
    create: { width: 320, height: 200, channels: 4, background: "#245a73" },
  })
    .webp()
    .toBuffer(),
  replacementArtwork = await sharp({
    create: { width: 300, height: 300, channels: 4, background: "#d7ff55" },
  })
    .png()
    .toBuffer(),
  currentArtworkDataUrl = `data:image/webp;base64,${currentArtwork.toString("base64")}`;
const report = [];
try {
  for (const mobile of [false, true]) {
    const viewport = mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      page = await browser.newPage({
        viewport,
        isMobile: mobile,
        hasTouch: mobile,
      });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const records = [
      {
        placementId: "stripe-owned-placement",
        topologyVersion: "geodesic-v1",
        anchor: 966630,
        cells: [966630],
        cellCount: 1,
        title: "Recovered Stripe purchase",
        description: "Original description",
        destinationUrl: "https://example.com/",
        artworkDataUrl: currentArtworkDataUrl,
        publicationStatus: "published",
        currentVersion: 1,
        status: "draft",
        createdAt: Date.now(),
        metrics: { views: 40, clicks: 5 },
      },
    ];
    let update = null;
    await page.addInitScript(() => {
      window.__MH_OWNER_QA__ = {
        user: {
          uid: "firebase-user",
          email: "buyer@example.com",
          getIdToken: async () => "qa-token",
        },
      };
    });
    await page.route("**/__qa/placements", async (route) => {
      const body = route.request().postDataJSON();
      assert.equal(
        ["public-list", "public-placement", "public-stats", "record-event"].includes(body.action) ||
          route.request().headers().authorization === "Bearer qa-token",
        true,
      );
      if (body.action === "public-list")
        return route.fulfill({ json: { placements: records } });
      if (body.action === "public-placement")
        return route.fulfill({json:{placement:{...records[0],version:records[0].currentVersion}}});
      if (body.action === "public-stats")
        return route.fulfill({
          json: {
            stats: {
              claimedCells: 1,
              remainingCells: 999999,
              placements: 1,
              views: 40,
              clicks: 5,
            },
            latest: records,
          },
        });
      if (body.action === "record-event") return route.fulfill({ json: {} });
      if (body.action === "account-summary")
        return route.fulfill({
          json: {
            summary: { placements: 1, credits: 3, administrator: false },
          },
        });
      if (body.action === "list")
        return route.fulfill({ json: { placements: records } });
      if (body.action === "get-content-source") {
        if (mobile)
          return route.fulfill({
            status: 404,
            json: { ok: false, error: "design-source-not-found" },
          });
        return route.fulfill({
          json: {
            placement: {
              placementId: records[0].placementId,
              version: 1,
              currentArtworkDataUrl,
              originalArtworkDataUrl: currentArtworkDataUrl,
              designState: {
                imageTransform: {
                  scale: 100,
                  x: 0,
                  y: 0,
                  rotation: 0,
                  treatment: "original",
                },
              },
            },
          },
        });
      }
      if (body.action === "update-content") {
        update = body;
        records[0] = {
          ...records[0],
          ...body.content,
          currentVersion: 2,
          publicationStatus: "published",
          artworkDataUrl: body.content.artworkDataUrl,
        };
        return route.fulfill({
          json: {
            placement: { placementId: records[0].placementId, version: 2 },
          },
        });
      }
      throw Error(`Unexpected action ${body.action}`);
    });
    await page.goto(`${origin}/?geodesicQA`);
    await page.waitForSelector("#world[data-ready=true]", { timeout: 90000 });
    await page.waitForFunction(
      () =>
        document.querySelector("#accountPlacementCount")?.textContent === "1",
    );
    assert.equal(await page.locator("#accountCreditCount").textContent(), "3");
    await page.locator("#toggleAccount").click();
    await page.locator("#accountSignedIn").waitFor({ state: "visible" });
    await page.locator("#openMyGlobe").click();
    const workspace = page.locator("#myGlobe");
    await workspace.waitFor({ state: "visible" });
    assert.match(
      await page.locator("#myGlobeSummary").textContent(),
      /1 placement.*1 cells owned/,
    );
    assert.equal(
      await page.locator(".my-globe-card h3").textContent(),
      "Recovered Stripe purchase",
    );
    assert.match(
      await page.locator(".my-globe-metrics").textContent(),
      /40 views.*5 visits.*12.5% CTR/s,
    );
    const box = await workspace.boundingBox();
    assert.ok(
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width &&
        box.y + box.height <= viewport.height,
    );
    await page.locator("[data-owner-action=edit]").click();
    await page
      .locator("#designStep")
      .waitFor({ state: "visible", timeout: 30000 });
    assert.equal(await page.locator("#sizeControls").isHidden(), true);
    assert.equal(await page.locator("#editHexMode").isHidden(), true);
    assert.equal(await page.locator("#removeHexMode").isHidden(), true);
    assert.equal(await page.locator("#hexAmount").inputValue(), "1");
    assert.equal(await page.locator("#price").textContent(), "Owned");
    await page
      .locator("#logoUpload")
      .setInputFiles({
        name: "replacement.png",
        mimeType: "image/png",
        buffer: replacementArtwork,
      });
    await page.locator("#logoScale").fill("135");
    await page.locator("#logoOrientation").fill("15");
    await page.locator("#paintCells").click();
    await page.locator("#brushColor").fill("#ff4d6d");
    const editPoint = await page.evaluate((id) => window.geodesicQA.screen(id), records[0].anchor);
    await page.mouse.click(editPoint.x, editPoint.y);
    await page.screenshot({
      path: `artifacts/my-globe/${mobile ? "mobile" : "desktop"}-editor.png`,
      animations: "disabled",
    });
    await page.locator("#toPlacement").click();
    await page.locator("#reviewStep").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#previewPurchase").textContent(),
      "Save changes",
    );
    await page.locator("#companyName").fill("Updated from My Globe");
    await page
      .locator("#companyDescription")
      .fill("Fresh artwork for the updated placement");
    await Promise.all([page.waitForNavigation(),page.locator("#previewPurchase").click()]);
    await page.waitForSelector('#world[data-ready=true]',{timeout:90000});
    await page.waitForFunction(
      () =>
        document.querySelector("#toast b")?.textContent === "Changes saved.",
    );
    assert.equal(update.placementId, "stripe-owned-placement");
    assert.equal(update.content.destinationUrl, "https://example.com/");
    assert.deepEqual(
      update.content.designState.cells.map((cell) => cell.id),
      [966630],
    );
    assert.equal(update.content.designState.cells[0].color, "#ff4d6d");
    assert.equal(update.content.designState.imageTransform.scale, 135);
    assert.equal(update.content.designState.imageTransform.rotation, 15);
    assert.match(
      update.content.sourceArtworkDataUrl,
      /^data:image\/webp;base64,/,
    );
    assert.match(
      update.content.originalArtworkDataUrl,
      /^data:image\/(?:png|webp);base64,/,
    );
    assert.equal(new URL(page.url()).hash, "#placement=stripe-owned-placement");
    await page.locator("#placementInspector").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#inspectorName").textContent(),
      "Updated from My Globe",
    );
    await page.screenshot({
      path: `artifacts/my-globe/${mobile ? "mobile" : "desktop"}.png`,
      animations: "disabled",
    });
    assert.equal(await workspace.isHidden(), true);
    const point = await page.evaluate(
      (id) => window.geodesicQA.screen(id),
      records[0].anchor,
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.geodesicQA.missNextIntersection());
    await page.mouse.click(point.x, point.y);
    await page.locator("#placementInspector").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#inspectorName").textContent(),
      "Updated from My Globe",
    );
    assert.deepEqual(errors, []);
    report.push({
      mobile,
      recoveredPurchase: true,
      sharedGlobeEditor: true,
      lockedFootprint: true,
      artworkVersion: true,
      legacyPublishedFallback: mobile,
      replacementArtwork: true,
      exactCellsPreserved: true,
      inViewport: true,
      viewOnGlobe: true,
      claimedCellSingleClick: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(JSON.stringify(report, null, 2));
