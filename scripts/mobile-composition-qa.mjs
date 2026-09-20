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
fs.writeFileSync(`${out}/occlusion-measured.json`, JSON.stringify(results, null, 2));
for (const k in results) { const v = results[k];
  console.log(`${k} | globe on screen ${v.globe.onScreenPctOfScreen}% | covered ${v.occlusion.pctGlobeCoveredByUI}% | unobstructed ${v.occlusion.unobstructedGlobePctOfScreen}% | chrome ${v.chromePctOfScreen}% | clipped ${v.globe.clippedByViewport}`);
  console.log('   by element:', JSON.stringify(v.occlusion.byElementPctOfGlobe)); }
await browser.close();
