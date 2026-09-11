# Artwork performance — 11 September 2026

**Launch blocker remains open.** The live placement-per-image renderer does not scale to 100,000 or 1,000,000 images. The new snapshot compiler and renderer are an offline, browser-tested foundation, not an activated production pipeline.

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
- Separate fixed occupancy bitset and region ownership tables are emitted. Lookup/cache helpers are tested but **not connected to application inventory**.
- Shared placement links fetch their target directly. Desktop/mobile tests deliberately withhold the catalogue until the target inspector opens. My Globe save/reload, locked cells and artwork edits pass using a valid permanent-ID fixture.
- Compiler export supports paging and refuses an apparently truncated legacy response. Backend paging/version-selection helpers have targeted tests. Paging is not a transactional snapshot; live mutation during export remains a production concern.
- Pure lifecycle contract tests cover superseded versions, deletion/rollback, stale feeds and activation readiness. These are **not evidence of a working change feed, rendered masks or atomic rollover**.

Browser inspection covered desktop/mobile overview, close artwork, poles and seams; close artwork retains the published source's detail. Sparse seam locations without artwork test geometry, not cross-seam image quality. Tile memory assertions pass, but reported texture estimates exclude total browser/GPU memory. Existing UI styling is outside this work and has concurrent changes in another checkout.

Validation: 39 backend tests, 16 snapshot/streaming/detail tests, 9 deployment tests, desktop/mobile My Globe and public-link journeys. Staging build passed with the existing 1,549-object runtime release. Physical devices, failures during snapshot rollover and production CDN delivery are not verified.

## Required before activation

1. Durable compiler jobs with a consistent publication revision, retries, checksummed outputs and an atomic public release pointer. Do not use the developer compiler's public-list walk as a production snapshot transaction.
2. Complete bounded changes since that revision; erase superseded/taken-down baked regions before displaying replacements. Bound delta count, age, image bytes and geometry; rebuild before overflow. Prove deletion, suspension, rollback, purchase/edit races and failed rollover cannot reveal stale artwork.
3. Wire occupancy and regional owner lookup into picking, search, inspector and purchase availability. Remove full public-catalogue startup and unbounded live-image retention. Backend authority must still reject conflicting purchases.
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
