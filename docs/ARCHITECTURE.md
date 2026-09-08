# Current architecture

## Runtime

The Vite/Three.js client is intentionally backend-free. `src/main.js` coordinates the interface and scene; focused globe modules live under `src/globe/`, and placement geometry lives in `src/placements/geometry.js`. Session placements and generated artwork pages use IndexedDB and reset on normal page exit. They are previews, not durable ownership.

The separately built `coming-soon/` site is the Firebase Hosting target. Its same-origin `/api/launch-signup` route rewrites to the `launchSignup` HTTPS Function, which validates and deduplicates addresses into the server-only `launchSignups` Firestore collection. The product globe builds into `dist/` for local preview.

## Cell topology

`public/topology/geodesic-v1.bin` is the frozen inventory basis. A frequency-127 subdivision of a 64-vertex degree-5/6 spherical triangulation produces exactly 1,000,000 dual cells: 999,988 hexagons and 12 pentagons. Public IDs are one-based and stable. Changing the seed or numbering requires an explicit inventory migration.

`src/globe/topology.js` is authoritative for polygon boundaries, centres, adjacency, picking, and local projections. The background `SphereGeometry` is not inventory. Picking intersects the mathematical sphere and resolves the actual polygon; the renderer never creates one scene object per cell.

The packed topology loads in a worker only when exact detail or interaction requires it. It transfers as approximately 17.2 MB compressed and expands to a 92 MB canonical buffer. GPU state textures are ID storage, not geographic UV maps.

## Artwork and placement

Design, Place, Review, and publication share exact polygon IDs and one placement-local gnomonic frame. Artwork is clipped to the true polygon union and retains its source aspect ratio. Placement projects a draft onto the same count through real adjacency; its outline may change near a pentagon. Placement never overwrites the editor anchor, source footprint, image, transform or cell overrides. Image fitting and drag offsets remain in the source editor frame when projected onto a destination, so relocation cannot shrink or recenter the image. Per-cell paint and transparency are applied after the source image and travel with their mapped cells.

The studio caches projected cells, artwork and exact polygon-union outlines. Interior edges cancel using the frozen ring/neighbour IDs, so rasterisation scales with the boundary. Cell grid strokes and picking regions are limited to visible detail; globe navigation never changes artwork. The interactive design surface is the globe; offscreen canvas rasterisation and the review canvas still generate artwork. Undo stores compact cell records with a 250,000-record budget. Relocation uses spatially indexed connected-frontier matching. Placement meshes use preallocated position/UV arrays rather than temporary geometry objects per cell.

Availability suggestions abort blocked candidates during connected growth and yield between batches. A requested 100,000-cell footprint is still rejected in full if it overlaps inventory; editor capacity does not imply inventory availability.

Published/sample artwork uses a six-face, six-level cube tile pyramid with 512-pixel interiors and gutters. The renderer chooses detail from projected pixel density across the complete visible surface, requests four pages concurrently, and uses cached ancestors only while target pages load. It uses crisp replacements and anisotropic filtering, without crossfading blurry parent imagery.

The normal cache target is 128 pages on desktop and 64 on narrow screens, expanding when the viewport-required set plus reserve exceeds that. It scales with screen demand, not advertiser count. Close grid geometry is one bounded, incrementally rebuilt patch.

Session publication bakes affected lossless pages atomically to IndexedDB and disposes temporary meshes and textures. Production publication will require validated source storage, background tile generation, immutable manifests, CDN delivery, authoritative placement metadata, and transactional inventory.

## Frozen invariants

- Exactly 1,000,000 claimable cells, including all 12 pentagons.
- One canonical ID/geometry/rendering contract across editing, pricing, picking, review, and publication.
- No latitude/longitude inventory, global artwork atlas, or one-object-per-cell renderer.
- Exact connected counts; conflicts reject rather than trim.
- Responsive visual quality and bounded resource use are product requirements.
