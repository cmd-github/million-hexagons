// Record a vertical promo reel from the real app, then encode it to MP4.
//
//   npm run build && npx vite preview --port 4181 --host 127.0.0.1
//   npm run promo:reel
//
// Nothing is mocked. This drives the actual studio through Location, Shape, Design and
// Review while Chrome records, so what you see is the product running. Captions are
// injected as an overlay layer on top of the live page during the recording.
//
// Output: artifacts/promo/reel.mp4 at 1080x1920, plus the raw capture beside it.
import { mkdir, rm, readdir, rename } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { chromium } from 'playwright';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'artifacts', 'promo');
const raw = path.join(outDir, 'raw');
// The production build, not the dev server. Dev starts slowly enough that video capture can
// push artwork loading past its own 30 second failure threshold and film the recovery screen.
//   npm run build && npx vite preview --port 4181 --host 127.0.0.1
const base = process.env.REEL_URL || 'http://127.0.0.1:4181';

// 9:16 at a real phone width, so the globe-first mobile composition is what gets filmed.
const VIEW = { width: 432, height: 768 };

await rm(outDir, { recursive: true, force: true });
await mkdir(raw, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--mute-audio'],
});
const context = await browser.newContext({
  viewport: VIEW,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: raw, size: VIEW },
});
const page = await context.newPage();

// Caption layer. Lives above the app, styled like the product so it reads as one piece.
async function installCaptions() {
  await page.addStyleTag({ content: `
    /* The page's own pitch copy and live totals duplicate or fight the caption, and the
       region selector and the staging test-mode note are not things a promo should show. */
    .intro,#globalMetrics,.pricing-region,.mock-note{visibility:hidden!important}

    #reelCaption{
      position:fixed;left:0;right:0;bottom:0;z-index:99999;pointer-events:none;
      padding:74px 26px 46px;display:flex;flex-direction:column;gap:9px;
      font-family:Manrope,system-ui,sans-serif;
      background:linear-gradient(to top,#050b14 0%,rgba(5,11,20,.97) 62%,transparent 100%);
      opacity:0;transition:opacity .45s ease;
    }
    /* While the studio sheet owns the lower half, the caption moves to the clear globe area. */
    #reelCaption.top{
      bottom:auto;top:0;padding:54px 26px 70px;
      background:linear-gradient(to bottom,#050b14 0%,rgba(5,11,20,.97) 58%,transparent 100%);
    }
    #reelCaption.show{opacity:1}
    #reelCaption b{
      display:block;font-size:31px;line-height:1.14;font-weight:800;letter-spacing:-.02em;
      color:#f2fbf7;text-wrap:balance;
    }
    #reelCaption span{
      display:block;font-size:14px;font-weight:500;color:#d4ff58;letter-spacing:.02em;
    }
    #reelEnd{
      position:fixed;inset:0;z-index:100000;pointer-events:none;background:#050b14;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
      opacity:0;transition:opacity .5s ease;font-family:Manrope,system-ui,sans-serif;
    }
    #reelEnd.show{opacity:1}
    #reelEnd b{font-size:34px;font-weight:800;color:#f2fbf7;letter-spacing:-.02em;text-align:center;line-height:1.15}
    #reelEnd i{font-style:normal;font-size:13px;letter-spacing:.26em;text-transform:uppercase;color:#d4ff58;font-family:"DM Mono",monospace}
  ` });
  await page.evaluate(() => {
    const caption = document.createElement('div');
    caption.id = 'reelCaption';
    caption.innerHTML = '<span></span><b></b>';
    document.body.append(caption);

    const end = document.createElement('div');
    end.id = 'reelEnd';
    end.innerHTML = '<i>Million Hexagons</i><b>One globe.<br>A million places.</b>';
    document.body.append(end);

    window.reelSay = (kicker, line, position) => {
      const node = document.getElementById('reelCaption');
      node.querySelector('span').textContent = kicker || '';
      node.querySelector('b').textContent = line || '';
      node.classList.toggle('top', position === 'top');
      node.classList.add('show');
    };
    window.reelHide = () => document.getElementById('reelCaption').classList.remove('show');
    window.reelFinish = () => document.getElementById('reelEnd').classList.add('show');
  });
}

const say = (kicker, line, position) => page.evaluate(([k, l, p]) => window.reelSay(k, l, p), [kicker, line, position || 'bottom']);
const hide = () => page.evaluate(() => window.reelHide());
const beat = ms => page.waitForTimeout(ms);

// 1. The loader, counting the real inventory in. Startup occasionally lands on the recovery
// screen; a reel of that is worse than no reel, so retry and refuse to encode a broken take.
let started = 0, revealed = 0;
for (let attempt = 1; attempt <= 3; attempt++) {
  started = Date.now();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  try {
    // The loader hides itself only on a clean start; a failed one leaves it up with a retry
    // button and a "Could not load" message, which is the take we must never encode.
    await page.waitForFunction(() => {
      const loader = document.querySelector('#appLoading');
      const message = document.querySelector('#loadingMessage')?.textContent || '';
      if (/could not/i.test(message)) throw Error('startup failed');
      return loader?.hidden === true && !document.body.classList.contains('booting');
    }, null, { timeout: 90000, polling: 250 });
    revealed = Date.now();
    break;
  } catch {
    if (attempt === 3) throw Error('The globe did not reach a clean ready state in three attempts');
    console.log(`Startup attempt ${attempt} did not settle, retrying`);
    await beat(1500);
  }
}
await installCaptions();
await beat(900);

// 2. The globe at rest.
await say('One shared globe', 'A million hexagons, and every one can be claimed.');
await beat(3200);
await hide();
await beat(400);

// 3. Move in.
for (let i = 0; i < 3; i++) { await page.locator('#zoomIn').click(); await beat(420); }
await beat(700);

// 4. Into the studio.
await say('Pick your spot', 'Anywhere on the planet that is still free.', 'top');
await page.locator('#claimButton').click();
await page.locator('#locationStep').waitFor({ state: 'visible', timeout: 30000 });
await beat(2400);
await hide();

// 5. Choose a starting hexagon by tapping the globe, the way a person does. The production
// build carries no test hooks, so aim near the middle and nudge outwards if nothing is offered.
const claimCell = page.locator('#claimCell');
const centre = { x: VIEW.width / 2, y: VIEW.height * 0.42 };
const nudges = [[0, 0], [22, -18], [-26, 14], [14, 30], [-18, -32], [34, 8]];
let proposed = false;
for (const [dx, dy] of nudges) {
  await page.touchscreen.tap(centre.x + dx, centre.y + dy);
  try {
    await claimCell.waitFor({ state: 'visible', timeout: 4000 });
    proposed = true;
    break;
  } catch { await beat(250); }
}
if (!proposed) throw Error('No hexagon was offered after tapping the globe');
await beat(1100);
await claimCell.click();
await page.locator('#shapeStep').waitFor({ state: 'visible', timeout: 30000 });
await beat(900);

// 6. Size it.
await say('Take as much as you want', 'From a single hexagon to a hundred thousand.', 'top');
for (const size of ['100', '100', '25']) {
  await page.locator(`[data-add-size="${size}"]`).click();
  await beat(750);
}
await beat(1200);
await hide();
await page.locator('#toDesign').click();
await page.locator('#designStep').waitFor({ state: 'visible', timeout: 30000 });
await beat(1000);

// 7. Colour it.
await say('Make it yours', 'Paint it, or drop your own artwork straight onto the globe.', 'top');
await page.locator('#paintCells').click();
await beat(700);
for (const colour of ['#d4ff58', '#22d3ee', '#ff4d6d']) {
  const swatch = page.locator(`[data-colour="${colour}"]`);
  if (await swatch.count()) { await swatch.first().click(); await beat(650); }
}
await page.locator('#fillCells').click();
await beat(1800);
await hide();
await beat(400);

// 8. Review, then the end card.
const review = page.locator('#toPlacement');
if (await review.isEnabled()) {
  await review.click();
  await page.locator('#reviewStep').waitFor({ state: 'visible', timeout: 30000 });
  await say('Yours, permanently', 'One place on the globe, with your name on it.', 'top');
  await beat(3000);
  await hide();
  await beat(500);
}
await page.evaluate(() => window.reelFinish());
await beat(2600);

await context.close();
await browser.close();

// Playwright names the file by page id; there is exactly one.
const [captured] = (await readdir(raw)).filter(name => name.endsWith('.webm'));
if (!captured) throw Error('No capture produced');
const source = path.join(raw, captured);
const webm = path.join(outDir, 'reel-source.webm');
await rename(source, webm);
await rm(raw, { recursive: true, force: true });

// Upscale to 1080x1920 with a clean even-pixel scale, constant 30fps, H.264 for wide support.
// Real load time varies, so trim the front to leave a fixed two seconds of the loader rather
// than however long this particular run happened to sit on it.
const LOADER_SECONDS = 2;
const trim = Math.max(0, (revealed - started) / 1000 - LOADER_SECONDS);
const mp4 = path.join(outDir, 'reel.mp4');
await run('ffmpeg', [
  '-y', ...(trim > 0.2 ? ['-ss', trim.toFixed(2)] : []), '-i', webm,
  '-vf', 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p',
  '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '20',
  '-movflags', '+faststart', '-an', mp4,
], { maxBuffer: 1 << 26 });

const { stdout } = await run('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size',
  '-of', 'default=noprint_wrappers=1', mp4,
]);
console.log(`Wrote ${path.relative(root, mp4)}`);
console.log(stdout.trim());
