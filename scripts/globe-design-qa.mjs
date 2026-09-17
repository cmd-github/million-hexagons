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
    assert.equal(await page.locator("#panEditor").isHidden(), true);
    assert.equal(await page.locator("#startingSpotPrompt").isVisible(), true);
    assert.equal(await page.locator("#shapeStep h2").textContent(), "2. Choose your shape");
    assert.deepEqual(await page.locator(".size-presets button").allTextContents(), ["+10", "+25", "+100"]);
    assert.deepEqual(await page.locator(".shape-count-stepper button").allTextContents(), ["−", "+"]);
    assert.equal(await page.locator("#shapeStep .hex-brush").count(), 3);
    assert.match(
      await page
        .locator("#shapeStep .hex-brush")
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
    const blockedNeighbours=await page.evaluate(id=>window.geodesicQA.neighbours(id),first);
    await page.evaluate(ids=>window.geodesicQA.setOccupied(ids,true),blockedNeighbours);
    assert.deepEqual(await page.evaluate(id=>window.geodesicQA.availableSelection(id,10),first),[first]);
    await page.evaluate(ids=>window.geodesicQA.setOccupied(ids,false),blockedNeighbours);
    const partialBlock=blockedNeighbours.slice(0,3);
    await page.evaluate(ids=>window.geodesicQA.setOccupied(ids,true),partialBlock);
    const fiveHundred=await page.evaluate(id=>window.geodesicQA.availableSelection(id,500),first);
    assert.equal(fiveHundred.length,500);
    assert.equal(new Set(fiveHundred).size,500);
    assert.equal(fiveHundred.some(id=>partialBlock.includes(id)),false);
    await page.evaluate(ids=>window.geodesicQA.setOccupied(ids,false),partialBlock);
    await page.evaluate((id) => window.geodesicQA.focus(id, 0.6), first);
    await page.waitForFunction(
      () => window.geodesicQA.state().detailVertices > 0,
    );
    await page.waitForTimeout(250);
    await clickCell(first);
    await page.locator("#claimCell").waitFor({ state: "visible" });
    assert.equal(await page.locator("#claimCell").textContent(), "Start here");
    await page.screenshot({path: `artifacts/globe-design/${mobile}-starting-spot.png`});
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
    await page.locator("#hexAmount").fill("4");
    await page.locator("#toDesign").click();
    assert.equal(await page.locator("#shapeCountError").isVisible(), true);
    assert.equal(await page.locator("#designStep").isHidden(), true);
    await page.locator("#hexAmount").fill("10");
    await page.locator("#hexAmount").press("Enter");
    await page.waitForFunction(() => window.geodesicQA.state().design.length === 10);
    assert.equal(await page.locator("#shapeCountError").isHidden(), true);
    await page.locator('.size-presets [data-add-size="10"]').click();
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length === 20,
    );
    await page.screenshot({path:`artifacts/globe-design/${mobile}-shape-exact.png`});
    const grownIds = await page.evaluate(
      () => window.geodesicQA.state().design,
    );
    assert.ok(startingIds.every((id) => grownIds.includes(id)));
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
      () => window.geodesicQA.state().design.length === 21,
    );
    const drawnIds = await page.evaluate(
      () => window.geodesicQA.state().design,
    );
    await page.locator('[name="shapeMode"][value="exact"]').check();
    await page.locator("#hexAmount").fill("22");
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length === 22,
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
    await page.evaluate(() => history.back());
    await page.waitForFunction(() => document.body.dataset.flow === "shape");
    await page.evaluate(() => history.back());
    await page.waitForFunction(() => document.body.dataset.flow === "location");
    await page.evaluate(() => history.forward());
    await page.waitForFunction(() => document.body.dataset.flow === "shape");
    await page.evaluate(() => history.forward());
    await page.waitForFunction(() => document.body.dataset.flow === "design");
    const away=await page.evaluate(anchor=>Object.values(window.geodesicQA.locations).find(id=>id!==anchor),first);
    await page.evaluate(id=>window.geodesicQA.focus(id,.6),away);
    await page.locator("#homeView").click();
    await page.waitForTimeout(2400);
    const anchorPoint=await page.evaluate(id=>window.geodesicQA.screen(id),first),worldBox=await page.locator("#world").boundingBox(),panelBox=await page.locator("#buyPanel").boundingBox();
    assert.ok(anchorPoint.x>=worldBox.x&&anchorPoint.x<=worldBox.x+worldBox.width);
    assert.ok(anchorPoint.y>=worldBox.y&&anchorPoint.y<=(mobile?panelBox.y:worldBox.y+worldBox.height));
    assert.equal(
      await page.locator("#designTitle").textContent(),
      "3. Create your design",
    );
    assert.equal(
      await page.locator('#designStep [data-colour]').count(),
      24,
    );
    assert.deepEqual(await page.locator("#customPaintTools>button").evaluateAll((elements) => elements.slice(0, 2).map((element) => element.id)),["moveImageMode", "paintCells"]);
    assert.equal(await page.locator(".globe-controls>button").first().getAttribute("id"),"panEditor");
    assert.equal(await page.locator("#panEditor").isVisible(),true);
    await page.screenshot({
      path: "artifacts/globe-design/" + mobile + "-draw.png",
    });
    await page.locator("#paintCells").click();
    const beforeCustomColour=await page.evaluate(() => window.geodesicQA.state().designCells);
    await page.locator('#customColour').fill('#123456');
    assert.equal(await page.locator('#brushColor').inputValue(),'#123456');
    assert.equal(await page.locator('#paintCells').getAttribute('aria-pressed'),'true');
    assert.deepEqual(await page.evaluate(() => window.geodesicQA.state().designCells),beforeCustomColour);
    await page.screenshot({path:`artifacts/globe-design/${mobile}-colour.png`});
    await page.locator('[data-brush="2"]').click();
    const neighbour = await page.evaluate(
      (id) => window.geodesicQA.neighbours(id)[0],
      first,
    );
    await page.locator('[data-colour="#34d399"]').click();
    await page.evaluate((id) => window.geodesicQA.focus(id, 0.6), neighbour);
    await clickCell(neighbour);
    await page.waitForFunction(
      () => window.geodesicQA.state().design.length > 1,
    );
    assert.equal(await page.locator("#recentColours").isVisible(), true);
    assert.equal(
      await page.locator(".recent-colour").first().getAttribute("title"),
      "#34D399",
    );
    let ids = await page.evaluate(() => window.geodesicQA.state().design);
    await clickCell(first);
    await page.locator("#undoPaint").click();
    await page.locator("#removeHexMode").click();
    assert.equal(await page.locator("#removeHexMode").getAttribute("aria-pressed"),"true");
    await page.locator("#removeHexMode").click();
    assert.equal(await page.locator("#removeHexMode").getAttribute("aria-pressed"),"false");
    await page.locator("#removeHexMode").click();
    await page.locator('[data-brush="0"]').click();
    await clickCell(ids.at(-1));
    await page.waitForFunction(
      (n) => window.geodesicQA.state().design.length < n,
      ids.length,
    );
    await page.locator("#undoPaint").click();
    await page.locator('[data-colour="#ff9f43"]').click();
    assert.equal(await page.locator("#removeHexMode").getAttribute("aria-pressed"),"false");
    assert.equal(await page.locator("#paintCells").getAttribute("aria-pressed"),"true");
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
    await page.locator("#paintCells").click();
    await page.locator('#customColour').fill('#123456');
    const unfinishedDraft=await page.evaluate(() => window.geodesicQA.state().design);
    await page.locator("#closeBuy").click();
    await page.locator('#studioExit').waitFor({state:'visible'});
    await page.locator('#studioExit [value="continue"]').click();
    assert.equal(await page.locator('#designStep').isVisible(),true);
    await page.locator("#closeBuy").click();
    await page.locator('#studioExit [value="save"]').click();
    await page.waitForFunction(() => document.querySelector('#buyPanel').getAttribute('aria-hidden') === 'true');
    await page.locator("#claimButton").click();
    await page.locator("#designStep").waitFor({state:"visible"});
    assert.deepEqual(await page.evaluate(() => window.geodesicQA.state().design),unfinishedDraft);
    assert.equal(await page.locator("#addImageLabel").textContent(),"Replace image");
    assert.equal(await page.locator('#brushColor').inputValue(),'#123456');
    const originalIds = [...ids],
      relocation = await page.evaluate((id) => {
        let next = id;
        for (let i = 0; i < 5; i++)
          next = window.geodesicQA.neighbours(next)[0];
        return next;
      }, first);
    await page.locator('[data-flow-target="shape"]').click();
    await page.locator('[data-flow-target="location"]').click();
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
    await page.locator("#locationStep").waitFor({ state: "visible" });
    assert.deepEqual(await page.evaluate(() => window.geodesicQA.state().design), []);
    assert.equal(await page.locator("#hexAmount").inputValue(), "0");
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
    assert.equal(await page.evaluate(id=>window.geodesicQA.selectionAlpha(id),ids[0]),0);
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
    const available=await page.evaluate(id=>{const queue=[id],seen=new Set(queue);for(let cursor=0;cursor<queue.length;cursor++)for(const next of window.geodesicQA.neighbours(queue[cursor])){if(seen.has(next))continue;if(!window.geodesicQA.isOccupied(next))return next;seen.add(next);queue.push(next);}},ids[0]);
    await page.evaluate(id=>window.geodesicQA.focus(id,.6),available);
    await page.waitForTimeout(250);
    await clickCell(available);
    await page.locator("#claimCell").waitFor({state:"visible"});
    assert.equal(await page.locator("#cellNumber").textContent(),`Hexagon #${available}`);
    assert.equal(await page.evaluate(id=>window.geodesicQA.selectionAlpha(id),available),255);
    await page.screenshot({path:`artifacts/globe-design/${mobile}-available-claim.png`});
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(id=>window.geodesicQA.selectionAlpha(id),available),0);
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
