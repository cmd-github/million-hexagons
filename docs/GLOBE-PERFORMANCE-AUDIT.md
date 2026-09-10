# Globe performance and image-quality audit

10 September 2026. Final staging deployment: `ddae8c82-7756-4546-8db7-3a5ba1e3cac7`. The startup/cache timing table was measured on `fd5f6d22-b0e3-444d-b38a-a92d000cdf51`; the final deployment adds cancellation of obsolete grid work.

## Findings and changes

The previous staging startup waited for public placement restoration, the entire exact topology, and account initialization before beginning the render loop. Cold first draw measured 17.4–17.9 seconds; a true desktop reload still took 16.9 seconds. The topology response is 17.2 MB compressed and expands to a 92 MB canonical buffer. Its network transfer, not its roughly 0.2-second decode on this machine, dominated the wait.

The overview now renders while saved inventory, artwork and authentication load independently. Occupancy is restored directly from authoritative IDs, without waiting for polygon geometry. Editing and picking remain gated on inventory, and late startup focus cannot interrupt user interaction. Immutable topology is retained in a bounded application cache; corrupt-length entries are refetched and denied storage falls back safely.

The audit also exposed obsolete grid-building work after rapid zooms. The renderer now cancels an unfinished wide/old-direction patch when the current view has changed substantially, keeping existing geometry until the new patch is ready. A deterministic constrained-budget regression fails against the previous implementation and passes with the fix.

After topology was loaded, a local 4x CPU-throttled wide-to-close zoom reached greater than 90% grid opacity in 0.92 seconds with the repair. This measures geometry generation/reveal, not the first network download. Screenshot: `artifacts/globe-audit/grid-cpu4-fixed.png`.

## Live measurements

Headless Chrome on this Windows machine; mobile means a 390 × 844 viewport with 2× device pixels, not a physical phone. Timings are individual observed runs, not population percentiles. Cold contexts had empty caches; repeat measurements used real page reloads in the same context. No payment was created by this audit.

| Measurement | Desktop | Emulated mobile |
| --- | ---: | ---: |
| First globe draw, cold | 1.15 s | 0.92 s |
| First globe draw, repeat | 0.34 s | 0.26 s |
| Saved close-up inspector, cold | 20.78 s | 20.15 s |
| Saved close-up inspector, repeat | 2.93 s | 2.72 s |
| Settled frame median | 16.7 ms | 16.6–16.7 ms |
| Settled frame p95 | 17.2–17.4 ms | 17.3–17.4 ms |

Close-up inspector time includes exact-data loading and camera travel. It is not a pixel-completeness metric; separate screenshots were inspected after settling. Local instrumented topology loading on cached reloads was approximately 0.6 seconds, plus decoding. Initial benchmark reload entries that accidentally reused a same-document URL were discarded; only actual reloads are reported here.

A separate mobile viewport run with 4x CPU throttling drew the globe in 2.69 seconds cold / 0.88 seconds repeat, and opened the close-up in 23.03 / 3.67 seconds. CPU throttling is not a real-device or cellular-network simulation. All six final live runs had no captured browser errors.

The final deployment was checked again with 4x CPU throttling: first draw was 2.78 seconds cold / 0.93 seconds repeat, and close-up time was 32.32 / 3.73 seconds. Both runs had no captured browser errors; the final repeat screenshot shows the detailed grid and artwork correctly rendered. The slower cold result demonstrates download variability: observed first-visit close-ups span approximately 20–32 seconds. Evidence: `artifacts/globe-audit/live-detail-final.json` and `live-mobile-cpu4-final-warm-close.png`.

## Quality and interaction

Inspected live saved slug/globe artwork, desktop/mobile close-ups, overview, intermediate and maximum zoom, north/south poles, cube seam and post-drag views. No missing artwork pages or obvious seam gaps appeared in the inspected views. Across 14 local instrumented views using live assets, tile errors were zero and caches remained within their configured capacity. Settled frame p95 was 17.1–17.5 ms. Uncached view transitions needed up to approximately 2.5 seconds to finish requesting tiles; already cached transitions settled in roughly 0.26 seconds. These are settled measurements, not a claim of stutter-free motion on all devices.

Published image delivery retains the saved full-resolution WebP: globe 1083 × 831 (74.5 KB), slug 1172 × 829 (58 KB), and the green placement 2690 × 2857 (84 KB). The older preview-only photograph is 632 × 900. The renderer retains anisotropic filtering and the existing 3072px design-raster ceiling; this change did not reduce resolution or regenerate the frozen topology. Small placements cannot display unlimited source detail beyond their saved raster resolution.

## Remaining priorities

1. **First-visit close-ups are still too slow.** Load exact geometry for the visible region before fetching the rest. Preserve canonical IDs/polygons and authoritative inventory; this is a separate implementation, not solved by the new cache.
2. **Memory and placement scale need further work.** Tile textures reached about 156 MB desktop / 91 MB mobile in the traversal, excluding saved-placement textures and the 92 MB topology. Staging currently retains one mesh/texture per restored placement and requests public records from a backend list capped at 1,000. Five saved placements do not prove large-catalogue performance; immutable public delivery and visibility-based artwork loading remain necessary.
3. **Physical devices are unverified.** Real iOS/Android memory pressure, GPU speed, touch performance and slow first-visit connections remain release gates.

## Regression checks and evidence

`npm run test:globe-startup`: desktop/mobile overview renders during delayed inventory; editing waits; restoration does not steal focus.

`npm run test:persistent-checkout`: desktop/mobile/reduced-motion restoration, completion, reload and overlap rejection.

`npm run test:deployment`: seven checks including cache retention, old-release removal, malformed-length recovery and storage denial. `npm run test:streaming`: four geometry/selection/zoom checks.

`npm run test:globe-detail`: obsolete wide-patch cancellation. `npm run test:visual`: desktop/mobile editing and navigation, including four viewport sizes, passed after the startup changes; the navigation suite was also rerun for the detail repair. Production and staging builds passed.

Local artifacts: `artifacts/globe-audit/live-final.json`, `quality.json`, `live-*-close.png`, and `quality-*.png`. These ignored artifacts are machine-local evidence, not deployed assets.
