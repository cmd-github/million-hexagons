# Validation

Run checks relevant to the changed area. A passing build or scripted assertion does not establish visual quality.

For deployment/runtime-origin changes, run `npm run test:deployment` and the separated-build browser workflow in [STAGING.md](STAGING.md). Inspect its desktop/mobile screenshots. Cloudflare dry runs and a local R2 stand-in do not establish live CDN, rollback or physical-device readiness.

## Core checks

```powershell
npm run build
npm run dev -- --port 4180
# In another terminal
$env:SMOKE_URL = 'http://127.0.0.1:4180'
npm test
npm run test:geometry
node scripts/globe-design-qa.mjs
node scripts/globe-navigation-qa.mjs
npm run test:studio-scale
```

For purchase-flow changes, exercise image, solid colour, and mixed per-cell paint/transparency in the unified editor at desktop and mobile sizes. Confirm repeated Place/Review -> Edit round trips preserve the exact draft pixels, undo/redo and restore recover source artwork, and transparent cells retain count/price. Cover 1/50/150/400/500-cell logo footprints as relevant, valid and occupied locations, URL validation, editing routes, and exact selected/reviewed/committed count and price parity. Inspect generated screenshots under `artifacts/visual-qa/`. Confirm no pane scrolling at 320x568, 390x844, 1024x768 and 1440x900, including open contextual tools.

`test:studio-scale` uses a test-only empty occupancy response to exercise 50,000/100,000-cell editing, undo/redo, image framing, canvas pan/zoom, relocation and a 100,000-cell publication. It leaves real sample inventory unchanged. Inspect `artifacts/studio-scale/`; report timing as local/emulated results and distinguish capacity from available contiguous space. Run this check against the development server because it uses the existing `geodesicQA` hooks.

## Geodesic and gesture checks

Focused controls are available on the development server:

```powershell
npm run dev -- --port 4180
# In another terminal
$env:SMOKE_URL = 'http://127.0.0.1:4180'
npm run test:geodesic-visual
npm run test:geodesic-gestures
node scripts/geodesic-studio-qa.mjs
```

For topology, picking, artwork mapping, or globe-control changes, inspect equator, poles, pentagons, cube seams, and both desktop and mobile gestures. Confirm artwork remains complete, correctly oriented, colour-accurate, and crisp. Emulated touch is not physical-device certification.

Regenerate the frozen topology only for an intentional inventory migration:

```powershell
npm run build:topology
npm run test:geometry
```

Do not run `scripts/create-geodesic-seed.py` for routine regeneration because a new seed changes cell identity.

## Streaming and runtime assets

With the development server running:

```powershell
npm run build:runtime
$env:SMOKE_URL = 'http://127.0.0.1:4180'
npm run build:artwork
npm run test:streaming
npm run test:performance
```

`npm run build:artwork-million` creates the optional, ignored million-cell stress catalogue and can be expensive. Run it only when a fully occupied rendering fixture is required. Inspect performance screenshots and report local/emulated results as such.

## Coming-soon site

For changes under `coming-soon/`, run `npm run build:coming-soon`, `npm --prefix functions test`, and `npm run test:coming-soon` against its preview server. Inspect desktop/mobile output, form validation and states, keyboard focus, the X link, and globe drag behaviour before deploying functions and hosting together.


Globe editing: run `node scripts/globe-design-qa.mjs` against localhost:4180. It checks desktop/mobile globe editing and exact cell IDs across Design/Place/Review, plus discovery HUD actions. Inspect artifacts/globe-design. Also manually check connected add/remove and occupied-cell rejection around an existing placement.


Current globe-only UI checks replace the earlier canvas interaction journeys: scripts/globe-design-qa.mjs covers desktop/mobile brush growth, separate removal, undo, continuous rotation, clean restart, source preservation and review IDs; scripts/globe-navigation-qa.mjs covers viewport fit, claim camera preservation, detail gating, double-click zoom and shared-link arrival. The older canvas-specific visual/scale scripts need migration before being used as release evidence for this UI. Do not interpret earlier canvas results as a current pass.


8 September globe-only TODO pass: production build and four geometry tests passed. The updated test:visual command runs the two globe suites; desktop/mobile publication and exact committed cell IDs, source reset, brush growth/removal/undo, image rotation and review round trips passed. Navigation checks cover 320x568, 390x844, 1024x768 and 1440x900 without pane overflow, claim zoom preservation, detail gating, double-click zoom and link arrival. Desktop/mobile screenshots were inspected. The current pass does not rerun the earlier 100,000-cell publication benchmark.

Loading transitions: run `node scripts/loading-qa.mjs`. It delays bootstrap/editor topology requests and checks desktop/mobile loading visibility, hidden startup HTML, ready-editor reveal and startup failure retry. Inspect artifacts/loading. Loader CSS is inline in index.html to cover the period before the app stylesheet arrives.

Exploration TODO 14-26: `node scripts/exploration-qa.mjs` checks company search, sample labelling, browser-persistent click counts, eased Home/rotation, tour HUD, hover IDs and outside dismissal on desktop/mobile. `globe-design-qa.mjs` additionally checks company metadata publication, feed entries and HUD pinning. Inspect `artifacts/exploration/` and `artifacts/globe-design/`. Dates remain session-only and click totals are browser-local; this does not validate production analytics or paid claims.

Compact HUD follow-up: exploration QA checks totals after reload, same-owner neighbouring clicks without card mutations (clicked ID is available only in development QA state), sample logos, unique search results and example feed rows. Design QA checks the published image thumbnail. Navigation QA checks claiming at altitude 0.98 and all four viewport widths. Inspect HUD and toolbar screenshots after CSS changes.

Artwork and camera polish: run `node --test scripts/artwork-camera.test.mjs` and `node scripts/artwork-camera-qa.mjs`. They cover arbitrary-angle containment, all four artwork corner markers through Review, low-resolution warnings, mobile HUD clearance, flight cancellation and reduced motion. Inspect `artifacts/artwork-camera/`. Existing globe design/navigation/exploration and streaming checks remain applicable.

Local Chrome performance comparison (desktop and emulated mobile, sample inventory, six fixed altitudes plus motion): median frame intervals remained approximately 16.7-16.9ms. Resident cache limits remained 128/64; no new render passes or texture-resolution increases. Desktop draw calls matched except one transient 63/64 reading while detail loaded. Static p95 varied between approximately 17 and 34ms across runs; this is not a universal no-regression claim. Baseline and after reports are in ignored `artifacts/performance-qa/before.json` and `report.json`; physical-device and million-occupancy stress certification were not repeated.

Activity/HUD/control changes: `node scripts/activity-hud-qa.mjs` checks desktop, mobile and tablet layout, single-button rotation, stable internal Nearby navigation and Escape/focus restoration, restored Home orientation, altitude-scaled drag speed and available-cell prompts. Inspect `artifacts/activity-hud/`. Streaming priority changes also require `node --test scripts/artwork-stream.test.mjs`; example metrics do not validate real view measurement.

Publication quality: run `node --test scripts/publication-detail.test.mjs scripts/artwork-stream.test.mjs`, `node scripts/publication-baker-qa.mjs` and `node scripts/publication-quality-qa.mjs`. These cover source-sized refinement, ancestor gutters, atomic failure, cube-seam publication, later adjacent placements, and 1/50/500-cell publication on desktop/mobile. Inspect `artifacts/publication-quality/`; the 50-cell text fixture compares published edge sharpness against Review. The report records publication duration, frame timing and cache bounds. Run `test:performance` in sample mode for overview/navigation comparisons; local Chrome results are not physical-device certification.

Durable staging publication: run `npm.cmd run test:staging-publication`. The live disposable journey verifies a 100,000-cell reservation, conflict and concurrent-expiry safety, private editable draft/original recovery, immutable content v2, durable owner reload, background publication, immutable R2 delivery, deletion/release and exact-cell reuse. It cleans up active test records and requires the ignored local QA secret; it does not validate payment, moderation or physical devices.
