# Validation

Run checks relevant to the changed area. A passing build or scripted assertion does not establish visual quality.

## Core checks

```powershell
npm run build
npm run preview -- --port 4181
# In another terminal
$env:SMOKE_URL = 'http://127.0.0.1:4181'
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
