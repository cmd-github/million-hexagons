# Exact-count geodesic migration — 6 September 2026

## Implementation and inventory

The product renderer now uses an actual spherical polygon topology. The former 1,250×800 latitude/longitude grid, axial cell translation and global campaign atlas are removed. The remaining `SphereGeometry` is a shaded background, not an inventory surface. The dirty diff contained no surviving sine-of-latitude workaround; unrelated branding, coming-soon and deployment changes were preserved. No commit, push or deployment was performed for this task.

The frozen seed has 64 vertices and 124 triangular faces, with 12 degree-five and 52 degree-six vertices. It was discovered with deterministic Coulomb relaxation and a convex hull, then checked for those degrees; it is not a Fibonacci point set. The optional Python discovery tool is not part of the runtime or normal asset build.

Frequency-127 triangular subdivision preserves the original vertex degrees and assigns degree six to every new vertex. For a spherical triangulation, `V = F/2 + 2`, so subdivision gives `(64 − 2) × 127² + 2 = 1,000,000` vertices. Taking the barycentric spherical dual yields exactly the requested inventory. Forty-eight synchronous spherical spring iterations smooth the embedding while preserving all edges. The 12 degree-five stars have a larger spring rest length to keep their dual pentagons comparable in area; unconstrained smoothing would shrink them.

| Audited property | v1 result |
| --- | ---: |
| Claimable IDs | 1–1,000,000, contiguous and unique |
| Hexagons | 999,988 |
| Pentagons | 12 |
| Other polygon degrees | 0 |
| Shared polygon vertices | 1,999,996 |
| Shared edges | 2,999,994 |
| Euler characteristic | 2 |
| Unit-sphere surface area | 12.56637061430263 (4π within numerical precision) |
| Cell area, min / mean / max | 0.000008921370 / 0.000012566371 / 0.000014117748 steradians |
| Area coefficient of variation | 4.2981% |
| Area max/min | 1.5825 |
| Edge length, min / mean / max | 0.001618112 / 0.002215051 / 0.002642576 radians |
| Edge coefficient of variation | 7.7340% |
| Edge max/min | 1.6332 |

Frozen pentagon IDs: **1, 2, 10, 11, 12, 14, 41, 43, 45, 51, 56, 57**. They participate in picking, price, availability, selection, artwork and purchase exactly like the hexagons. Hover and the review count disclose pentagons.

These are near-uniform geodesic cells, not perfectly regular planar hexagons or exactly equal-area cells. The regression bounds are area CV below 5%, area max/min below 1.65, edge CV below 8.5%, and edge max/min below 1.7. The full audit checks every polygon centre, reciprocal neighbour and reverse shared edge, all degrees, total surface coverage, representative interior picking, and connected footprints through all 12 pentagons. Consistent oriented shared boundaries plus positive spherical areas and total area 4π rule out a missing or multiply covered region in this spherical embedding.

## Asset and runtime contract

`npm run build:topology` regenerates the asset from `scripts/data/geodesic-seed-64.json` with Node. The frozen JSON seed determines IDs. Do not rerun the optional Python seed discovery tool or change seed ordering for routine regeneration: doing so would require an inventory version migration.

`public/topology/geodesic-v1.bin` has a 32-byte little-endian header (`MHGEO001`, cell and shared-vertex counts), followed by the typed-array sections listed in the manifest: centres, shared vertices, ordered polygon-ring indices, neighbours, degrees and spherical areas. Indices inside the binary are zero-based; public claimable IDs are one-based. Pentagon flags are deterministically represented by degree five and persisted as IDs in the manifest.

Binary SHA-256: `9a5107c6ff56c89ba88f42760aeb472e63a70686ed4654ac77d011d4b8595a41`. The file is 91,999,984 bytes. The runtime validates the header, version and size; the test audit also verifies the checksum. Normal regeneration needs no geometry libraries beyond Node. Development used Node v24.15.0.

`src/globe/topology.js` supplies all cell boundaries, neighbour growth, local coordinates and picking. Pointer rays intersect the mathematical sphere, use the 64 original vertices as a coarse lookup, descend neighbouring centres, then walk actual polygon half-planes. Picking does not mistake barycentric boundaries for Voronoi bisectors and does not raycast a million objects.

The state textures are 1024×977 packed ID storage, with 448 unused slots; this rectangle has no geographic meaning. The renderer maintains one cached visible-cell patch, suppresses subpixel edges, softly fades the patch perimeter, and keeps close borders antialiased. Sample campaigns are 53 separate locally mapped bounded meshes covering 344,500 actual cells. Their coarse interiors are tessellated, while the polygon-union boundaries remain exact. User placements are merged polygon meshes. There is no global equirectangular artwork texture.

## Artwork and purchase behaviour

- Design, Place, Review and committed geometry use the same polygon IDs and a local gnomonic tangent frame. Artwork fits a safe rectangle inside the true polygon union and retains source aspect ratio, with existing scale, quarter-turn and repeat treatments.
- Moving a draft necessarily changes IDs. The connected footprint is reassigned through actual adjacency, then adopted back into the flat draft; Review and commit retain those exact IDs. The outline can change near pentagons. A globally unchanged planar hex translation through a spherical defect is impossible and is not simulated with coordinate warping.
- Paint uses actual cells. A distant paint click visibly fills a connecting path and updates the count; erasing cannot disconnect the footprint. Location changes reset the location-specific undo history. Design edits at one location retain undo/redo.
- Both polygon types cost $1 per cell in the non-payment prototype. There is no hidden inventory adjustment. Conflicts reject the whole placement; they do not trim its count.
- Camera framing aligns the chosen tangent frame face-on for review, including at the poles. Oblique exploration still has ordinary spherical perspective foreshortening.

## Visual and interactive verification

Standalone Playwright used installed Chrome because the in-app Browser exposed no available connection. Screenshots were inspected directly. The first inspection exposed a legacy opacity-zero wireframe still writing depth and creating radial lines; it was removed, and the corrected polar images were recaptured.

`scripts/geodesic-visual-qa.mjs` captures desktop 1440×1000 and mobile-emulated 390×844 views: equator overview; equator, north, south and pentagon close-ups; a neighbouring-hex footprint by a pentagon; and reference-logo placement, review and committed states at all five anchors. Each 150-cell journey asserts connectivity, identical Design/selection/Review IDs and the exact committed increment. Actual pointer hover is checked against the focused polygon ID.

The 3:1 rectangular fixture has four white fiducials. `scripts/measure-reference-logo.py` reads the captured pixels using Pillow; it does not modify screenshots. Across ten committed views, reconstructed aspect ratios range from **3.0126 to 3.0649** (maximum source-ratio error **2.17%**, including raster sampling and perspective). Screenshot inspection found continuous cells and artwork, no folded wedges, no polar rings, and no longitude seam.

`scripts/geodesic-gestures.mjs` exercises desktop drag/wheel and emulated mobile drag/pinch/tap, verifies actual clicked-cell placement, rejects an occupied polygon, recovers with another suggestion, and checks that Edit design retains the selected IDs. The initial close-view stationary frame sample was approximately 16.7 ms median and 17.3 ms p95 for both viewport sizes; Chrome reported approximately 130 MB JS heap. This is desktop Chrome, not a physical mobile benchmark. Screen captures from the interaction checks are retained with the matrix.

Artifacts are intentionally ignored under `artifacts/geodesic-qa/`: screenshots, `results.json`, `aspect-ratios.json`, and `gestures.json`. The existing studio suite writes its separate matrix under `artifacts/visual-qa/`.

## Final validation and remaining limits

- Production build passes; Vite reports the existing over-500-kB JS chunk warning (approximately 566 kB uncompressed).
- Final `npm run test:geometry` passes: all one million polygons audited, representative picking checked, and 1/50/150/400/10,000-cell connected footprints checked at both poles, the equator and every pentagon.
- Production `npm test` passes: upload, 180-degree logo, $150 review/commit and two-colour painting.
- Production `npm run test:visual` passes all 18 desktop/mobile journeys with no browser errors: Logo 1/50/150/400/500 cells, Colour 50/150/400, and Paint with Clear/Undo. Captures of repeat artwork, solid colour and painted review were inspected alongside the dedicated geodesic matrix.
- Six additional settled studio captures (`node scripts/geodesic-studio-qa.mjs`) pass after the shader ID-rounding correction: repeat/180-degree logo, colour and paint on desktop/mobile. They wait for panel transitions before capture and assert count, connectivity, Design/Review ID equality and exact commit increments. The production build was refreshed after that correction.
- The 92 MB topology is currently loaded as one asset. Measured heap is bounded and the million-cell tessellation is offline, but progressive/chunked delivery and slow-network loading remain performance work before commercial launch.
- Physical low-end Android/iOS devices, prolonged thermal/load behaviour, and a production-network transfer budget have not been certified. Emulated touch does not establish those results.
- Payments, durable drafts/ownership, cross-session artwork storage and backend inventory transactions remain out of scope. Session IDs from the old latitude/longitude prototype are not silently mapped into v1.
