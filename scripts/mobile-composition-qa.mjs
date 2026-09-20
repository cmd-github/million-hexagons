// Reproducible globe-occlusion measurement, from rendered pixels.
// Counts the globe's actual on-screen pixels rather than assuming a full circle,
// so it is correct whether the sphere is fitted inside the viewport or overfills
// and is clipped by it. Supersedes the earlier geodesicQA-projection attempt,
// which only resolved a couple of loaded cells at overview altitude.
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
const base = process.env.SMOKE_URL || "http://127.0.0.1:4180";
const out = "artifacts/mobile-composition";
const HIDE = `header.topbar,.intro,#claimFeed,#globalMetrics,.globe-controls,#toast,#hint,.buy-panel,#appLoading,#claimButton{opacity:0 !important;}`;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = {};

for (const [name, vw, vh] of [["390x844", 390, 844], ["320x568", 320, 568]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page.setDefaultTimeout(30000);
  await page.goto(base + "/?geodesicQA");
  await page.waitForSelector("#world[data-ready=true]", { timeout: 90000 });
  await page.waitForTimeout(3500);

  const rects = await page.evaluate(() =>
    [...document.querySelectorAll("header.topbar,.intro,#claimFeed,#globalMetrics,.globe-controls,#claimButton")]
      .filter(el => { const cs = getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden" && !el.hidden && +cs.opacity > .05; })
      .map(el => { const r = el.getBoundingClientRect();
        return { id: el.id || el.className.split(" ")[0], x: Math.round(r.x), y: Math.round(r.y),
                 w: Math.round(r.width), h: Math.round(r.height) }; }));

  const style = await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(600);
  const buf = await page.screenshot();
  fs.writeFileSync(`${out}/clean-${name}.png`, buf);
  await style.evaluate(el => el.remove());

  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info, S = W / vw;
  const covered = (x, y) => rects.some(t => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h);
  // Globe body: blue-dominant and clearly brighter than space.
  let globe = 0, hidden = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const per = Object.fromEntries(rects.map(r => [r.id, 0]));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * C, r = data[o], g = data[o + 1], b = data[o + 2];
    if (!(b > 55 && b - r > 22 && g > 40)) continue;
    globe++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    const cx = x / S, cy = y / S;
    let hit = false;
    for (const t of rects) if (cx >= t.x && cx <= t.x + t.w && cy >= t.y && cy <= t.y + t.h) { per[t.id]++; hit = true; }
    if (hit) hidden++;
  }
  const screenPx = W * H;
  results[name] = {
    viewport: `${vw}x${vh}`,
    globe: {
      onScreenPctOfScreen: +(globe / screenPx * 100).toFixed(1),
      widthOnScreenCssPx: +((maxX - minX) / S).toFixed(0),
      heightOnScreenCssPx: +((maxY - minY) / S).toFixed(0),
      clippedByViewport: minX <= 1 || maxX >= W - 2 || minY <= 1 || maxY >= H - 2,
    },
    occlusion: {
      pctGlobeCoveredByUI: +(hidden / globe * 100).toFixed(1),
      unobstructedGlobePctOfScreen: +((globe - hidden) / screenPx * 100).toFixed(1),
      byElementPctOfGlobe: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, +(v / globe * 100).toFixed(1)])),
    },
    overlayRects: rects,
    chromePctOfScreen: +(rects.reduce((t, r) => t + r.w * r.h, 0) / (vw * vh) * 100).toFixed(1),
  };
  await page.close();
}
// Zooming in turns on detail-view, which used to unwind the phone composition:
// Claim jumped back to the topbar and the pitch reflowed into the desktop slab.
// Check the bottom surfaces stay put and stay clear of each other.
const overlaps = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
for (const [name, vw, vh] of [["390x844", 390, 844], ["320x568", 320, 568]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(base + "/?geodesicQA");
  await page.waitForSelector("#world[data-ready=true]", { timeout: 90000 });
  await page.waitForTimeout(2500);
  const read = () => page.evaluate(() => {
    const box = sel => { const el = document.querySelector(sel); if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), position: getComputedStyle(el).position }; };
    return { detail: document.body.classList.contains("detail-view"), vh: innerHeight,
             claim: box("#claimButton"), controls: box(".globe-controls"), intro: box(".intro") };
  });
  const before = await read();
  // The opening view shows the whole globe and must still pull back from there.
  // Measured from the rendered silhouette, so this does not need the dev hook
  // and therefore runs against a deployed build as well as the dev server.
  const globeWidth = async () => {
    const style = await page.addStyleTag({ content: HIDE });
    await page.waitForTimeout(400);
    const shot = await page.screenshot();
    await style.evaluate(el => el.remove());
    const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    let min = 1e9, max = -1e9;
    for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * info.channels;
      if (data[o + 2] > 55 && data[o + 2] - data[o] > 22 && data[o + 1] > 40) { if (x < min) min = x; if (x > max) max = x; }
    }
    return max > min ? (max - min) / (info.width / vw) : 0;
  };
  const startWidth = await globeWidth();
  for (let i = 0; i < 5; i++) { await page.evaluate(() => document.querySelector("#zoomOut").click()); await page.waitForTimeout(500); }
  const outWidth = await globeWidth();
  if (startWidth < vw * .92) throw Error(`${name}: the opening view should show the whole globe across the width, was ${startWidth.toFixed(0)} of ${vw}`);
  if (outWidth > startWidth * .85) throw Error(`${name}: must zoom out well past the opening view, ${startWidth.toFixed(0)}px -> ${outWidth.toFixed(0)}px`);
  console.log(`${name} | opens at ${startWidth.toFixed(0)}px of ${vw} wide, pulls back to ${outWidth.toFixed(0)}px`);
  await page.evaluate(() => document.querySelector("#homeView").click());
  await page.waitForTimeout(1500);
  for (let i = 0; i < 5; i++) { await page.evaluate(() => document.querySelector("#zoomIn").click()); await page.waitForTimeout(700); }
  const after = await read();
  await page.screenshot({ path: `${out}/${name}-zoomed.png` });
  if (!after.detail) throw Error(`${name}: zooming in should reach detail-view`);
  if (Math.abs(after.claim.top - before.claim.top) > 2) throw Error(`${name}: Claim moved on zoom, ${before.claim.top} -> ${after.claim.top}`);
  if (after.claim.bottom > 70) throw Error(`${name}: Claim must stay in the header, bottom was ${after.claim.bottom}`);
  if (overlaps(after.controls, after.claim)) throw Error(`${name}: controls overlap Claim`);
  if (after.intro.top < after.vh) throw Error(`${name}: the pitch must slide off the bottom, not reflow`);
  console.log(`${name} | zoom transition holds: Claim steady in the header at ${after.claim.top}, pitch off-screen`);
  await page.close();
}

// Shape and Design must fit their panel without vertical scrolling on a phone.
// Walking that journey needs the geodesicQA hook, which only a dev build exposes,
// so against a deployed origin this reports as skipped rather than failing. Run it
// against `npm run dev` to exercise it, as the other studio journeys are run.
const studioHook = await (async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(base + "/?geodesicQA");
  await page.waitForSelector("#world[data-ready=true]", { timeout: 90000 });
  const present = await page.evaluate(() => !!window.geodesicQA?.state);
  await page.close();
  return present;
})();
if (!studioHook) console.log("studio fit | SKIPPED: no geodesicQA hook on this origin (deployed build); run against the dev server");
for (const [name, vw, vh] of studioHook ? [["390x844", 390, 844], ["411x795", 411, 795], ["320x568", 320, 568]] : []) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page.setDefaultTimeout(40000);
  await page.goto(base + "/?geodesicQA");
  await page.waitForSelector("#world[data-ready=true]", { timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.locator("#claimButton").click();
  await page.locator("#locationStep").waitFor();
  const anchor = await page.evaluate(() => window.geodesicQA.state().designAnchor);
  await page.evaluate(id => window.geodesicQA.focus(id, .6), anchor);
  await page.waitForFunction(() => window.geodesicQA.state().detailVertices > 0);
  await page.waitForTimeout(300);
  const pt = await page.evaluate(id => window.geodesicQA.screen(id), anchor);
  await page.touchscreen.tap(pt.x, pt.y);
  await page.locator("#claimCell").waitFor({ state: "visible" });
  await page.locator("#claimCell").click();
  await page.locator("#shapeStep").waitFor({ state: "visible" });
  await page.waitForTimeout(600);
  const overflow = () => page.evaluate(() => {
    const s = document.querySelector(".flow-screen:not([hidden])");
    return { flow: document.body.dataset.flow, over: s ? s.scrollHeight - s.clientHeight : 0 };
  });
  for (const step of ["shape", "design"]) {
    if (step === "design") {
      await page.locator("#toDesign").click();
      await page.locator("#designStep").waitFor({ state: "visible" });
      // Measure with an image loaded: that reveals the layout choice and the
      // second action button, and is the tallest the step ever gets.
      await page.locator("#logoUpload").setInputFiles("scripts/fixtures/test-logo.svg");
      await page.waitForFunction(() => document.querySelector("#addImageLabel").textContent === "Replace image");
      await page.waitForTimeout(700);
    }
    const o = await overflow();
    await page.screenshot({ path: `${out}/${name}-${step}.png` });
    if (o.over > 0) throw Error(`${name}: ${o.flow} must fit without scrolling, overflows by ${o.over}px`);
    const m = await page.evaluate(() => {
      const panel = document.querySelector("#buyPanel"), r = panel.getBoundingClientRect();
      const kids = [...panel.children].filter(e => !e.hidden && getComputedStyle(e).display !== "none");
      const lastRow = kids.map(e => e.getBoundingClientRect().bottom).reduce((a, b) => Math.max(a, b), 0);
      return { share: Math.round(r.height / innerHeight * 100),
               dead: Math.round(r.bottom - parseFloat(getComputedStyle(panel).paddingBottom) - lastRow) };
    });
    if (m.share > (vh <= 650 ? 68 : 56)) throw Error(`${name}: ${o.flow} panel takes ${m.share}% of the screen`);
    // A panel sized by viewport percentage rather than by content leaves a dead
    // band under the last control. That is invisible in an emulator whose
    // viewport matches dvh exactly, and obvious on a real phone.
    if (m.dead > 16) throw Error(`${name}: ${o.flow} leaves ${m.dead}px of empty panel below its content`);
    console.log(`${name} | ${o.flow} fits with no scrolling, panel ${m.share}% of screen, ${m.dead}px dead space`);
  }
  await page.close();
}

fs.writeFileSync(`${out}/occlusion-measured.json`, JSON.stringify(results, null, 2));
for (const k in results) { const v = results[k];
  console.log(`${k} | globe on screen ${v.globe.onScreenPctOfScreen}% | covered ${v.occlusion.pctGlobeCoveredByUI}% | unobstructed ${v.occlusion.unobstructedGlobePctOfScreen}% | chrome ${v.chromePctOfScreen}% | clipped ${v.globe.clippedByViewport}`);
  console.log('   by element:', JSON.stringify(v.occlusion.byElementPctOfGlobe)); }
await browser.close();
