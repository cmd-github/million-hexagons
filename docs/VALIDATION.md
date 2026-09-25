# Validation

Run checks relevant to the changed area. A passing build or scripted assertion does not establish visual quality.

`npm run test:launch` is the canonical deterministic pre-production gate. It covers repository hygiene, repository and backend tests, staging build/release integrity and a Worker dry run. Live services, real payments, load testing, visual judgment and physical devices remain separate evidence.

## Browser QA environment

The interactive Codex/in-app Browser connection is not the repository's browser-test runtime. If the interactive connection reports `No browser is available`, do not infer that Playwright is missing.

This Windows repository currently uses Playwright through its checked-in QA scripts and can launch installed Chrome or Edge. Diagnose the local capability before reporting it unavailable:

```powershell
npm.cmd exec -- playwright --version
Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe'
Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
Test-Path "$env:LOCALAPPDATA\ms-playwright"
```

Prefer the task-specific commands in this document and inspect their screenshots/artifacts. Active Codex tool instructions may require the in-app Browser and prohibit a command-line fallback; when that happens, record it as an interactive-tool policy constraint, not as missing Playwright or missing installed browsers.

For deployment/runtime-origin changes, run `npm run test:deployment` and the separated-build browser workflow in [STAGING.md](STAGING.md). Inspect its desktop/mobile screenshots. Cloudflare dry runs and a local R2 stand-in do not establish live CDN, rollback or physical-device readiness.

### Headed Android emulator visual QA

For mobile UI, globe, gesture or navigation work on this Windows checkout, supplement the repeatable Playwright checks with a visual pass in the existing `Pixel_8a_API_35` Android Virtual Device. Run the emulator with its window visible: the purpose is to inspect the real Android Chrome viewport together with the status bar, changing address bar, navigation bar, keyboard and touch interactions. Do not use `-no-window` or treat a DevTools screencast as equivalent visual evidence.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$emulator = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"

# Start this only when the AVD is not already running.
& $emulator -avd Pixel_8a_API_35
& $adb wait-for-device
& $adb shell getprop sys.boot_completed
```

Start the site in one terminal and bridge the emulator to it in another:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 4180 --strictPort

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb reverse tcp:4180 tcp:4180
```

In the visible emulator, open Chrome as a normal browser tab and visit `http://localhost:4180/`. Keep browser chrome visible for the main review. `chrome://inspect/#devices` is useful for DOM and network diagnosis, but its page view is not the visual acceptance surface.

For each affected journey, check portrait first and then the relevant edge cases: expand and collapse the address bar, rotate once, open and dismiss the keyboard, use Android Back, and exercise real taps, drags, swipes and pinch zoom. Confirm safe areas, viewport-height changes, fixed controls, sheets, focus, clipping and touch-target reachability. Use a normal Chrome tab unless installed/PWA mode is the feature under test.

Capture at least one full-device screenshot with Android and Chrome chrome included:

```powershell
New-Item -ItemType Directory -Force artifacts/android-emulator | Out-Null
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell screencap -p /sdcard/mh-mobile.png
& $adb pull /sdcard/mh-mobile.png artifacts/android-emulator/mh-mobile.png
```

Record the AVD, Android/API version, tested URL, orientation, journey and screenshot paths. Report the result as **headed Android emulator** evidence. It complements Playwright's deterministic assertions but does not certify a physical Android device, iPhone, iOS Safari, real mobile GPU/memory/thermal behaviour or production networking.

## Core checks

`npm run test:globe-startup` holds the inventory response open on desktop/mobile: the overview must render, editing must wait for inventory, and late restoration must not move the camera away from the editor. `npm run test:deployment` also checks the immutable topology cache, release replacement, corrupt-entry recovery and denied storage. These checks do not establish first-visit network performance; measure cold and actual reload navigations against staging separately.

`npm run test:globe-detail` checks that a close zoom discards an unfinished wide geometry patch under a constrained per-frame build budget, using the frozen canonical topology.

`npm run test:persistent-checkout` starts its own staging-enabled development server and checks the real browser client on desktop/mobile using controlled API and Stripe responses. Covers delayed request results/errors, restoration despite stalled artwork, reduced-motion startup, the branded checkout loader, permanent-ID completion, full reload with artwork, and occupied-cell rejection. It creates no live payments or placements. Inspect `artifacts/persistent-checkout/`; a separate live Stripe test payment is required to verify Stripe and webhook integration.

```powershell
npm run build
npm run dev -- --port 4180
# In another terminal
$env:SMOKE_URL = 'http://127.0.0.1:4180'
npm run test:geometry
npm run test:visual
npm run test:studio-scale
```

For purchase-flow changes, exercise image, solid colour, and mixed per-cell paint/transparency in the unified editor at desktop and mobile sizes. Confirm repeated Design -> Review -> Edit round trips preserve the exact draft pixels, undo/redo and restore recover source artwork, and transparent cells retain count/price. Cover 5/50/150/400/500-cell purchase footprints as relevant, plus any explicit one-cell legacy-owner fixture, valid and occupied locations, URL validation, editing routes, and exact selected/reviewed/committed count and price parity. Inspect the task-specific artifact directory. Confirm no pane scrolling at 320x568, 390x844, 1024x768 and 1440x900, including open contextual tools.

`test:studio-scale` uses a test-only empty occupancy response to exercise 50,000/100,000-cell editing, undo/redo, image framing, canvas pan/zoom, relocation and a 100,000-cell publication. It leaves real sample inventory unchanged. Inspect `artifacts/studio-scale/`; report timing as local/emulated results and distinguish capacity from available contiguous space. Run this check against the development server because it uses the existing `geodesicQA` hooks.

`npm run test:desktop-composition` checks the desktop side panel and responsive phone studio sheets at 1440x900, 390x844 and 320x568. For focused purchase visuals, run `node scripts/purchase-polish-qa.mjs` (also covers 1024x768); inspect `artifacts/purchase-polish/`. Set `QA_PENDING=1` for the delayed-publication confirmation. Checkout responses are simulated; no payment is submitted. Physical iOS/Android and real Stripe remain separate checks.

## Geodesic and gesture checks

With the development server running, set `SMOKE_URL` and run `npm run test:visual`. It covers the current Location -> Shape -> Design -> Review flow on desktop and emulated touch viewports.

For topology, picking, artwork mapping, or globe-control changes, inspect equator, poles, pentagons, cube seams, and both desktop and mobile gestures. Confirm artwork remains complete, correctly oriented, colour-accurate, and crisp. Emulated touch is not physical-device certification.

Regenerate the frozen topology only for an intentional inventory migration:

```powershell
npm run build:topology
npm run test:geometry
```

Do not run `scripts/create-geodesic-seed.py` for routine regeneration because a new seed changes cell identity.

## Streaming and runtime assets

With the development server running:

```powershell
npm run build:runtime
$env:SMOKE_URL = 'http://127.0.0.1:4180'
npm run build:artwork
npm run test:streaming
npm run test:performance
```

`npm run build:artwork-million` creates the optional, ignored million-cell stress catalogue and can be expensive. Run it only when a fully occupied rendering fixture is required. Inspect performance screenshots and report local/emulated results as such.

## Coming-soon site

For changes under `coming-soon/`, run `npm run build:coming-soon`, `npm --prefix functions test`, and `npm run test:coming-soon` against its preview server. Inspect desktop/mobile output, form validation and states, keyboard focus, the X link, and globe drag behaviour before deploying functions and hosting together.


Globe editing: run `node scripts/globe-design-qa.mjs` against localhost:4180. It checks desktop/mobile Location, Shape, Design and Review with exact cell IDs, plus discovery HUD actions. Inspect artifacts/globe-design. Also manually check connected add/remove and occupied-cell rejection around an existing placement.


Current globe-only UI checks replace the removed pre-Location/Shape canvas journeys: `scripts/globe-design-qa.mjs` covers desktop/mobile brush growth, separate removal, undo, continuous rotation, clean restart, source preservation and review IDs; `scripts/globe-navigation-qa.mjs` covers viewport fit, claim camera preservation, detail gating, double-click zoom and shared-link arrival.


8 September globe-only TODO pass: production build and four geometry tests passed. The updated test:visual command runs the two globe suites; desktop/mobile publication and exact committed cell IDs, source reset, brush growth/removal/undo, image rotation and review round trips passed. Navigation checks cover 320x568, 390x844, 1024x768 and 1440x900 without pane overflow, claim zoom preservation, detail gating, double-click zoom and link arrival. Desktop/mobile screenshots were inspected. The current pass does not rerun the earlier 100,000-cell publication benchmark.

Loading transitions: run `node scripts/loading-qa.mjs`. It delays bootstrap/editor topology requests and checks desktop/mobile loading visibility, hidden startup HTML, ready-editor reveal and startup failure retry. Inspect artifacts/loading. Loader CSS is inline in index.html to cover the period before the app stylesheet arrives.

Use the current public-placement, discovery, activity/HUD and durable staging journeys below for exploration behavior; the legacy sample/session script has been removed.

Artwork and camera polish: run `node --test scripts/artwork-camera.test.mjs` and `node scripts/artwork-camera-qa.mjs`. They cover arbitrary-angle containment, all four artwork corner markers through Review, low-resolution warnings, narrow-screen placement containment, flight cancellation and reduced motion. Inspect `artifacts/artwork-camera/`. Existing globe design/navigation/exploration and streaming checks remain applicable.

Local Chrome performance comparison (desktop and emulated mobile, sample inventory, six fixed altitudes plus motion): median frame intervals remained approximately 16.7-16.9ms. Resident cache limits remained 128/64; no new render passes or texture-resolution increases. Desktop draw calls matched except one transient 63/64 reading while detail loaded. Static p95 varied between approximately 17 and 34ms across runs; this is not a universal no-regression claim. Baseline and after reports are in ignored `artifacts/performance-qa/before.json` and `report.json`; physical-device and million-occupancy stress certification were not repeated.

Activity/HUD/control changes: `node scripts/activity-hud-qa.mjs` checks desktop, mobile and tablet layout, single-button rotation, stable internal Nearby navigation and Escape/focus restoration, restored Home orientation, altitude-scaled drag speed and available-cell prompts. Inspect `artifacts/activity-hud/`. Streaming priority changes also require `node --test scripts/artwork-stream.test.mjs`; example metrics do not validate real view measurement.

Public placement sharing: run `npm.cmd run test:public-placement`. The desktop/mobile journey opens a permanent placement-ID URL, verifies the correct globe arrival, share-card content and viewport containment, copies the durable link, and records measured view/click events. Inspect `artifacts/public-placement/`. Pair it with `npm.cmd run test:staging-publication` after backend deployment to prove Firestore aggregation, duplicate-view protection and the public placement projection against a disposable durable placement.

Typed analytics and public totals: `npm.cmd --prefix functions test` validates the event allowlist, placement identity requirements, bounded context and non-negative public projections. `npm.cmd run test:public-placement` verifies globe, placement, outbound and share events plus the live-total HUD on desktop/mobile. `npm.cmd run test:my-globe` verifies advertiser views, visits and CTR. The live publication journey proves event deduplication, a funnel event, authoritative claimed/remaining/placement counts and the latest-placement projection. Purchase completion is emitted by Stripe fulfilment and requires a fresh paid lifecycle run to observe a new live event.

Publication quality: run `node --test scripts/publication-detail.test.mjs scripts/artwork-stream.test.mjs`, `node scripts/publication-baker-qa.mjs` and `node scripts/publication-quality-qa.mjs`. These cover source-sized refinement, ancestor gutters, atomic failure, cube-seam publication, later adjacent placements, and 1/50/500-cell publication on desktop/mobile. Inspect `artifacts/publication-quality/`; the 50-cell text fixture compares published edge sharpness against Review. The report records publication duration, frame timing and cache bounds. Run `test:performance` in sample mode for overview/navigation comparisons; local Chrome results are not physical-device certification.

Durable staging publication: run `npm.cmd run test:staging-publication`. The live disposable journey verifies a 100,000-cell reservation, conflict and concurrent-expiry safety, private editable draft/original recovery, immutable content v2, durable owner reload, background publication, immutable R2 delivery, deletion/release and exact-cell reuse. It cleans up active test records and requires the ignored local QA secret; it does not validate payment or physical devices.
The same journey also verifies idempotent credit grants/redemption, silent field takedowns, complete suspension copy, immutable-version rollback and revocation with separately recorded account credit. This validates the secured backend operations, not a founder-facing administration UI or final legal terms.

Owner access: run `npm.cmd run test:account-access` against live staging. The Playwright journey opens the key control at 1440x900 and 390x844, verifies focus, viewport containment and Escape dismissal, and writes inspected screenshots to `artifacts/account-access/`. The 9 September live run passed after correcting the mobile panel to open below the top-positioned toolbar.

My Globe: run `npm.cmd run test:my-globe`. The controlled desktop/mobile browser journey signs in a verified owner, restores a Stripe-email-owned placement, checks totals and viewport containment, loads its recoverable source, replaces and transforms the artwork, restores the saved version, publishes an immutable artwork/metadata version with the exact purchased cells, and returns to the placement on the globe. Inspect the dashboard and expanded editor screenshots under `artifacts/my-globe/`. Pair this with `npm.cmd run test:staging-publication` for live private-source recovery, immutable R2 publication and exact-cell release/reuse. Run `npm.cmd run test:account-access` against live staging separately to verify Firebase email delivery and authorized-domain configuration.

Founder controls: run `npm.cmd run test:admin-workspace` against live staging and inspect `artifacts/admin-workspace/`. The browser journey verifies that the claim-gated moderation workspace opens, focuses its lookup, remains within desktop/mobile viewports and closes cleanly. Pair it with `npm.cmd run test:staging-publication`, which exercises the secured moderation, restoration, revocation and credit operations themselves.

Payment lifecycle: run `npm.cmd --prefix functions test` for Checkout-state, refund-state and buyer-safe failure normalization. Run `node scripts/stripe-checkout-live-qa.mjs` against staging to create an unpaid Stripe test session, verify idempotent retry, and prove cancellation expires the session before releasing its reserved cell. With `STRIPE_SECRET_KEY` set to the test secret, `npm.cmd run test:payment-lifecycle` creates disposable declined and successful test PaymentIntents, verifies signed failure/refund webhook processing and the retained ownership outcome, and forces reconciliation over an externally expired Checkout session. The 10 September run passed with one reconciled closure and zero failures. These tests use Stripe test mode and do not certify live keys or final refund policy.

Checkout reservations: run `npm.cmd run test:checkout-reservation` against a sandbox-enabled staging build. It intercepts the backend boundary to verify that Review submits the exact selected cells, displays the server price and 20-minute countdown, keeps the final action visible at 1440x900 and 390x844, and releases the reservation when returning to Design. Inspect `artifacts/checkout-reservation/`. Run `npm.cmd run test:staging-publication` after backend deployment to prove live anonymous quoting, overlap rejection, atomic reservation-to-placement conversion and expiry.
