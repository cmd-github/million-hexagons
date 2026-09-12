# Visible hex-grid rendering

The circular detail patch has been replaced by cached meshes for the frozen topology's existing regions. Camera-frustum and horizon bounds select the complete visible surface, including viewport corners. A 12% offscreen margin prepares nearby regions for navigation. Line visibility depends on projected cell size; there is no circular clipping or radial fade.

Each region retains exact cell IDs and canonical polygon corners. Indexed centre fans reduce vertices per hexagon from eighteen to seven. Regions download independently, with at most four outstanding requests from the grid renderer, and build incrementally within a cooperative two-millisecond frame budget. A slow region does not block the others. GPU meshes survive topology-cache eviction, and the renderer retains up to 128 regions or the current viewport's working set, whichever is larger. Stale meshes are disposed when that limit is exceeded.

## Verification on 12 September 2026

Controlled local Chrome runs used 10 Mbps / 80 ms network emulation, desktop 1440 by 900 and mobile 390 by 844 with four-times CPU slowdown. These isolate the grid with empty artwork, rather than testing dense artwork or physical phones.

| Cold mid-zoom measure | Desktop | Mobile emulation |
| --- | ---: | ---: |
| First visible grid, previous renderer | 1.45 s | 1.80 s |
| First visible grid, new renderer | 0.74 s | 1.10 s |
| All viewport regions ready, new renderer | 1.53 s | 1.67 s |
| Settled frame time p95, previous / new | 17.4 / 17.5 ms | 17.3 / 17.2 ms |
| Cold-loading frame time p95, new renderer | 17.3 ms | 50.0 ms |
| Geometry regions downloaded, previous / new | 44 / 30 | 32 / 16 |
| Retained grid GPU buffers, new renderer | 5.04 MB | 2.93 MB |

Returning to the cached close view completed coverage in 0.14 s desktop / 0.12 s mobile, including the harness's 120 ms view-update guard. Crossing to an uncached cube seam took 0.55 / 0.49 s. These are single runs measured from camera focus, not page-load guarantees. The previous renderer did not expose full-viewport coverage telemetry, so its full-grid timing is not reported. More draw calls are used (31 versus 8 at desktop mid-zoom); settled frame times remained similar in this scene. Mobile cold-loading spikes remain: this does not establish zero performance cost under all conditions.

The final run includes the consolidated stylesheets and icon/draft/Escape changes from local `main`. Region construction reads the packed canonical arrays directly and uses their known bounds, avoiding per-cell accessor allocations and a final vertex scan. Desktop/mobile icon hydration, rotation toggling, menu-first Escape, draft restoration, placement parity and controlled My Globe editing passed after integration.

Reproduce with `node scripts/grid-coverage-qa.mjs`; set `MH_GRID_LABEL=baseline` to compare with commit `74900c6f`. Reports and screenshots: `artifacts/grid-coverage/{baseline,after}/`.

Ten grid/regional tests pass, including exhaustive million-cell identity and geometry parity, viewport ray coverage at corners/horizons/poles/cube seams, hexagon and pentagon triangle parity, stalled downloads, topology eviction, and sustained navigation beyond the GPU cache capacity. Desktop/mobile Design -> Place -> Review journeys passed for 1,500 and 100,000 cells, as did public-placement and sharing journeys. Physical-device and dense-artwork performance remain unverified.

Combined staging deployment: `5f47e9e6-6fed-4d51-8592-72ef0b9be856`. All 1,549 runtime objects and live health/CDN checks passed. Live desktop/mobile grid zoom/pan screenshots, owner key/account access and admin workspace shell were inspected with no page errors. Scripts: `grid-coverage-live-qa.mjs`, `account-access-qa.mjs`, `admin-workspace-qa.mjs`; artifacts are in their corresponding directories. Admin QA exposes the normally hidden entry button to inspect the shell only; it does not verify authenticated operations. My Globe editing was tested against controlled API fixtures. The existing smoke journey's removed-Adidas assertion remains a separate known issue in STATUS.
