# Million Hexagons

A Vite/Three.js prototype of one shared advertising globe containing exactly 1,000,000 claimable spherical cells: 999,988 hexagons and 12 pentagons. The default local build supports session-only Design -> Place -> Review. Staging supports durable placements, Stripe test checkout and verified-owner artwork editing. The default runtime has no baked demo brands; staging test brands use the durable placement pipeline and verified-owner editor. See [editable test brands](docs/EDITABLE-TEST-BRANDS.md) for rollout status and setup.

Current requirements are in [product direction](docs/09-09-26-PRODUCT-DIRECTION.md); [STATUS](docs/STATUS.md) tracks current work. See [architecture](docs/ARCHITECTURE.md) and [validation](docs/VALIDATION.md) when relevant.

The [development-to-production plan](docs/PRODUCTION-PLAN.md) reviews the proposed Cloudflare/Firebase split and defines the implementation sequence and launch gates.

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
- Interruptible camera travel, complete-advert tour framing, arrival HUDs and mobile clearance; reduced-motion navigation is immediate.
- Placement inventory, company/hex search, contextual hex IDs and hover details, bounded zoom, and an opt-in inventory-driven Tour.
- Globe-only editing of the exact footprint: start from an available cell, grow around neighbours, or choose Design in this space during placement.
- Placement inspection with explicit website visits, nearby exploration, a pinnable HUD, tour-stop details and shareable cell-location links.
- Placement names, descriptions, artwork thumbnails, intentional website visits and a feed of restored placements. Staging statistics and owner analytics use authoritative placement and event data.
- One Design -> Place -> Review journey for images, colour-only artwork, and mixed designs.
- A shared right-hand studio carries Design, Place and Review with consistent navigation and controls. Image options and extra cell actions share one menu.
- Compact globe-only editor for 1-100,000 cells: Add image, exact count, background colour, image zoom/rotation, separate Add/Remove brushes, paint/transparency and undo/redo. Fresh placements start clean; editing preserves the draft. Transparent cells retain count and price.
- Image framing: rotation-aware contained fit, low-resolution upload preflight, 50-400% zoom with cell clipping, drag positioning, and a separate hexagon editing mode. Reset logo restores the original framing.
- Shared polygon IDs and artwork mapping across flat preview, globe preview, review, and session publication.
- Suggested available locations, separate Move/Place controls, conflict rejection, undo/redo, and responsive desktop/mobile layouts.
- Exact regional topology loading: a 78 KB compressed ID index and immutable geometry partitions replace the 17.2 MB whole-globe download. Picking, purchased artwork and editing share the frozen boundaries. See [regional geometry](docs/REGIONAL-GEOMETRY.md).

Local session previews are not purchases. Staging has accounts, authoritative inventory, test payments, moderation, durable artwork and customer recovery; production launch remains gated in [STATUS](docs/STATUS.md).

## Validation

The common suite uses a development server for the exact-cell QA hooks:

```powershell
npm run dev -- --port 4180
# In another terminal
$env:SMOKE_URL = 'http://127.0.0.1:4180'
npm test
npm run test:geometry
npm run test:visual
```

Screenshots are written beneath ignored `artifacts/` directories and require inspection. Additional topology, gesture, streaming, performance, and asset-generation commands are documented in [docs/VALIDATION.md](docs/VALIDATION.md).

## Hosting

The product globe has a separate [Cloudflare staging workflow](docs/STAGING.md): `npm run build:staging`, `npm run upload:staging`, then `npm run deploy:staging`. It pins an immutable R2 runtime release and retains session-only preview behaviour. One-time account setup and local validation are documented there.

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

To rebuild delivery partitions from the existing frozen topology, run `npm.cmd run build:regions`, then `npm.cmd run test:regions`. This verifies the canonical checksum and copies exact geometry without rebuilding the topology. Do not regenerate the seed or canonical topology without an explicit migration decision.

Published uploads retain close-up detail through source-sized, sparse tile refinement, with the same bounded streaming cache and no retained placement meshes.

Exploration includes understated global metrics rotating every 14 seconds, SVG activity icons, and faint background hexagons. The HUD swaps details for a Nearby view with Back/Escape support without resizing. Sample views and highlights are illustrative; newly published previews show an unmeasured view count and browser-local website visits. Directional rotation uses one button, with slower close-range dragging.

Artwork scalability is an active launch blocker. The opt-in snapshot lifecycle, compiler worker, measured limits and reproduction commands are documented in [artwork performance](docs/ARTWORK-PERFORMANCE.md); the live site still uses the existing placement layer.
