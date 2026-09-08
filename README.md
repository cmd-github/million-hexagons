# Million Hexagons

A Vite/Three.js prototype of one shared advertising globe containing exactly 1,000,000 claimable spherical cells: 999,988 hexagons and 12 pentagons. Visitors can explore sample campaigns and complete a session-only Design -> Place -> Review journey. The application does not yet take payment or provide durable ownership.

Current product requirements are in [the product contract](docs/PRODUCT-DELIVERY-PLAN.md). See [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), and [validation](docs/VALIDATION.md) for focused guidance.

## Run

```powershell
npm install
npm run dev
```

Build and preview the product globe:

```powershell
npm run build
npm run preview -- --port 4181
```

## What is implemented

- Exact, versioned one-million-cell geodesic topology with stable IDs and claimable pentagons.
- Sample advertising inventory, cell search, hover details, bounded zoom, and an opt-in inventory-driven Tour.
- One Design -> Place -> Review journey for images, colour-only artwork, and mixed designs.
- A shared right-hand studio carries Design, Place and Review with consistent navigation and controls. Image options and extra cell actions share one menu.
- Compact, canvas-first editor for 1-100,000 cells: Add image, exact size and background in one row; contextual Image/Paint/Cells/Pan tools, per-cell transparency and undo/redo. The design pane fits without scrolling on desktop and mobile. Large footprints have canvas zoom/pan and automatically zoom to editable cells. Transparent cells retain their count and price.
- Image framing: maximum contained fit, 50-400% zoom with cell clipping, drag positioning, and a separate hexagon editing mode. Reset logo restores the original framing.
- Shared polygon IDs and artwork mapping across flat preview, globe preview, review, and session publication.
- Suggested available locations, separate Move/Place controls, conflict rejection, undo/redo, and responsive desktop/mobile layouts.
- Lazy exact-topology loading and viewport-driven artwork tile streaming rather than one object or source image per advertiser.

Session previews use local browser storage and reset; they are not purchases. Accounts, authoritative inventory, payment, moderation, durable artwork, and customer recovery remain future transactional work.

## Validation

The common suite requires a preview server:

```powershell
npm run preview -- --port 4181
# In another terminal
$env:SMOKE_URL = 'http://127.0.0.1:4181'
npm test
npm run test:geometry
npm run test:visual
```

Screenshots are written beneath ignored `artifacts/` directories and require inspection. Additional topology, gesture, streaming, performance, and asset-generation commands are documented in [docs/VALIDATION.md](docs/VALIDATION.md).

## Hosting

Firebase Hosting currently publishes the separate `coming-soon/` site, not the product globe. Its launch signup posts to the `launchSignup` Firebase Function, which stores deduplicated addresses in the server-only `launchSignups` Firestore collection.

```powershell
npm run build:coming-soon
npm --prefix functions install
npm --prefix functions test
npm run deploy
```

The output directory is `coming-soon-dist/`. The configured production domains are `millionhexagons.com` and `www.millionhexagons.com`; DNS is managed at Hostinger.

## Architecture map

- `src/main.js` — product UI and scene coordination
- `src/globe/` — topology loading, picking, detail, artwork tiles, zoom, samples, and tour
- `src/placements/geometry.js` — placement bounds and shared geometry calculations
- `public/topology/` — frozen topology and sample/runtime data
- `scripts/` — builders and automated browser/geometry checks
- `coming-soon/` — independently built public holding site

Routine topology regeneration uses Node. The optional Python seed-discovery script changes the inventory identity basis and must not be used without an explicit migration decision.
