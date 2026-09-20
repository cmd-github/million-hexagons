# Cloudflare staging

This is a separately deployable staging product with Stripe test checkout. Test-owner claims persist in Firestore and publish immutable derived artwork through private Firebase Storage and R2. The baked sample catalogue has been replaced by owner-editable test placements; see [editable test brands](EDITABLE-TEST-BRANDS.md) for rollout evidence and retry instructions. It does not alter Firebase Hosting or the coming-soon site.

Latest frontend deployment (20 September 2026): `c942b474-110b-48ee-8293-3803ef2bc505` from source commit `e0fbb9ad`, fixing the Browse-to-zoom transition. The phone composition was scoped `:not(.detail-view)`, so zooming in teleported Claim from the bottom sheet back to the topbar and reflowed the pitch into the desktop slab. Scoping it on `.creating` alone fixed that and exposed three collisions on the bottom edge, now also fixed: controls over Claim once the sheet slides away, the inspector over the controls, and the confirmation toast covering Claim entirely. A dismissed toast that kept swallowing clicks was a pre-existing bug and is fixed for every size. `test:mobile-composition` now guards the zoom transition. Verified live at 390x844 and 320x568.

Previous frontend deployment (20 September 2026): `4da30ecf-1e93-4ad7-8505-6d43ea393bbf` from source commit `84c8f817` on branch `mobile-globe-first`, retaining immutable runtime release `6121418c93f84b0a7fd8b572f3f386de309edec9ba6bc2aefcc2d44e084374b2`. Phones now give the globe the screen: the pitch is a bottom sheet, Claim is a full-width thumb-zone action, the control rail is four floating circles at the lower right, the activity ticker is collapsed and hidden when empty, and portrait Browse overfills the globe using Google Earth's measured ratio of silhouette radius to viewport height (0.40). Space is close to black and the studio panels took a height budget. Measured live at 390x844: globe on screen 71.4%, unobstructed 56.7%, chrome over the globe 20.5%. At 320x568: 69.8%, 45.1%, 35.4%. Deployment integrity, all 1,549 runtime objects, CORS, content types and cache policy passed; desktop/mobile composition, globe-design, navigation, startup and geometry journeys passed locally with inspected screenshots and zero page errors. The first attempt at this deployment (`e5eee609-1216-454a-8813-2a51c12c41bc`) put the collapsed activity ticker under the control column; that is fixed here and was only visible on staging, because an empty local feed hides itself. Not verified: physical iOS/Android devices, live checkout, full regression, and the reduced studio panel heights against a real purchase on this deployment. Roll back to `dc88a64d-c9f3-4e86-913c-956932acb605` to restore the previous composition.

Previous frontend deployment (17 September 2026): `0230aea5-b48b-45b3-9bf4-89b59ac60905` from source commit `12b58936`, retaining immutable runtime release `6121418c93f84b0a7fd8b572f3f386de309edec9ba6bc2aefcc2d44e084374b2`. Available cells now keep the green proposed-state treatment with a proud ungrouped hex ID while Claim this space is open; purchased-placement inspection no longer paints selection outlines. Shape has adjacent minus/plus-one controls, +10/+25/+100 shortcuts and a compact key. Fill uses an accessible icon, Delete toggles off and colour selection restores paint mode, and Home returns a lost editor to its design. Production build, deployment integrity and the focused desktop/mobile globe-design journey passed; exact Shape and normal-globe Claim screenshots were inspected. All 1,549 runtime objects and the live HTTPS/CDN health check passed with cache hits. No full regression, live checkout journey or physical-device testing was run.

Previous frontend deployment: `b4249875-66c4-4ee3-a4ca-e856c557fae3` from source commit `3dd4e4c8`.

Earlier frontend deployment: `00860ef7-9fb4-4909-bca1-8f513c4cd466` from source commit `e8c8b74e`.

Earlier frontend deployment: `4c6e0024-882f-4bd6-884b-16a484b863a8` from source commit `e7b596d6`.

Previous studio-polish deployment: `41ff3abf-e3d9-48e4-b21b-f7afa253f720` from source commit `9fdfbc5d`.

Previous checkout-review deployment: `a3c1ff25-bada-4286-b5da-73d0bab3635e` from source commit `730ea945`.

Previous placement-flow deployment: `f69e6a06-69ed-47ec-a90b-80a95a4f7c04` from source commit `db77e0fa`.

Previous confirmed-start deployment: `fbe8a015-0e9d-4d8b-838a-d64be4341f49` from source commit `f20b4356`.

Previous zero-state deployment: `1e1dd78f-5105-4124-a1db-890d4d83083d` from source commit `b77feec0`.

Previous direct-placement deployment: `ed183713-d0fb-405c-a8d5-a88f42210c36` from source commit `bd871d94`.

Previous placement-studio deployment: `9c2e654f-770b-4a1b-9dfd-77402afebd1c` from source commit `86b35327`.

Previous frontend deployment (14 September 2026): `d91bb8d2-75c4-4808-a496-c5927ff7befb` from source commit `0a4b6f61`. It introduced sparse lime twinkles on available real-cell centres.

Previous background deployment: `52cc9f76-e525-4d07-a195-3771b5f78f36` from source commit `43197d88`. It added 800 stable, perspective-sized hexagons in three static layers. Desktop/mobile composition and full checkout-restoration journeys passed then; `VITE_ARTWORK_SNAPSHOTS=false` remains unchanged.

Previous 800px desktop-composition deployment: `e8cd408a-72cf-475b-8d7e-5f7ed68bdb13` from source commit `5e94f583`. It made text and controls about 12.5% larger on phones while retaining the same desktop arrangement; the new deployment changes only the hexagon-star background.

Previous 900px desktop-composition deployment: `e1e5410d-db27-4e3a-b5b2-45aecdb292a6`.

Previous 1024px desktop-composition deployment: `0332f4bd-4eb8-4b2a-99fa-918990eedb9b`. It was superseded by the closer scaling above.

Previous 1440px desktop-composition deployment: `069c5234-ff42-490c-b637-694b9d6016cf`. It was superseded because its phone rendering was too small to read comfortably.

Previous full-bleed mobile deployment: `5503b999-b6d0-47a9-b7ae-2bf7fa5af11d`. It was superseded by the single desktop composition above.

Previous HUD-latency deployment: `05ce9cb5-252e-4cbf-9990-17224b9e169b`. It opened placement metadata before full-footprint geometry and Nearby ranking completed.

Previous discovery deployment: `366cf92d-a64c-42d2-8716-7b604e2fe45a`. It fixed Nearby geometry loading, authoritative activity navigation, adjacent same-owner purchase coverage and the live-placement smoke journey.

Previous grid deployment: `5f47e9e6-6fed-4d51-8592-72ef0b9be856`. Cached exact grid regions cover the viewport, integrated with the consolidated stylesheets and icon/mobile/Escape/draft fixes. Live desktop/mobile grid zoom/pan, owner-key/account panel and admin-shell checks passed with inspected screenshots and zero page errors. See [grid measurements and verification limits](GRID-RENDERING.md).

Previous grid deployment: `8a70d2f7-780c-44b1-a832-08b170ef863d`. Exact grid preparation starts during zoom/flight with priority for current-view geometry, and there is no artwork-loading message during globe browsing. Live desktop/mobile zoom/pan checks passed with inspected screenshots and zero page errors; evidence: `artifacts/zoom-grid/live/`, reproduced by `node scripts/zoom-grid-live-qa.mjs`.

Previous loader deployment: `c1c9afa2-a3b3-41d8-96bc-bb59c4d4f8cf`, from commit `343d681d`. Live desktop/mobile cold/repeat visits revealed populated artwork; withholding 19 artwork downloads kept the branded loader visible until release. Cold reveal was 7.85 s desktop / 7.38 s emulated mobile; repeat 3.37 s / 3.90 s (single runs, no artificial network or CPU throttling). Evidence: `artifacts/artwork-loading-live/` and `node scripts/artwork-loading-live-qa.mjs`.

## One-time account setup

1. Sign in to Cloudflare and enable R2. Create **million-hexagons-staging-public**. Keep source uploads out of this bucket. The private source bucket and upload API belong to the later durable-artwork phase.
2. Under bucket Settings, enable **Public Development URL**. Copy the `https://pub-….r2.dev` origin. This is acceptable for initial staging only: it is rate-limited and does not prove production CDN caching. Before public launch, configure an R2 custom domain and verify cache hits. DNS can remain at Hostinger during this first staging deployment.
3. Set the public bucket's CORS policy to the JSON in [deploy/r2-staging-cors.json](../deploy/r2-staging-cors.json). It allows anonymous GET/HEAD of public derived assets; it grants no upload or private-data access.
4. Create an R2 API token with **Object Read & Write**, restricted to this staging bucket. Record its Access Key ID and Secret Access Key locally. These are S3 credentials, different from the general Cloudflare API token. Copy your Cloudflare Account ID from the dashboard.
5. In the repo terminal, run `Copy-Item .env.staging.example .env.staging.local` once, then fill in that ignored local file. Never paste secrets into chat or put them in `VITE_*` variables. `MH_ASSET_ORIGIN` is the public URL; `MH_R2_BUCKET` already has the expected name. Leave `CLOUDFLARE_API_TOKEN` empty for interactive deployment.
6. Run `npm.cmd exec -- wrangler login` and complete the browser authorization. Wrangler will use that login to deploy the static app. If prompted to choose a Workers subdomain, choose one in the account dashboard. The app is named `million-hexagons-staging` and will use its own `workers.dev` URL.

The uploader intentionally accepts only the staging public bucket name. Do not reuse production credentials. Public assets use permissive read CORS because they contain no account, payment, reservation or private source data.

Provider references: [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/), [CORS](https://developers.cloudflare.com/r2/buckets/cors/), [Workers static assets](https://developers.cloudflare.com/workers/static-assets/).

## Prepare and deploy

```powershell
npm.cmd ci
npm.cmd run test:deployment
npm.cmd run build:staging
npm.cmd run upload:staging
npm.cmd run deploy:staging
```

`build:staging` reads `.env.staging.local` (or environment variables). It generates:

- `staging-dist/`: app bundle, favicon, security/cache headers and noindex directives.
- `staging-runtime/releases/<sha256>/`: exact regional topology files and six transparent base tiles. Large canonical binaries, the monolithic packed topology, source catalogues, optional stress data and working notes are excluded.
- `artifacts/staging/release.json`: local object hashes, sizes, public origin and app hashes. Archive this with each deployed app artifact and the Wrangler deployment version.

These generated paths are ignored by Git. The release hash covers the sorted runtime object inventory and bytes. The app embeds the exact release URL for regional geometry and the empty artwork base. A Worker deployment switches the pinned runtime release; existing immutable releases remain available for rollback.

Regional geometry delivery (11 September 2026) uses 1,536 lossless partitions plus an ID index and manifest. Run `npm.cmd run build:regions` only to derive these from the frozen canonical bytes, followed by `npm.cmd run test:regions`. The runtime allowlist contains 9,733 objects (37.4 MB); visitors download only the regions they need. See [regional geometry](REGIONAL-GEOMETRY.md) for identity, cache and failure contracts. The health monitor now verifies the regional manifest, index and a geometry partition, including SHA-256 and CDN cache hits.

`upload:staging` uploads four objects concurrently, verifies request integrity and refuses to overwrite different contents at an immutable key. It can resume an interrupted upload. It then downloads every public object to verify hashes, CORS, content types and cache headers. `deploy:staging` repeats public verification and checks the app/runtime files have not changed before invoking Wrangler. A failed check prevents app deployment. These checks issue thousands of reads; include their cost in staging usage.

Gzip runtime objects are stored as opaque `application/octet-stream` bytes with no `Content-Encoding`; the client detects and decompresses gzip bytes. The client also supports already-decoded HTTP gzip responses even when CORS hides the encoding header. Do not apply content transformations to immutable runtime objects.

The app uses same-origin scripts, a scoped runtime origin, Google Fonts and local/blob artwork previews in its CSP. Staging is publicly reachable but marked noindex; noindex is not access control. No private data or production checkout is present.

## Local verification

To exercise the separated build without a Cloudflare account:

```powershell
$env:MH_ASSET_ORIGIN = 'http://127.0.0.1:4182'
npm.cmd run build:staging -- --local
# Terminal 1
node scripts/staging-fixture-server.mjs
# Terminal 2
npm.cmd exec -- wrangler dev --config wrangler.staging.jsonc --port 4183 --ip 127.0.0.1 --local
# Terminal 3
node scripts/staging-qa.mjs
```

Inspect `artifacts/staging/*-{globe,design,review,checkout}.png` and `browser-report.json`. The fixture serves opaque topology gzip and HTTP-encoded occupancy gzip from another origin. The browser check covers desktop/mobile drag, upload, rotation, Review/Edit, secure Stripe mount without payment, reservation release, warm reload, startup retry, actual CSP headers and missing-file 404s. It also checks that ordinary browsing makes no Firestore requests. Local device emulation is not physical-device certification.

A local build is explicitly marked and refused by remote upload/deploy commands. Clear the temporary variable with `Remove-Item Env:MH_ASSET_ORIGIN` and rebuild before remote deployment. To check the deployed app, run the same QA script with `$env:SMOKE_URL` set to its actual Workers URL. The script creates only browser-session previews.

CI runs `npm run test:launch`: repository hygiene, all deterministic repository tests, backend tests, the staging build/release-integrity checks and a Wrangler dry run with a deliberately non-routable asset origin. It has no cloud credentials and does not deploy. Live CDN, browser, payment and physical-device results are separate evidence.

Local evidence, 9 September 2026: five deployment tests and four geometry tests passed; normal/staging/holding-site builds and Wrangler dry run passed. The separated-origin browser check passed desktop/mobile publication, Review/Edit, warm reload and failure retry with zero browser errors or Firestore requests. Current exact-cell design/navigation suites passed at 320/390/1024/1440 widths on a fresh development server. Screenshots were inspected. The sample runtime release contains 8,196 files (33.3 MB); the static app contains 20 files. npm audit reported zero vulnerabilities; a scoped Miniflare Sharp override uses the project's patched Sharp dependency.

## Rollback and remaining gates

Rollback rehearsal (9 September 2026): deployed version `7a1235fc-2d95-40b9-a313-420aabda5b54` with a temporary marker file, verified it publicly, then restored `003fb40f-b99a-4472-935c-254e0ed7c054`. The marker returned 404 after rollback and the public health check passed. R2 objects were retained unchanged.

## Availability monitoring

Run `node scripts/staging-health.mjs` for a small public check of HTTPS, app JS/CSS/worker bundles, runtime release references, inventory lengths, CORS, cache headers and six root artwork tiles. Reports go to `artifacts/staging/health.json`. A simulated HTTP 503 was confirmed to fail the check. It does not download all tiles or the 17 MB topology on every run and does not replace browser QA.

`.github/workflows/staging-health.yml` runs on relevant pushes, manually and approximately every 30 minutes, retaining reports for 14 days. GitHub schedules can be delayed; this is basic availability monitoring, not a guaranteed alerting service. Staging GitHub Actions failure-email delivery was confirmed on 9 September 2026; no separate production alert destination or escalation route is configured. Account budget alerts remain a Cloudflare dashboard task. No visitor identifiers or business events are collected by this health check.

To verify notification delivery without breaking staging, run the workflow manually in GitHub Actions with **Send a test failure notification after the live health check** enabled. The live health check runs first and its report is retained; the final intentional step makes that one run fail. Confirm the failure email arrives, then leave the option disabled for ordinary manual runs.

Update `deploy/staging-monitor.json` whenever the expected runtime release/origin changes. The monitor intentionally fails if deployed bundles no longer reference that release. It is separate from the full pre-deployment checksum verification.

## Custom-domain preparation

Asset hostname: `assets-staging.millionhexagons.com`, attached only to `million-hexagons-staging-public`. The app remains on its Workers address; the Firebase coming-soon site remains on the apex and `www`.

The 9 September 2026 nameserver cutover preserved the complete three-record Hostinger zone: Firebase apex A, `www` CNAME and hosting-verification TXT. DNSSEC had no DS record. Cloudflare authoritative record parity, apex HTTPS coming-soon delivery and the `www` redirect were verified during propagation.

The R2 custom hostname has a narrowly scoped Cache Rule: hostname equals `assets-staging.millionhexagons.com` and path starts with `/releases/`; responses are eligible only when origin cache-control is present. Retain the old R2 origin/releases for rollback.

Durable staging publication stores its authoritative flattened source privately in Firebase Storage, then a Firebase background Function publishes deterministic immutable objects under `releases/placements/<placementId>/versions/<version>/`. Configure `MH_R2_ACCOUNT_ID`, `MH_R2_ACCESS_KEY_ID` and `MH_R2_SECRET_ACCESS_KEY` as Firebase Function secrets; never place them in a `VITE_*` variable or commit them. The R2 token must remain restricted to Object Read & Write for `million-hexagons-staging-public`. Rotate and revoke a token immediately if its access-key material appears in logs or command output.

Run `npm.cmd run test:staging-publication` to exercise the live pipeline using a secret-protected disposable staging identity. It proves a 100,000-cell atomic reservation plus conflict/release, concurrent expiry safety, recoverable private drafts and original artwork, immutable v2 content editing, background publication, owner reload, deletion and exact-cell reuse. It fetches published artwork and metadata through the custom R2 hostname and cleans up its active test records. The ignored `.env.staging.local` must contain `MH_STAGING_QA_KEY` (or the staging-only R2 secret used when the QA secret was provisioned). This is operational acceptance access, not a browser or customer authentication path.

When updating the monitor to the custom asset hostname, set `requireAssetCacheHit` in `deploy/staging-monitor.json` to `true`. The monitor warms and repeats representative JSON and opaque-gzip requests, requires `CF-Cache-Status: HIT`, and verifies that cached bytes are unchanged. Keep it `false` only while the temporary `r2.dev` origin is in use because that development URL does not expose CDN cache status.

Provider reference: https://developers.cloudflare.com/r2/buckets/public-buckets/

Use `npm.cmd exec -- wrangler deployments list --config wrangler.staging.jsonc` to find the recorded working version, then `npm.cmd exec -- wrangler rollback <VERSION_ID> --config wrangler.staging.jsonc`. Retain its immutable R2 release and test loading/creation after rollback. Do not delete old releases while a retained Worker version references them. Production rollback must keep ownership, payment reconciliation and publication recovery running independently of the frontend version.

Staging has completed real upload/deploy and rollback, custom-domain cache verification, durable ownership/publication and Stripe test-checkout acceptance. Remaining production and physical-device work is tracked by the seven gates in [production launch acceptance](LAUNCH-ACCEPTANCE.md), including separate production credentials/resources, live payments, DNS cutover, operational ownership, backups, alerts and physical-device memory/loading.

## Live verification - 9 September 2026, 13:24 UK time (BST)

Staging is live at https://million-hexagons-staging.million-hexagons.workers.dev. SSL now works. `scripts/staging-qa.mjs` passed desktop and emulated-mobile one-cell image creation, rotation, Review/Edit, session publication, warm reload, startup retry and missing-file 404 checks. The latest custom-origin run recorded 158 runtime requests, zero Firestore requests and zero browser errors. Desktop/mobile screenshots were inspected; evidence is in ignored `artifacts/staging/`. This does not certify physical devices or larger live footprints.

Post-rollback browser QA passed desktop/emulated-mobile creation, Review/Edit, publication and recovery with zero browser errors; screenshots inspected. GitHub scheduled availability execution and failure email delivery are confirmed.

Custom-origin deployment (9 September 2026, 14:50 UK time): Worker version `d589361e-84bb-4923-afb4-7f331cf8d9f2` references immutable release `bc9993d6498824b521e7362779f829c78fc8fb49c3b37eac696835dd1abfb6ce` through `assets-staging.millionhexagons.com`. All 8,196 objects passed upload and independent pre-deployment public verification. The strict live monitor passed with cache `HIT` for application bundles, JSON, opaque gzip, manifests and all six root artwork tiles.
