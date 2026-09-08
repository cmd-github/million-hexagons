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
npm run test:visual
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
