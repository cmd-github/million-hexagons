# Artwork streaming and zoom performance — 6 September 2026

## Quality correction following user screenshots

Small lighting adjustment: increased the background sphere's emissive intensity from 0.65 to 0.85 at the user's request for a slightly brighter south pole. Advertiser materials and grid opacity are unchanged. This is a minimum-light adjustment across the globe, most apparent in dark regions; visual acceptance is left to the user.

Grid follow-up: removed opaque available-cell fill from the detail patch, which previously appeared as a bright circular surface over a near-black background. Outlines alone now fade across a broader 1.5–8 projected-pixel range, with 0.3-second time-based smoothing and a 0.8-second first-geometry reveal. Geometry preloads at altitude 3.5 rather than 1.8; overview remains lazy. A subtle emissive base lifts dark unoccupied regions without altering advertiser materials. Focused south-pole screenshots at altitudes 2, 1.2 and 0.7 completed without page errors; the middle view was inspected. Build passed with the existing chunk advisory. Broad regression suites were not repeated.

Startup follow-up: port 5173 returned application HTML for the newly generated sample-hq manifest because the ignored artwork directory was absent from Vite's cached public-file index. Development middleware now serves artwork from its current filesystem state and returns real 404s for missing assets. Verified port 5173 returned the JSON manifest and reached a rendered globe with the loading indicator removed and no page errors. No broad suite was repeated for this development-server-only fix.

The original depth-first 20/36-leaf budget could permanently starve half the viewport, while mandatory ready siblings and retained ancestor chains prevented refinement. Those budget-based quality choices are removed. The renderer now selects the complete target set from projected texel density and tighter surface bounds, then requests those pages directly. Each target patch uses its best cached ancestor only until its own texture arrives. Parent-image crossfades are removed; anisotropic filtering is enabled. Resolution changes never deliberately substitute a blurry region to satisfy a draw-call cap.

Cache capacity is normally 128 pages on desktop or 64 on narrow screens, growing to the screen's required page count plus ten reserve slots if necessary. It remains independent of inventory size. At 1440×1000, a focused cube-seam fixture required 42 level-4 pages; a close view required 12 level-5 pages. Both reached zero fallback pages and zero pending requests/errors. Screenshots were inspected at `artifacts/artwork-quality/`. A lightweight 84-camera-position selection sweep required at most 73 pages. These are focused quality checks, not a new broad performance certification.

Sample logos are rebuilt from 2048-pixel sources instead of 512, into a separate `sample-hq` catalogue using lossless WebP throughout the pyramid. Uploaded rasters retain up to 4096 pixels, SVGs rasterize at 3072, and the shared preview/publication rendition now allows 3072 pixels instead of 1536. Session publication encodes lossless PNG pages. Sharp cached descendants remain visible during zoom-out while parent pages load. The old sample catalogue is excluded from production output. Existing million-fixture pages are reused. Any raster still has a finite source-resolution ceiling; mip filtering remains necessary when artwork becomes subpixel.

The measurements and architecture below describe the earlier implementation and are retained as historical evidence. Its 72/40-page budgets and crossfades are superseded by this correction.

Correction validation: all 8,190 sample-hq pages regenerated; inspected the rebuilt Coca-Cola logo with 50 required pages and zero fallback/pending/error counts. Four streaming/codec/zoom tests and one purchase smoke journey passed. Production compilation passed (555.31 kB main bundle, 144.40 kB gzip; existing chunk-size advisory remains). No broad repeat of the earlier visual/performance suites was performed, following the user's usage constraint.

## Implemented architecture

- A cube-gnomonic pyramid has six faces and six resolution levels (0–5), with 512-pixel WebP interiors and two-pixel gutters: 8,190 pages per complete catalogue. The imagery is compiled from the actual geodesic polygons; this does not replace or warp the inventory topology.
- `ArtworkTiles` fetches only the needed pages with four concurrent downloads. The hard cache cap is 72 pages on desktop and 40 below 700 CSS pixels; visible-leaf budgets are 36 and 20. GPU textures include mipmaps. Eviction disposes geometry/material/texture and closes the decoded bitmap. Resident texture estimates exclude browser/driver overhead and decoded bitmap storage.
- Ready parent imagery remains until children are ready. A 240 ms parent-to-child texture crossfade softens detail changes. Wheel, pinch and buttons change camera altitude continuously with time-based damping, instead of applying large steps to the full globe-to-camera radius.
- Exact grid patches are built in approximately 2 ms CPU slices, with a bounded angular extent. No per-cell scene objects are created by the visitor renderer.
- Overview needs only bootstrap, occupancy and visible artwork. The 92,000,000-byte-class canonical topology downloads on demand as a 17,205,675-byte lossless packed gzip, then decodes in a worker. IDs and Float32 coordinates are bit-identical. Close artwork can stream while exact picking/detail prepares.
- Session publication uses the same exact preview mesh and artwork transform to bake affected pages at every level. Prepared pages are committed atomically to IndexedDB; failure leaves the design editable. The publication mesh/texture is disposed. This avoids one retained GPU resource set per confirmed placement.

## Million-cell fixture and reproducibility

`scripts/build-artwork-tiles.mjs million` compiles one independently identified synthetic mark per actual claimable polygon, including all 12 pentagons. This exercises a fully occupied, varied image pyramid. It does **not** test uploading or storing a million arbitrary originals. The runtime page budget is independent of original image count; source complexity influences compressed tile sizes and offline generation cost.

Run the commands in README with a dev server. The compiler uses installed Chrome/Edge, Three.js and Sharp, and resumes existing tile output. Delete the chosen catalogue before regenerating altered artwork; do not mix old and new content. Offline generation is intentionally separate from visitor startup. `test:performance` writes cold-load/resource measurements, six camera-altitude samples and desktop/mobile screenshots to `artifacts/performance-qa/`. Inspect these images alongside the purchase and geodesic QA outputs.

## Deployment boundary

This is a bounded client renderer and a local artwork compiler, not a production upload service. A commercial deployment still needs source-image validation/storage, background generation of affected pages, immutable versioned manifests/CDN cache headers, authoritative reservations/ownership and per-placement metadata lookup. Do not send a million placement records or original logos to each visitor. The session IndexedDB store is removed on normal page exit; it is not durable ownership, and a crashed page can leave an orphaned temporary database.

Lazy topology still consumes 92 MB once needed, in addition to rendering memory. Slow networks delay exact selection, although they do not block globe movement or already loaded artwork. Desktop Chrome with a mobile viewport does not establish physical low-end phone performance. No universal frame-rate or network-load guarantee is made.

## Validation evidence

The focused desktop sample run measured about 16.9 ms median frame intervals and 17.1–17.2 ms p95 across six zoom distances. First artwork appeared in approximately 1.26 seconds on the local development server; overview JavaScript heap was about 20 MB. These measurements predate the final removal of the unused purchased-colour texture, and are not million-logo or physical-phone benchmarks.

Completed checks: three full-topology geometry tests, three streaming/zoom/codec tests, browser smoke, 18 desktop/mobile purchase journeys, desktop wheel/drag and mobile pinch/drag including conflicts, and six settled logo/colour/paint review journeys. The geodesic location runner wrote ten placement results. Inspected overview seams, committed reference logos at the equator/north/pentagon, and mobile review/paint views; final user visual acceptance remains outstanding.

Both complete 8,190-page catalogues have been generated. The million-cell performance matrix has **not** been run to completion. At the user's request to reduce usage and avoid further testing, leave that optional matrix and additional visual exploration to user QA. Run `npm run test:performance` against a restarted dev server when wanted. The stress catalogue is ignored by Git and excluded from production builds, along with unneeded raw topology/compiler inputs.

Final production build passed. The main JavaScript bundle is 555.20 kB (144.34 kB gzip); Vite still reports its standard 500 kB chunk warning. Verified that the sample catalogue and packed topology are present in `dist`, while the million-cell stress catalogue is excluded. `git diff --check` passed. Changes remain uncommitted and unpushed under the user's earlier explicit working instructions.
