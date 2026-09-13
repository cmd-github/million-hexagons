import { chromium } from "playwright";
import fs from "node:fs";

const candidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = candidates.find(fs.existsSync);
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.stack || error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

const globePoints = [
  [720, 450],
  [620, 430],
  [820, 430],
  [550, 520],
  [850, 520],
  [650, 330],
  [780, 600],
  [470, 390],
];
async function placeAvailableArea() {
  await page.click("#suggestLocation");
  if (await page.locator("#toReview").isEnabled()) return;
  for (const [x, y] of globePoints) {
    await page.mouse.click(x, y);
    if (await page.locator("#toReview").isEnabled()) return;
  }
  throw new Error("Could not find an available placement area");
}

await page.goto(
  (process.env.SMOKE_URL || "http://127.0.0.1:4175") + "?tourFast",
  { timeout: 60000 },
);
page.setDefaultTimeout(7000);
await page.waitForSelector('#world[data-ready="true"]', { timeout: 60000 });

if (
  !(await page
    .locator("#demoTour")
    .evaluate((element) => element.closest(".globe-controls") !== null))
)
  errors.push("Demo control was not in the globe toolbar");
if (!(await page.locator("#demoTour .ico").count()))
  errors.push("Globe tour icon did not render");
await page.click("#zoomIn");
await page.click("#zoomIn");
await page.click("#zoomIn");
await page.click("#zoomIn");
await page.waitForFunction(() =>
  document.body.classList.contains("detail-view"),
);
const globe = await page.locator("#world").boundingBox();
if (!globe) throw new Error("Globe canvas was unavailable");
await page.mouse.click(globe.x + globe.width / 2, globe.y + globe.height / 2);
await page.waitForFunction(
  () =>
    document.querySelector("#rotationToggle").getAttribute("aria-pressed") ===
    "false",
);
if (
  (await page.locator("#rotationToggle").getAttribute("aria-pressed")) !==
  "false"
)
  errors.push("Close globe click did not pause rotation");
if (!(await page.locator("#rotationToggle .ico").count()))
  errors.push("Rotation control icon did not render");
await page.screenshot({
  path: "artifacts/visual-qa/desktop-rotate-control.png",
});
await page.click("#rotationToggle");
if (
  (await page.locator("#rotationToggle").getAttribute("aria-pressed")) !==
  "true"
)
  errors.push("Rotation control did not restart rotation");
if (await page.locator("#cellPosition").count())
  errors.push("Tile tooltip still included coordinates");
await page.waitForSelector("#claimFeedItems button", {
  state: "attached",
  timeout: 60000,
});
const liveActivity = await page
  .locator("#claimFeedItems button")
  .first()
  .textContent();
await page.locator("#claimFeed summary").click();
await page.locator("#claimFeedItems button").first().click();
try {
  await page.waitForSelector("#placementInspector:not([hidden])", {
    timeout: 60000,
  });
} catch (error) {
  const state = await page.evaluate(() => ({
    hidden: document.querySelector("#placementInspector").hidden,
    name: document.querySelector("#inspectorName").textContent,
    status: document.querySelector("#inspectorStatus").textContent,
    body: document.body.className,
    feedOpen: document.querySelector("#claimFeed").open,
  }));
  await page.screenshot({
    path: "artifacts/visual-qa/live-placement-failure.png",
    fullPage: true,
  });
  throw new Error(
    `Live activity did not open its placement inspector: ${errors.join(" | ") || error.message}; state=${JSON.stringify(state)}`,
  );
}
if (!(await page.locator("#inspectorName").textContent()).trim())
  errors.push("Live placement path did not expose a placement name");
await page.screenshot({
  path: "artifacts/visual-qa/desktop-live-placement.png",
});
await page.keyboard.press("Escape");
await page.click("#demoTour");
await page.waitForFunction(
  () =>
    document.querySelector("#demoTour").getAttribute("aria-pressed") === "true",
  null,
  { timeout: 60000 },
);
const firstTourCell = await page.locator("#demoTour").getAttribute("data-cell");
if (!firstTourCell) errors.push("Tour did not select an occupied target cell");
await page.screenshot({ path: "artifacts/visual-qa/desktop-globe-tour.png" });
await page.mouse.wheel(0, 100);
await page.waitForFunction(
  () =>
    document.querySelector("#demoTour").getAttribute("aria-pressed") ===
    "false",
);
await page.click("#demoTour");
await page.waitForFunction(
  () =>
    document.querySelector("#demoTour").getAttribute("aria-pressed") === "true",
  null,
  { timeout: 60000 },
);
const secondTourCell = await page
  .locator("#demoTour")
  .getAttribute("data-cell");
if (!secondTourCell)
  errors.push("Tour did not restart on an occupied placement");
await page.mouse.wheel(0, 100);

await page.click("#claimButton");
await page.waitForSelector("#designStep", { state: "visible", timeout: 60000 });
if (!(await page.locator("#designStep").isVisible()))
  errors.push("Unified editor did not open");

if (!(await page.locator("#designStep").isVisible()))
  errors.push("Logo design step did not open");
if (!(await page.locator("#toPlacement").isEnabled()))
  errors.push("Colour design should work without upload");
await page.setInputFiles("#logoUpload", "scripts/fixtures/test-logo.svg");
await page.locator("#moveImageMode").click();
await page.locator(".studio-more summary").click();
await page.locator("#logoOrientation").fill("180");
await page.locator("#logoOrientation").dispatchEvent("change");
const logoRotation = await page
  .locator("#logoPreview")
  .evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--logo-rotation").trim(),
  );
if (logoRotation !== "180deg")
  errors.push(`Logo rotation preview was ${logoRotation || "not set"}`);
if (!(await page.locator("#toPlacement").isEnabled()))
  errors.push("Logo placement did not enable after upload");
const uploadAccepted = (await page.locator("#logoPreview img").count()) === 1,
  detectedColours = await page.locator("#logoSwatches button").count();
await page.click("#toPlacement");
await page.waitForFunction(
  () => !document.querySelector("#suggestLocation").disabled,
);
if (
  !(await page
    .locator("#moveGlobeMode")
    .evaluate((el) => el.classList.contains("active")))
)
  errors.push("Move was not the default placement mode");
await page.click("#placeDesignMode");
await page.waitForTimeout(650);
await placeAvailableArea();
await page.click("#toReview");
await page.locator("#reviewStep").waitFor({ state: "visible", timeout: 60000 });
const reviewPrice = await page.locator("#reviewPrice").textContent(),
  reviewCount = Number(
    (await page.locator("#reviewCount").textContent()).replace(/[^0-9]/g, ""),
  );
if (reviewPrice !== `$${reviewCount.toLocaleString("en-US")}`)
  errors.push(
    `Review count/price diverged: ${reviewCount} cells and ${reviewPrice}`,
  );
if (!(await page.locator("#previewPurchase").isEnabled()))
  errors.push("Secure checkout action was not available from Review");
await page.keyboard.press("Escape");
await page.waitForFunction(
  () =>
    document.querySelector("#buyPanel").getAttribute("aria-hidden") === "true",
  null,
  { timeout: 60000 },
);

const panelClosed =
  (await page.locator("#buyPanel").getAttribute("aria-hidden")) === "true";

console.log(
  JSON.stringify({
    logoRotation,
    uploadAccepted,
    reviewPrice,
    reviewCount,
    panelClosed,
    detectedColours,
    liveActivity: liveActivity.trim(),
    tourRestarted: Boolean(secondTourCell),
    errors,
  }),
);
await browser.close();
if (errors.length) process.exitCode = 1;
