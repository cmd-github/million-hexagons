# Million Hexagons

A performance-first prototype of a globe containing exactly 1,000,000 logical hexagonal advertising cells. Half the inventory is mock-sold. Visitors can explore campaigns and run a mock placement flow.

The agreed product direction, staged purchase experience, technical rules, roadmap, and acceptance criteria live in [docs/PRODUCT-DELIVERY-PLAN.md](docs/PRODUCT-DELIVERY-PLAN.md). Treat that document as the source of truth for subsequent product work.

The [5 September 2026 release audit](docs/RELEASE-AUDIT-2026-09-05.md) records commercial and implementation blockers. The agreed plan now prioritises a low-friction purchase journey, exact preview/price integrity, usable mobile placement, and durable linked placements before a paid launch. These are delivery requirements; the current application remains a non-payment prototype.

## Run

```bash
npm install
npm run dev
```

## Placement studio and visual checks

The purchase prototype keeps Design → Place → Review. Logo is the recommended starting path; custom sizes and artwork adjustments expand when needed. Place suggests an available footprint automatically, with Find another spot and separate Move/Place controls. Paint includes undo/redo. Review and the globe now consume the same frozen artwork rendition and the camera frames the complete selected footprint. Review keeps its edit routes, validates optional HTTP(S) destinations, and adds a session preview without taking payment. Click a committed session placement to reopen its website action. Refresh still resets these previews; this is not durable ownership or real checkout.

In normal globe exploration, the discreet search control accepts a cell reference such as `#1` or `500000` and centres that logical hexagon. The control is intentionally separate from the placement studio and leaves room for named brand/location discovery later.

On mobile, exploration gives the globe its own region below the introduction. Place and Review reserve a separate canvas area above a scrollable bottom sheet; pointer coordinates and the camera use that actual canvas size. Desktop uses a separate studio sidebar. The grid is quieter during placement and the old decorative triangular wireframe has been removed.

`src/placements/geometry.js` defines shared compact footprints and parity-safe hex translation. Flat previews and globe territories use the same raster artwork routine in `src/main.js`, including repeat and quarter-turn transforms. Committed and preview territories use an unlit, non-tone-mapped material to preserve advertiser colours. SVG uploads are rasterized before crop calculations to avoid browser source-rectangle inconsistencies.

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

The million cells are logical addresses, not one million DOM or Three.js objects. A campaign atlas supplies the advertising artwork while a procedural GPU shader draws resolution-independent hexagon edges. Pointer coordinates map deterministically to cell IDs. Because this is a mapped interactive surface rather than a literal geodesic polyhedron, no visible pentagonal correction faces are needed.

The renderer uses distance-based detail: the micro-grid is suppressed when its cells would be smaller than a screen pixel, eliminating full-globe shimmer, then fades into a connected HD honeycomb while zooming. Individual occupied cells resolve to consistent campaign marks, while purchased territories can carry one logo continuously across many cells.

Available inventory uses an almost-black midnight-blue globe treatment with a restrained, camera-fixed cobalt hotspot, a gently lifted south pole, and an electric-blue Fresnel light attached directly to the globe surface. Available cells are restored after artwork sampling so neighbouring advertiser colours cannot bleed across territory boundaries. This treatment does not add continent geometry or recolour advertiser artwork, purchased placements, or placement-state overlays.

The seeded marketplace preview uses recognisable brand marks from Simple Icons alongside repeated placements and deterministic connected clusters of 20–50 cells. These brands are visual examples only and do not imply participation or endorsement.

Logo placement accepts PNG, JPG, WebP and SVG files up to 4 MB. Small campaigns use high-resolution hex-clipped meshes rather than the coarse world atlas. Buyers choose Logo, Solid Colour, or Paint; create the artwork in a flat hex-mosaic editor; position the completed design on the globe; and review the exact result before adding it.

Uploaded artwork has unused outer margins trimmed automatically, retains its aspect ratio, and defaults to one logo spread across a compact territory proportioned to the artwork. The logo is fitted into a safe rectangle inside the actual hex mask, so its complete content remains visible from a single hexagon through custom large footprints. In the flat preview, buyers can click an outlined neighbouring hexagon to add it or click a removable edge hexagon to remove it; the connected footprint, live quantity, price, globe preview, review and committed placement all update together. Buyers can instead repeat the logo inside every hexagon. Purchased territories are merged into one draw call so even hundreds of image-mapped cells remain efficient.

Buying mode moves into a close selection distance and uses an adaptive light/dark high-contrast grid over every campaign colour. Uploaded artwork is aligned to geographic north so its default orientation stays upright around the globe, with manual quarter-turn and upside-down controls when needed.

The purchase flow separates design from location. Detailed editing happens in a flat hex canvas. During placement, Move globe enables rotation and Place design turns the globe surface into an unambiguous location target; wheel or pinch continues to zoom in both modes. A one-million-cell GPU occupancy mask gives available, purchased and selected tiles distinct states regardless of advertiser colour, and pointer selection uses the same nearest-hex calculation as the rendered grid. Selection colours are written directly into exact cell-addressed shader data, eliminating alignment drift.
