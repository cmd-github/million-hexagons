# Cloudflare staging

This is the first production-plan implementation slice: a separately deployable, non-payment product demo. It still uses sample inventory and session-only publication. It does not alter Firebase Hosting or live DNS.

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

- `staging-dist/`: app bundle, favicon, sample HUD marks, security/cache headers and noindex directives.
- `staging-runtime/releases/<sha256>/`: exactly the runtime topology files and complete sample tile catalogue. Large canonical binaries, source catalogues, optional stress data and working notes are excluded.
- `artifacts/staging/release.json`: local object hashes, sizes, public origin and app hashes. Archive this with each deployed app artifact and the Wrangler deployment version.

These generated paths are ignored by Git. The release hash covers the sorted runtime object inventory and bytes. The app and topology worker both embed the same exact release URL. There is no mutable data pointer in this demo: a Worker deployment switches the pinned release. A dynamic publication pointer is later transactional work.

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

Use `npm.cmd exec -- wrangler deployments list --config wrangler.staging.jsonc` to find the recorded working version, then `npm.cmd exec -- wrangler rollback <VERSION_ID> --config wrangler.staging.jsonc`. Retain its immutable R2 release and test loading/creation after rollback. Do not delete old releases while a retained Worker version references them. A future paid system must keep ownership/reconciliation running during frontend rollback.

Before phase 1 can be called complete: perform a real upload/deploy and rollback, verify custom-domain cache behaviour, inspect real desktop/mobile delivery and physical-device memory/loading, set account cost alerts, and establish staging/production credentials and operational ownership. Accounts, durable ownership/publication, checkout and production domain cutover remain separate phases in [PRODUCTION-PLAN.md](PRODUCTION-PLAN.md).

## Live verification - 9 September 2026, 13:24 UK time (BST)

Staging is live at https://million-hexagons-staging.million-hexagons.workers.dev. SSL now works. `scripts/staging-qa.mjs` passed desktop and emulated-mobile one-cell image creation, rotation, Review/Edit, session publication, warm reload, startup retry and missing-file 404 checks. The run recorded 165 runtime requests, zero Firestore requests and zero browser errors. Desktop/mobile screenshots were inspected; evidence is in ignored `artifacts/staging/`. This does not certify physical devices, larger live footprints, custom-domain caching or rollback.
