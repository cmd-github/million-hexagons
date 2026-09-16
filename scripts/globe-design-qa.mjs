import { chromium } from "playwright";
const base = (process.env.SMOKE_URL || "http://127.0.0.1:4180").replace(
  /\/$/,
  "",
);
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const errors = [];
fs.mkdirSync("artifacts/globe-design", { recursive: true });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/?geodesicQA");
    await page.waitForSelector("#world[data-ready=true]", { timeout: 60000 });
    const createDistance = await page.evaluate(() =>
      Math.hypot(...window.geodesicQA.state().camera),
    );
    await page.locator("#claimButton").click();
    await page.locator("#locationStep").waitFor();
    await page.waitForTimeout(350);
    assert.ok(
      Math.hypot(
        ...(await page.evaluate(() => window.geodesicQA.state().camera)),
      ) <= createDistance,
      "Create should ease the globe closer without choosing a location",
    );
    assert.equal(await page.locator("#canvasSurface").count(), 0);
    assert.equal(await page.locator(".size-menu").count(), 0);
    assert.equal(
      await page.locator("#panEditor").getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(await page.locator("#startingSpotPrompt").isVisible(), true);
    assert.equal(await page.locator("#shapeStep h2").textContent(), "2. Choose your shape");
    assert.deepEqual(await page.locator(".size-presets button").allTextContents(), ["10", "25", "50", "100"]);
    assert.equal(await page.locator(".hex-brush").count(), 4);
    assert.match(
      await page
        .locator(".hex-brush")
        .first()
        .evaluate(
          (element) => getComputedStyle(element.querySelector("i")).clipPath,
        ),
      /polygon/,
    );
    const clickCell = async (id) => {
      const p = await page.evaluate((id) => window.geodesicQA.screen(id), id);
      if (mobile) await page.touchscreen.tap(p.x, p.y);
      else await page.mouse.click(p.x, p.y);
    };
    const initial = await page.evaluate(() => window.geodesicQA.state().design);
    assert.deepEqual(initial, []);
    assert.equal(await page.locator("#toPlacement").isDisabled(), true);
    const first = await page.evaluate(
      () => window.geodesicQA.state().designAnchor,
    );
    await page.evaluate((id) => window.geodesicQA.focus(id, 0.6), first);
    await page.waitForFunction(
      () => window.geodesicQA.state().detailVertices > 0,
    );
    await page.waitForTimeout(250);
    await clickCell(first);
    await page.locator("#claimCell").waitFor({ state: "visible" });
    assert.equal(await page.locator("#claimCell").textContent(), "Start here");
    assert.deepEqual(
      await page.evaluate(() => window.geodesicQA.state().design),
      [],
    );
    await page.locator("#claimCell").click();
    await page.locator("#shapeStep").waitFor({ state: "visible" });
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length === 10,
    );
    const startingIds = await page.evaluate(
      () => window.geodesicQA.state().design,
    );
    assert.equal(await page.locator("#hexAmount").inputValue(), "10");
    await page.locator('.size-presets [data-size="25"]').click();
    await page.locator("#hexAmount").press("Enter");
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length === 25,
    );
    const grownIds = await page.evaluate(
      () => window.geodesicQA.state().design,
    );
    assert.ok(startingIds.every((id) => grownIds.includes(id)));
    await page.locator("#removeHexagon").click();
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length === 24,
    );
    const freeCell = await page.evaluate(() => {
      const state = window.geodesicQA.state(),
        owned = new Set(state.design);
      return state.design
        .flatMap((id) => window.geodesicQA.neighbours(id))
        .find((id) => !owned.has(id));
    });
    await page.locator('[name="shapeMode"][value="freehand"]').check();
    assert.equal(await page.locator("#sizeControls").isHidden(), true);
    await page.evaluate((id) => window.geodesicQA.focus(id, 0.6), freeCell);
    await clickCell(freeCell);
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length === 25,
    );
    const drawnIds = await page.evaluate(
      () => window.geodesicQA.state().design,
    );
    await page.locator('[name="shapeMode"][value="exact"]').check();
    await page.locator("#hexAmount").fill("26");
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length === 26,
    );
    const resizedDrawn = await page.evaluate(
      () => window.geodesicQA.state().design,
    );
    assert.ok(drawnIds.every((id) => resizedDrawn.includes(id)));
    await page.locator('[name="shapeMode"][value="freehand"]').check();
    await page.locator("#appLoading").waitFor({ state: "hidden" });
    await page.screenshot({
      path: "artifacts/globe-design/" + mobile + "-shape.png",
    });
    await page.locator("#toDesign").click();
    await page.locator("#designStep").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#designTitle").textContent(),
      "3. Create your design",
    );
    assert.equal(
      await page.locator('#designStep input[type="color"]').count(),
      1,
    );
    assert.deepEqual(
      await page
        .locator("#customPaintTools>button")
        .evaluateAll((elements) =>
          elements.slice(0, 3).map((element) => element.id),
        ),
      ["paintCells", "moveImageMode", "panEditor"],
    );
    await page.screenshot({
      path: "artifacts/globe-design/" + mobile + "-draw.png",
    });
    await page.locator('[data-brush="2"]').click();
    const neighbour = await page.evaluate(
      (id) => window.geodesicQA.neighbours(id)[0],
      first,
    );
    await page.locator("#brushColor").fill("#12ab34");
    await page.evaluate((id) => window.geodesicQA.focus(id, 0.6), neighbour);
    await clickCell(neighbour);
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length > 1,
    );
    assert.equal(await page.locator("#recentColours").isVisible(), true);
    assert.equal(
      await page.locator(".recent-colour").first().getAttribute("title"),
      "#12AB34",
    );
    let ids = await page.evaluate(() => window.geodesicQA.state().design);
    await clickCell(first);
    await page.locator("#undoPaint").click();
    await page.locator("#removeHexMode").click();
    await page.locator('[data-brush="0"]').click();
    await clickCell(ids.at(-1));
    await page.waitForFunction(
      (n) => window.geodesicQA.state().design.length < n,
      ids.length,
    );
    await page.locator("#undoPaint").click();
    const paintedState = await page.evaluate(
      () => window.geodesicQA.state().designCells,
    );
    await page
      .locator("#logoUpload")
      .setInputFiles("scripts/fixtures/test-logo.svg");
    await page.waitForFunction(
      () =>
        document.querySelector("#addImageLabel").textContent === "Replace image",
    );
    assert.deepEqual(
      await page.evaluate(() => window.geodesicQA.state().designCells),
      paintedState,
    );
    assert.equal(await page.locator('[name="logoTreatmentChoice"]').count(), 2);
    assert.equal(await page.locator("#logoTreatment").inputValue(), "span");
    await page.screenshot({path: `artifacts/globe-design/${mobile}-across.png`});
    await page.locator("#logoUpload").setInputFiles([]);
    await page.locator("#logoUpload").setInputFiles("scripts/fixtures/geodesic-reference.svg");
    await page.waitForFunction(() => document.querySelector("#addImageLabel").textContent === "Replace image");
    assert.equal(await page.locator("#logoTreatment").inputValue(), "span");
    await page.locator('[name="logoTreatmentChoice"][value="repeat"]').check();
    assert.equal(await page.locator("#logoTreatment").inputValue(), "repeat");
    await page.locator("#moveImageMode").click();
    await page.locator("#logoOrientation").fill("37");
    await page.locator("#logoScale").fill("140");
    const originalIds = [...ids],
      relocation = await page.evaluate((id) => {
        let next = id;
        for (let i = 0; i < 5; i++)
          next = window.geodesicQA.neighbours(next)[0];
        return next;
      }, first);
    await page.locator("#backToShape").click();
    await page.locator("#backToLocation").click();
    assert.equal(await page.locator("#startingSpotPrompt").isVisible(), true);
    assert.deepEqual(
      await page.evaluate(() => window.geodesicQA.state().design),
      originalIds,
    );
    await page.evaluate((id) => window.geodesicQA.focus(id, 0.6), relocation);
    await clickCell(relocation);
    await page.locator("#claimCell").waitFor({ state: "visible" });
    assert.equal(await page.locator("#claimCell").textContent(), "Start here");
    assert.deepEqual(
      await page.evaluate(() => window.geodesicQA.state().design),
      originalIds,
    );
    await page.locator("#claimCell").click();
    await page.waitForFunction(
      ({ anchor, count }) =>
        window.geodesicQA.state().designAnchor === anchor &&
        window.geodesicQA.state().design.length === count,
      { anchor: relocation, count: originalIds.length },
    );
    ids = await page.evaluate(() => window.geodesicQA.state().design);
    assert.notDeepEqual(ids, originalIds);
    await page.locator("#toDesign").click();
    await page.screenshot({
      path: "artifacts/globe-design/" + mobile + "-globe.png",
    });
    await page.locator("#toPlacement").click();
    assert.deepEqual(
      await page.evaluate(() => window.geodesicQA.state().selected),
      ids,
    );
    assert.equal(await page.locator("#reviewKind").textContent(), "Preview");
    await page.locator("#companyDescription").fill("word ".repeat(32));
    const descriptionSize = await page
      .locator("#companyDescription")
      .evaluate((element) => ({
        length: element.value.length,
        scroll: element.scrollHeight,
        client: element.clientHeight,
      }));
    assert.equal(
      descriptionSize.length === 160 &&
        descriptionSize.scroll <= descriptionSize.client + 1,
      true,
      JSON.stringify(descriptionSize),
    );
    await page.locator("#reviewEditDesign").click();
    assert.equal(await page.locator("#logoOrientation").inputValue(), "37");
    await page.locator("#toPlacement").click();
    await page.locator("#website").fill("javascript:alert(1)");
    await page.locator("#previewPurchase").click();
    assert.equal(await page.locator("#websiteError").isVisible(), true);
    await page.locator("#website").fill("https://example.com/");
    await page.locator("#companyName").fill("Orbit Studio");
    await page
      .locator("#companyDescription")
      .fill("Independent design for curious people.");
    await page.locator("#previewPurchase").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#buyPanel").getAttribute("aria-hidden") ===
        "true",
      null,
      { timeout: 60000 },
    );
    const committed = await page.evaluate(
      () => window.geodesicQA.state().committed,
    );
    assert.ok(ids.every((id) => committed.includes(id)));
    await page.locator("#claimButton").click();
    await page.locator("#designStep").waitFor({ state: "visible" });
    await page.locator(".studio-more summary").click();
    await page.locator("#startOver").click();
    assert.equal(
      await page.locator("#addImageLabel").textContent(),
      "Add image",
    );
    assert.equal(await page.locator("#logoOrientation").inputValue(), "0");
    await page.locator("#closeBuy").click();
    await page.locator("#toggleHexSearch").click();
    await page.locator("#hexSearchInput").fill("Orbit");
    await page.locator("#companyResults button").first().click();
    await page.locator("#placementInspector").waitFor({ state: "visible" });
    assert.equal(await page.locator("#inspectorNearby").count(), 0);
    assert.equal(
      await page.locator("#inspectorName").textContent(),
      "Orbit Studio",
    );
    assert.equal(await page.locator("#inspectorLogo").isVisible(), true);
    assert.ok(
      await page
        .locator("#inspectorLogo")
        .evaluate((e) => e.complete && e.naturalWidth > 0),
    );
    assert.equal(
      await page.locator("#inspectorDescription").textContent(),
      "Independent design for curious people.",
    );
    assert.match(
      await page.locator("#inspectorDate").textContent(),
      /\d{2}\/\d{2}\/\d{2}/,
    );
    assert.doesNotMatch(
      await page.locator("#claimFeedItems").textContent(),
      /Orbit Studio/,
    );
    assert.match(
      await page.locator("#claimFeedItems").textContent(),
      /next live placement/i,
    );
    assert.equal(await page.locator("#discoverPlacement").count(), 0);
    await page.locator("#pinInspector").click();
    await page.mouse.click(8, 100);
    assert.equal(await page.locator("#placementInspector").isVisible(), true);
    await page.locator("#pinInspector").click();
    await page.mouse.click(8, 100);
    assert.equal(await page.locator("#placementInspector").isVisible(), false);
    await page.locator("#toggleHexSearch").click();
    await page.locator("#hexSearchInput").fill("Orbit");
    await page.locator("#companyResults button").first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: "artifacts/globe-design/" + mobile + "-inspect.png",
    });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "Globe-only desktop/mobile brush, undo, rotation, source reset, review parity and HUD checks passed",
  );
} finally {
  await browser.close();
}
