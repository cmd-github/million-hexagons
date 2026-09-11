# Exact regional geometry

The visitor app no longer downloads `geodesic-v1.packed.gz`. It reads a small immutable manifest and a 78,028-byte compressed ID-to-region index, then fetches only the camera region or the regions needed for a requested footprint. Overview startup still renders without exact geometry or inventory readiness.

## Frozen identity

`scripts/build-topology-regions.mjs` partitions the existing canonical binary into 1,536 spherical cube regions. It refuses a canonical checksum mismatch. It does not run the seed, subdivision, relaxation or sample compiler.

Canonical SHA-256: `9a5107c6ff56c89ba88f42760aeb472e63a70686ed4654ac77d011d4b8595a41`.

Every region retains the original permanent cell IDs, ordered global neighbour IDs, shared vertex IDs, Float32 centre/corner bits, polygon degrees and areas. Local vertex indices are delivery addresses only. `placementId`, topology namespace, ownership, reservation membership and saved image transforms are unchanged. Region compression is lossless byte-plane delta coding; runtime validates length and SHA-256 before decoding.

## Runtime behaviour

- `RegionalTopology` provides the same exact geometry operations as the canonical implementation. Shared frame/projection/connected-footprint methods keep Design, Place, Review and purchased artwork aligned.
- A click starts from the nearest centre in its cube region, then walks the actual oriented polygon boundaries. Missing data remains unavailable; it is never approximated as another cell or as free inventory.
- Camera detail loads a conservative spherical cap with neighbouring-region padding. Flights prefetch their destination and avoid transient wide-view requests. Old visible geometry stays while the replacement patch loads.
- Direct ID links load the containing region before navigation. The manifest includes exact centres for existing sample landmarks; ranking/tour preparation does not fetch the whole globe.
- Footprint sizing, relocation and brushes explicitly prepare their required regions. Large purchases can require more than the visible cap; they still use the same exact partitions, with no monolithic fallback. Pure graph operations can retry after a missing region arrives.
- Authoritative inventory restores independently of artwork. Purchased high-resolution geometry is prepared when its footprint intersects the view; failed artwork-region loads retry. Existing artwork clipping and UV generation remain shared with editor publication.

## Cache and failure handling

Four region downloads can run concurrently; duplicate requests share one promise. Each request times out after 15 seconds and failed requests are retryable. Application caches hold one immutable release: one index plus up to 192 compressed regions. Same-length corruption fails checksum validation and refetches; denied/quota-limited storage falls back to network. Ordinary immutable HTTP/CDN caching remains enabled.

Decoded regions use an LRU working set of 192 regions; active design, selected/inspected cells and undo/redo history pin their required regions. A large active footprint can exceed the default working-set count. Two Uint16 arrays use 4 MB for region and local-offset lookup, replacing the always-resident 92 MB canonical buffer. The artwork texture budget is separate.

## Build and verification

```powershell
npm.cmd run build:regions
npm.cmd run test:regions
npm.cmd run test:deployment
npm.cmd run dev -- --port 4180
# Another terminal
npm.cmd run test:regional-browser
```

The exhaustive regional test compares all 1,000,000 cells against the canonical source. Additional tests cover pole/seam/pentagon picking, connected footprints, artwork projection inputs, deduplication, failures, eviction and the deployment allowlist. Regional browser tests measure cold/warm close-ups with 10 Mbps bandwidth, 80 ms latency and mobile 4x CPU throttling, and compare exact design/selection IDs through Review at 1,500 and 100,000 cells. The timing test starts after the overview is ready to avoid treating Vite development-module loading as production startup.

Physical iOS/Android performance remains a release gate. CPU throttling and viewport emulation do not certify phone GPU speed, memory pressure or mobile-network variability. Measurement results belong in [the performance audit](GLOBE-PERFORMANCE-AUDIT.md).
