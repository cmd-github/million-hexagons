# Artwork performance — 11 September 2026

**Launch blocker remains open.** Snapshot publication and application integration are implemented behind `VITE_ARTWORK_SNAPSHOTS=true`, but have not been deployed. Dense-image latency, the hosted compiler service and physical-device acceptance remain release gates. The live site still uses its existing renderer.

## Continuation — 12 September 2026

Recovered the interrupted work from `million-hexagons-fixture-release` on branch `artwork-performance-investigation`; the separate UI branch is untouched.

- Purchases, published versions, moderation and deletions record an artwork revision in the authoritative transaction. The compiler claims a renewable lease, rejects a catalogue that changes during export, uploads immutable checksummed objects and activates a release transactionally. Changes arriving after export remain deltas. Expired workers cannot activate.
- The opt-in globe starts with visible snapshot tiles and a fixed occupancy bitset. Regional ownership supports inspection; prefix search uses a bounded server query. Inspected metadata is bounded to eight placements. No full catalogue is requested at snapshot startup.
- Deltas are limited to 32 placements, 100,000 cells, five minutes of age, 12 MiB per image and 16 million decoded pixels in total. Old baked artwork is covered before replacements appear. Unverified/overflowing state hides artwork until a valid release returns; it does not silently continue displaying stale artwork. State polling is five seconds with a two-second public edge cache, so this is not instantaneous push invalidation.
- Pixel assertions cover deletion and red replacement artwork on desktop/mobile. The connected journey also checks shared links, occupancy restoration, state-service outage/recovery, an actually failed replacement manifest, and rollover with obsolete delta meshes removed. Activation rechecks release identity and feed completeness. These are controlled HTTP/browser tests, not a live payment-to-compiler acceptance run.
- Publication decodes PNG/WebP, rejects a declared-format mismatch, limits input to 40 million pixels and retains private originals. Public canonical WebP retains source dimensions; overview and thumbnail renditions are bounded to 1024px and 256px. Tile encoding accepts lossy output only with unchanged alpha, maximum channel error eight and mean squared error at most four; otherwise it keeps lossless output. This does not establish that dense imagery meets the latency budget.

Validation artifacts: `artifacts/snapshot-lifecycle/report.json` and desktop/mobile screenshots. Backend suite: 48 tests. Snapshot/encoding/edge, streaming, detail and deployment suites pass. Production and snapshot-enabled staging builds pass; Wrangler dry run passes. The older timing table below remains historical, not a new end-to-end claim.

The rebuilt identical 20-record catalogue produces 846 tiles totalling 32,086,466 bytes, down from 34,615,624 bytes (7.3%). Isolated cold renderer: desktop preview 1.08 s / full overview 1.32 s; constrained mobile preview 4.18 s / full overview 5.64 s. Repeat mobile: 1.92 s / 2.68 s. Mobile used the same 4× CPU, 1.6 Mbps, 150 ms, DPR 2 setup described below. These single runs do not show a latency win; mobile still misses the preview budget. Output and inspected overview/detail/seam/pole screenshots are in `artifacts/snapshot-quality/`. This sparse catalogue does not replace dense mixed-image acceptance.

Desktop/mobile owner editing and public links passed. Persistent checkout passed desktop/mobile/reduced-motion after correcting its stale expectation that ordinary startup automatically opens the latest placement: all three variants now use an explicit cell link. This preserves reduced-motion coverage and the intended overview startup. The independent UI branch's mobile layout corrections are not included here.

### Compiler operation and activation gate

The trusted staging worker uses existing ignored staging settings through `scripts/staging-release.mjs`; credentials are never public assets. After deploying the supporting functions, `node scripts/publish-artwork-snapshot.mjs` performs one leased compilation; `node scripts/artwork-compiler-worker.mjs` repeats with retry. Run the latter under a service manager with restart-on-failure. No hosted service has been configured in this change.

Build the optional client with `VITE_ARTWORK_SNAPSHOTS=true` only after a valid snapshot is available. The Worker serves `/api/artwork/state`; it must be deployed with the client. A normal build without the flag keeps the existing path. Rolling the client back to the preceding release disables this new path without changing ownership or private originals.

Before deployment, execute `scripts/artwork-scale-matrix.json`: 1k/10k/100k/1M varied-image catalogues, cold/repeat sessions, purchase/edit/moderation/rollover, corrupt/missing assets, ten-minute navigation and physical iOS/Android. This is a prepared test specification; the datasets and device results do not yet exist. Release requires measured preview/sharp-detail budgets and total memory evidence, not only tile-cache estimates.

## Findings and measurements

The live path downloads the placement catalogue, starts an image for every record (including offscreen records), loads exact geometry and retains a mesh/texture for each visible placement. An early globe frame is not artwork readiness.

Cold-load observations from this run (single runs, not percentiles):

| Path | Desktop full overview detail | Constrained mobile full overview detail | Mobile complete preview |
| --- | ---: | ---: | ---: |
| Existing application, 18 public placements | 6.97 s | 25.15 s | Not measured separately |
| Isolated snapshot renderer, 20 public placements | 1.44 s | 5.04 s | 4.32 s |
| Isolated million-cell synthetic atlas, progressive previews | 1.65 s | 13.44 s | 4.19 s |

Mobile simulation: Chrome, 390 × 844, 4× CPU slowdown, 1.6 Mbps downstream, 150 ms latency. Snapshot tests use DPR 2; the baseline audit used DPR 1. Local production bundles are gzip served; the existing path requests real staging services/assets. Snapshot tests deliberately disable account/catalogue startup, so these figures isolate rendering and are **not an end-to-end speedup claim**. The live catalogue changed during investigation, explaining the different placement counts.

Dense testing uses one distinct synthetic 20-bit mark per canonical cell, not one million real photographs. Without progressive previews its constrained-mobile full overview took 17.67 s. Preview delivery reduces blank time but does not satisfy sharp-detail latency. Dense image bytes remain a release issue.

Evidence (ignored, local): `artifacts/artwork-readiness/report.json`, `artifacts/snapshot-render/report.json`, `artifacts/snapshot-million/report.json` and adjacent desktop/mobile screenshots. The sparse snapshot is `ad5b7baeea826adfe203d70d0c055f16a5cbc0ae35fa411328f1894dcc03531c`: 20 placements, 846 tiles, 34,615,624 tile bytes. Only visible tiles transfer at startup.

## Implemented

- Offline compiler reads real public placements, preserves exact canonical polygons and bakes lossless WebP tiles with projected gutters. Private editable originals and placement identity remain authoritative elsewhere. Image batches have count, decoded-pixel and cell budgets; one oversized source can exceed the batch target, bounded by the 40-million-pixel input limit.
- Sparse tile lookup uses a fixed 1 MiB uncompressed quadtree bitset, independently of placement count, with checksum validation. Ancestor previews progressively become full-resolution tiles. Empty siblings are transparent. Runtime cache limits remain 64 tiles on mobile / 128 on desktop instead of growing with demand.
- Separate fixed occupancy bitset and region ownership tables are emitted and connected to application inventory in the opt-in runtime.
- Shared placement links fetch their target directly. Desktop/mobile tests deliberately withhold the catalogue until the target inspector opens. My Globe save/reload, locked cells and artwork edits pass using a valid permanent-ID fixture.
- Compiler export supports paging and refuses an apparently truncated legacy response. The leased publication script checks the transactional revision before accepting the export; a changed export must retry.
- Pure lifecycle contract tests cover superseded versions, deletion/rollback, stale feeds and activation readiness. The additional connected browser coverage is described above; real hosted lifecycle acceptance remains outstanding.

Browser inspection covered desktop/mobile overview, close artwork, poles and seams; close artwork retains the published source's detail. Sparse seam locations without artwork test geometry, not cross-seam image quality. Tile memory assertions pass, but reported texture estimates exclude total browser/GPU memory. Existing UI styling is outside this work and has concurrent changes in another checkout.

Initial investigation validation: 39 backend tests, 16 snapshot/streaming/detail tests, 9 deployment tests and desktop/mobile My Globe/public-link journeys. The continuation above adds connected failure and rollover coverage. Physical devices and production snapshot CDN delivery remain unverified.

## Required before activation

1. Configure and verify the hosted compiler worker, including process restart, lease expiry and immutable CDN delivery. Do not use the offline compiler alone to activate releases.
2. Exercise the real purchase/publication/edit/moderation lifecycle against the worker, including concurrent changes and overflow. Browser mocks and transaction tests are preparatory evidence.
3. Verify picking, search, inspector and purchase conflicts against deployed regional indexes and authoritative backend inventory.
4. Meet both preview and sharp-detail budgets with dense varied imagery. Preserve uploaded originals, generate validated public derivatives and provide inspection detail when overview tiles cannot supply sufficient source pixels. More pixels cannot recover detail absent from the original upload.
5. Run end-to-end 1k/10k/100k/1M varied-image workloads, download/decode failures, long navigation/eviction sessions and physical iOS/Android testing. Suggested gates from the review: meaningful view <2 s desktop / <4 s mobile; targeted sharp inspection <5 s on ordinary mobile; explicit bounded memory. These gates are not met yet.

## Reproduction

Use `npm.cmd` on Windows. All compiler output remains under ignored `artifacts/`; these commands do not publish a snapshot:

```powershell
node scripts/artwork-readiness-qa.mjs
node scripts/build-artwork-snapshot.mjs
node scripts/snapshot-render-qa.mjs
node --test scripts/snapshot-*.test.mjs
```

For the existing generated million-cell atlas, set `MH_SCALE_ATLAS` to its directory, run `node scripts/prepare-snapshot-scale-preview.mjs`, set `MH_PREVIEW=1`, then run `node scripts/snapshot-render-qa.mjs`. Generate that atlas using the existing `build:artwork-million` workflow if absent. Do not interpret declared placement counts in selection unit tests as generated large datasets.
