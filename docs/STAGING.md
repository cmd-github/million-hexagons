# Cloudflare staging

This is a separately deployable staging product with Stripe test checkout. Test-owner claims persist in Firestore and publish immutable derived artwork through private Firebase Storage and R2. The baked sample catalogue has been replaced by owner-editable test placements; see [editable test brands](EDITABLE-TEST-BRANDS.md) for rollout evidence and retry instructions. It does not alter Firebase Hosting or the coming-soon site.

Latest frontend deployment (12 September 2026): 5f47e9e6-6fed-4d51-8592-72ef0b9be856. Cached exact grid regions now cover the viewport, integrated with the consolidated stylesheets and icon/mobile/Escape/draft fixes. Live desktop/mobile grid zoom/pan, owner-key/account panel and admin-shell checks passed with inspected screenshots and zero page errors. All 1,549 runtime objects and health/CDN checks passed. See [grid measurements and verification limits](GRID-RENDERING.md). The existing renderer remains enabled (VITE_ARTWORK_SNAPSHOTS=false); physical devices and authenticated live admin operations remain unverified.

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

Inspect `artifacts/staging/*-{globe,design,review,published}.png` and `browser-report.json`. The fixture serves opaque topology gzip and HTTP-encoded occupancy gzip from another origin. The browser check covers desktop/mobile drag, upload, rotation, Review/Edit, session publication, warm reload, startup retry, actual CSP headers and missing-file 404s. It also checks that ordinary browsing makes no Firestore requests. Local device emulation is not physical-device certification.

A local build is explicitly marked and refused by remote upload/deploy commands. Clear the temporary variable with `Remove-Item Env:MH_ASSET_ORIGIN` and rebuild before remote deployment. To check the deployed app, run the same QA script with `$env:SMOKE_URL` set to its actual Workers URL. The script creates only browser-session previews.

CI runs deployment unit checks, geometry tests, the staging build/allowlist checks and a Wrangler dry run with a deliberately non-routable asset origin. It has no cloud credentials and does not deploy. Live CDN, browser and physical-device results are separate evidence.

Local evidence, 9 September 2026: five deployment tests and four geometry tests passed; normal/staging/holding-site builds and Wrangler dry run passed. The separated-origin browser check passed desktop/mobile publication, Review/Edit, warm reload and failure retry with zero browser errors or Firestore requests. Current exact-cell design/navigation suites passed at 320/390/1024/1440 widths on a fresh development server. Screenshots were inspected. The sample runtime release contains 8,196 files (33.3 MB); the static app contains 20 files. npm audit reported zero vulnerabilities; a scoped Miniflare Sharp override uses the project's patched Sharp dependency.

## Rollback and remaining gates

Rollback rehearsal (9 September 2026): deployed version `7a1235fc-2d95-40b9-a313-420aabda5b54` with a temporary marker file, verified it publicly, then restored `003fb40f-b99a-4472-935c-254e0ed7c054`. The marker returned 404 after rollback and the public health check passed. R2 objects were retained unchanged.

## Availability monitoring

Run `node scripts/staging-health.mjs` for a small public check of HTTPS, app JS/CSS/worker bundles, runtime release references, inventory lengths, CORS, cache headers and six root artwork tiles. Reports go to `artifacts/staging/health.json`. A simulated HTTP 503 was confirmed to fail the check. It does not download all tiles or the 17 MB topology on every run and does not replace browser QA.

`.github/workflows/staging-health.yml` runs on relevant pushes, manually and approximately every 30 minutes, retaining reports for 14 days. GitHub schedules can be delayed; this is basic availability monitoring, not a guaranteed alerting service. Configure Craig's GitHub Actions failure notifications and confirm receipt; no email/webhook destination has been configured by the agent. Account budget alerts remain a Cloudflare dashboard task. No visitor identifiers or business events are collected.

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

Use `npm.cmd exec -- wrangler deployments list --config wrangler.staging.jsonc` to find the recorded working version, then `npm.cmd exec -- wrangler rollback <VERSION_ID> --config wrangler.staging.jsonc`. Retain its immutable R2 release and test loading/creation after rollback. Do not delete old releases while a retained Worker version references them. A future paid system must keep ownership/reconciliation running during frontend rollback.

Before phase 1 can be called complete: perform a real upload/deploy and rollback, verify custom-domain cache behaviour, inspect real desktop/mobile delivery and physical-device memory/loading, set account cost alerts, and establish staging/production credentials and operational ownership. Accounts, durable ownership/publication, checkout and production domain cutover remain separate phases in [PRODUCTION-PLAN.md](PRODUCTION-PLAN.md).

## Live verification - 9 September 2026, 13:24 UK time (BST)

Staging is live at https://million-hexagons-staging.million-hexagons.workers.dev. SSL now works. `scripts/staging-qa.mjs` passed desktop and emulated-mobile one-cell image creation, rotation, Review/Edit, session publication, warm reload, startup retry and missing-file 404 checks. The latest custom-origin run recorded 158 runtime requests, zero Firestore requests and zero browser errors. Desktop/mobile screenshots were inspected; evidence is in ignored `artifacts/staging/`. This does not certify physical devices or larger live footprints.

Post-rollback browser QA passed desktop/emulated-mobile creation, Review/Edit, publication and recovery with zero browser errors; screenshots inspected. GitHub scheduled availability execution and failure email delivery are confirmed.

Custom-origin deployment (9 September 2026, 14:50 UK time): Worker version `d589361e-84bb-4923-afb4-7f331cf8d9f2` references immutable release `bc9993d6498824b521e7362779f829c78fc8fb49c3b37eac696835dd1abfb6ce` through `assets-staging.millionhexagons.com`. All 8,196 objects passed upload and independent pre-deployment public verification. The strict live monitor passed with cache `HIT` for application bundles, JSON, opaque gzip, manifests and all six root artwork tiles.
