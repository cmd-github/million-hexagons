# Million Hexagons

A prototype of a globe containing exactly 1,000,000 spherical polygon cells: 999,988 hexagons and 12 claimable pentagons. The sample catalogue occupies 344,500 actual cells. Visitors can explore campaigns and run a session-only placement flow.

The agreed product direction, staged purchase experience, technical rules, roadmap, and acceptance criteria live in [docs/PRODUCT-DELIVERY-PLAN.md](docs/PRODUCT-DELIVERY-PLAN.md). Treat that document as the source of truth for subsequent product work.

The [5 September 2026 release audit](docs/RELEASE-AUDIT-2026-09-05.md) records commercial and implementation blockers. The agreed plan now prioritises a low-friction purchase journey, exact preview/price integrity, usable mobile placement, and durable linked placements before a paid launch. These are delivery requirements; the current application remains a non-payment prototype.

## Run

```bash
npm install
npm run dev
```

`npm run dev` serves the live working copy locally; Firebase deployment does not change or replace this workflow.

## Firebase Hosting

The production build is hosted by the dedicated Firebase project `million-hexagons`. To publish the current working tree:

```bash
npm run deploy
```

The current deployment script builds the separate `coming-soon/` site into `coming-soon-dist/` and publishes that directory. `npm run build` continues to build the globe app into `dist/` for local preview. Firebase rewrites browser routes to `index.html`, avoids caching the HTML shell, and caches Vite's content-hashed assets. The custom production domains are `millionhexagons.com` and `www.millionhexagons.com`; DNS is managed at Hostinger.

## Placement studio and visual checks

The purchase prototype keeps Design → Place → Review. Logo is the recommended starting path; custom sizes and artwork adjustments expand when needed. Place suggests an available footprint automatically, with Find another spot and separate Move/Place controls. Paint includes undo/redo. Review and the globe now consume the same frozen artwork rendition and the camera frames the complete selected footprint. Review keeps its edit routes, validates optional HTTP(S) destinations, and adds a session preview without taking payment. Click a committed session placement to reopen its website action. Refresh still resets these previews; this is not durable ownership or real checkout.

In normal globe exploration, the discreet search control accepts a cell reference such as `#1` or `500000` and centres that cell (including the 12 pentagons). The control is intentionally separate from the placement studio and leaves room for named brand/location discovery later.

On mobile, exploration gives the globe its own region below the introduction. Place and Review reserve a separate canvas area above a scrollable bottom sheet; pointer coordinates and the camera use that actual canvas size. Desktop uses a separate studio sidebar. The grid is quieter during placement and the old decorative triangular wireframe has been removed.

`src/globe/topology.js` supplies the canonical polygon IDs, adjacency, picking and placement-local projections; `src/placements/geometry.js` computes bounds from those polygons. Flat previews and globe territories use the same raster artwork routine in `src/main.js`, including repeat and quarter-turn transforms. Committed and preview territories use an unlit, non-tone-mapped material to preserve advertiser colours. SVG uploads are rasterized before crop calculations to avoid browser source-rectangle inconsistencies.

Validation (start a dev/preview server first):

```powershell
npm run build
npm run preview -- --port 4181
# In another terminal:
$env:SMOKE_URL = 'http://127.0.0.1:4181'
npm test
npm run test:geometry
npm run test:visual
```

The visual journey runner writes screenshots to ignored `artifacts/visual-qa/` for inspection. It uses installed Chrome or Edge on Windows, falling back to Playwright's Chromium if available. Screenshots require human/agent review; passing navigation assertions does not itself establish visual quality. See [the redesign verification notes](docs/PURCHASE-REDESIGN-QA.md) for coverage and remaining release work.

## Rendering architecture

The separate live coming-soon globe repeats “Million Hexagons” and “Coming Soon” in coloured letter hexagons. Build it with `npm run build:coming-soon`; Firebase Hosting publishes `coming-soon-dist`. See [the focused release check](docs/COMING-SOON-WORDS-QA.md).

Grid outlines ease in over a broad projected-cell-size range with time-based opacity smoothing and an initial 0.8-second reveal. They do not fill or recolour the underlying surface. A subtle emissive floor keeps unoccupied regions readable on the dark side; exact geometry starts loading before the visible-detail threshold.

The tour mixes broad passes with selected individual-hexagon dives. Exact cell detail preloads during approaches so close views remain crisp.

The plane control starts an opt-in globe **Tour** generated afresh from current occupied inventory. It samples up to eight geographically varied claimed cells, mixes wide transitions with selected close-detail passes, and never chooses an empty close-up target. With no occupied inventory it stays at overview distance. Stop, Escape, manual globe interaction, other controls or resizing returns control to the visitor. Route selection yields during its inventory scan and reuses the lazy topology rather than adding per-frame work.

The versioned offline asset in `public/topology/` contains one million centres, shared polygon vertices, ordered polygon rings, reciprocal neighbours and areas. A 64-vertex degree-5/6 triangulation subdivided at frequency 127 gives exactly `(64 − 2) × 127² + 2 = 1,000,000` dual cells. Forty-eight degree-aware spherical spring iterations smooth the embedding without changing topology. This is a barycentric geodesic dual, not a latitude/longitude grid or a claim of perfectly regular equal-area hexagons.

Measured cell-area coefficient of variation is **4.30%**, with a **1.5825** largest/smallest ratio. Edge-length coefficient of variation is **7.734%**, with a **1.6332** longest/shortest ratio. IDs 1–1,000,000 and the 12 pentagon IDs are frozen in the v1 asset. See [the geodesic audit](docs/GEODESIC-MIGRATION-QA.md) for measurements, constraints and QA evidence.

The globe streams a six-level cube tile pyramid instead of retaining a mesh and texture for every advertiser. Each 512-pixel tile contains artwork clipped to the canonical polygons. Resolution selection evaluates the whole visible surface using projected pixel density before allocating downloads; traversal order and draw-call limits do not downgrade one side of the view. Target pages load directly, with cached ancestors used only while loading. Crisp replacements and anisotropic filtering avoid the old parent-image blur crossfade. The cache normally holds at most 128 pages on desktop or 64 on narrow screens, expanding only when the viewport's required set plus ten reserve slots exceeds that; it scales with screen demand, not advertiser count. Four concurrent requests bound image decoding. The sample-hq catalogue uses 2048-pixel logo sources and lossless WebP pages. Session publication writes lossless PNG pages atomically to IndexedDB and releases the temporary mesh and texture. Microcell edges use one bounded, incrementally rebuilt close-view patch. Picking intersects the mathematical sphere and walks actual polygon boundaries from a coarse seed lookup. GPU occupancy/colour textures are packed by ID; their rectangular storage has no geographic meaning.

Artwork is fitted in a placement-local gnomonic tangent frame and clipped to the purchased polygons. Flat design, review, globe preview and committed territory use those same IDs and coordinates. Moving a placement reassigns IDs through real adjacency and updates the flat draft; perfect planar translations cannot be preserved through a pentagon. Count and connectivity remain fixed. Moving to a different anchor resets the paint undo history; editing and undo within one location retain it.

Regenerate and audit the topology with Node (Python is unnecessary for normal regeneration):

```powershell
npm run build:topology
npm run test:geometry
```

The checked-in seed is frozen. `scripts/create-geodesic-seed.py` is an optional development tool requiring NumPy and SciPy to discover a new seed; running it changes the identity basis and must not be used for routine regeneration.

Focused visual tests require the dev server because their location controls are excluded from production:

```powershell
npm run dev -- --port 4180
# In another terminal:
$env:SMOKE_URL = 'http://127.0.0.1:4180'
npm run test:geodesic-visual
npm run test:geodesic-gestures
node scripts/geodesic-studio-qa.mjs
python scripts/measure-reference-logo.py  # Pillow; reads screenshots only
```

Screenshots and measured results go to `artifacts/geodesic-qa/`. Initial exploration loads a small bootstrap, compressed occupancy and artwork tiles. The exact topology loads on demand for close detail, search or creation: 17.2 MB losslessly packed, decoded in a worker to the unchanged 92 MB canonical buffer. Wheel, buttons and touch pinch use continuous altitude-relative zoom. See [streaming architecture and performance QA](docs/PERFORMANCE-QA.md) for workload limits and evidence. Payments, durable ownership and cross-session artwork persistence are still outside this prototype.

Regenerate runtime assets after topology/sample changes, with a dev server running for the artwork compiler:

```powershell
npm run build:runtime
$env:SMOKE_URL = 'http://127.0.0.1:4180'
npm run build:artwork
npm run build:artwork-million
npm run test:streaming
npm run test:performance
```

On the dev server, `/?millionLogos` selects the offline stress catalogue: one synthetic ID mark in each real cell. It is a rendering fixture, not a million uploaded source files or real advertisers. Generated artwork is served directly from disk in development, so new catalogues are available without restarting Vite; missing artwork returns HTTP 404 rather than the application HTML. Tile generation resumes existing output; remove the explicitly chosen output catalogue before rebuilding changed artwork. Normal visitors never download the whole pyramid. The stress catalogue and raw compiler inputs are excluded from production builds. Production ingestion must publish versioned tile pages and authoritative metadata from a server/object store; the current IndexedDB pages are session previews only.
