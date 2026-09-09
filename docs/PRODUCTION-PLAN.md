# Development to production

Reviewed 9 September 2026 against `arch_direction.md`, the current source and provider documentation. This is a proposed implementation plan, not evidence of production readiness. The product contract and paid-launch gates in [ROADMAP.md](ROADMAP.md) still apply.

## Recommendation and review

Adopt the proposed Cloudflare public delivery / Firebase transactional split. Preserve the renderer and frozen topology. Change the proposed implementation order: prove inventory correctness and durable publication before enabling live payments. Hosting migration alone does not make the prototype a production product.

| Direction point | Assessment and qualification |
| --- | --- |
| Keep Vite/Three.js and viewport tiles | Agree. Avoid a renderer rewrite. Existing code is a strong foundation, but browser and publication performance at production occupancy still require evidence. |
| Workers Static Assets for the app | Agree. Add reproducible product deployment, staging, cache policy and rollback; the current deploy command publishes the holding site. |
| R2 for large assets | Agree. Use a public derived-assets bucket and a separate private source bucket. A private-looking prefix in a public bucket is insufficient. |
| Firebase Auth, Firestore and Functions | Agree provisionally. The only current Function is launch signup; customer authentication and commercial APIs must be built. Firestore inventory design needs a bounded feasibility test. |
| No Firestore reads for ordinary public browsing | Agree, including public search, placement details and sharing. Use versioned, partitioned public indexes; avoid replacing database reads with a huge per-visitor metadata download. |
| Packed topology instead of public canonical binary | Agree. Current files are 17,205,675 bytes packed, 91,999,984 bytes canonical and 52,606,462 bytes canonical gzip. Keep canonical artifacts available privately for builds and recovery. |
| Six-face/six-level artwork pyramid | Accurate for the base catalogue but incomplete: current publication adds sparse detail through level 8. The server baker must preserve that and adjacent-placement updates. |
| Cache bounded by viewport demand | Agree as an architectural property, not a proven maximum memory budget. Current targets are 128/64 pages and can expand with demand; measure actual memory on physical devices. |
| Cloudflare will be cheaper | Plausible, not established. R2 has free direct egress, but storage, operations, compute and cross-cloud publication traffic still cost money. Model workloads and cache misses before claiming savings. |
| Upload, pay, commit, bake, publish | Broadly right, but add preflight/moderation, durable job dispatch, idempotency, concurrent-bake protection, coherent releases and recovery. Payment, Firestore and R2 do not share one atomic transaction. |
| Incrementally rebuild affected tiles | Agree. Include ancestors, gutters, seams and existing finer descendants; concurrent jobs must not overwrite each other's artwork. |
| Immutable manifests | Agree. Also define a small mutable release pointer, atomic promotion, supported client/schema versions and old-release retention. |
| Separate analytics ingestion | Agree. Start with essential funnel events and destination clicks. Defer rankings and advanced advertiser analytics until measurements are trustworthy. |
| Keep the coming-soon site temporarily | Agree. Preserve its signup endpoint and stored signups during the eventual domain cutover. |
| Reconsider Firestore only after cost evidence | Agree for cost-driven migration. Correctness or transaction-size failure is a reason to reconsider earlier. |

Workers Static Assets currently limits individual files to 25 MiB; the packed topology fits, but the two larger files do not. R2 separation is still useful for independent releases and the growing tile catalogue. [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/).

R2 delivery needs a custom domain and explicit cache configuration; verify actual cache hits. Static asset requests are free, while Worker execution and R2 operations have separate billing. [R2 caching](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## Verified starting point

- `firebase.json` publishes `coming-soon-dist`; `npm run build` produces the product globe separately.
- `functions/index.js` implements launch signup only. No checked-in Firestore rules, Cloudflare deployment configuration or GitHub workflow was found during this review; deployed account configuration was not audited.
- `src/main.js`, `src/globe/samples.js` and `src/globe/topology-loader.worker.js` use same-origin runtime paths. Moving objects requires a shared asset configuration or compatible routing, including worker requests.
- `src/globe/tiles.js` stores session artwork in IndexedDB and deletes its database on page exit. It is not production storage.
- The current worker expands packed topology to approximately 92 MB before other runtime allocations. R2 changes delivery cost, not download size or device memory.
- Sample activity and metrics are illustrative, and local click totals are not shared analytics. Production must remove or clearly identify demonstration content and use a separate production inventory.

## Target boundaries

| Component | Responsibility |
| --- | --- |
| Workers Static Assets | Product HTML/JS/CSS and small assets; versioned deployments. |
| Public R2 custom domain | Frozen topology, generated tiles, public thumbnails, versioned occupancy and sharded placement/search metadata. |
| Private R2 bucket | Validated source artwork, immutable design records and restricted build artifacts; scoped upload/download access. |
| Firebase Auth + backend API | Owner access, durable drafts, server quotes, reservations, checkout, account recovery and moderation. Public clients cannot mutate ownership. |
| Firestore | Authoritative inventory, orders, placements, job/outbox records and audit history. |
| Durable queue + container baker | Retryable artwork production. Start by benchmarking a Node/container implementation using shared geometry; select the Google-side runner from measured CPU/memory needs. Do not assume browser GPU code ports directly to an edge Worker. |
| Stripe | Hosted Checkout and payment events; server reconciliation establishes payment status. |
| Event ingestion | Bounded, rate-limited analytics intake and aggregate reporting, independently of checkout. |

The browser reads one release pointer, then immutable resources belonging to that release. Public occupancy is advisory: the backend revalidates the complete footprint at reservation time. A stale snapshot can cause a recoverable conflict, never a double sale.

## Delivery sequence and completion gates

### 0. Confirm the commercial contract and demand

Keep the current non-payment journey while testing first-time desktop/mobile users. Implement draft recovery and purchase-intent instrumentation. Follow the roadmap's target of at least 80% completing without assistance and record purchase intent and price comprehension.

Resolve placement duration/service commitments, owner editing rights, supported sales regions, tax-inclusive/exclusive display, refund/takedown policy, and treatment of sample inventory. These are product decisions, not assumptions for infrastructure code. Preserve regional pricing and Design -> Place -> Review.

**Exit:** observed demand evidence and a written commercial contract justify transactional development. Public demo hosting can proceed independently; live checkout remains disabled.

### 1. Make the product reproducibly deployable to staging

Add isolated development/staging/production configuration, Cloudflare deployment files and CI. Keep the existing holding-site deployment explicit and separate. Build an allowlisted product artifact so Vite's public-directory copying cannot ship canonical binaries, stress catalogues or working notes accidentally.

Introduce shared runtime asset URLs covering bootstrap, topology metadata/packed data, occupancy, catalogues and tiles. Upload immutable assets first, verify checksums, then deploy the app. Configure CORS, content types, compression, CSP and cache headers. Test the loader's gzip handling against actual CDN responses to prevent double decompression.

Use long cache lifetimes for immutable assets and a short/revalidated release pointer. Private APIs use no-store. Preserve compatible old assets for rollback. Add least-privilege deployment credentials, secret handling, cost alerts and environment separation.

**Exit:** a clean checkout deploys to staging; cold/warm desktop/mobile browsing works, missing assets produce recovery UI, rollback works, and anonymous browse/search/detail requests cause no Firestore access. Inspect screenshots and physical-device loading/memory evidence.

### 2. Prove inventory transactions before committing to the schema

Prototype bounded inventory shards keyed by stable canonical cell IDs, with compact ownership/reservation records. Choose shard sizing from measured document size, transaction payload and contention, not an assumed document per cell or one global lock. Large cell lists/designs may need immutable external records with hashes rather than one Firestore document.

The backend validates IDs, uniqueness, connectivity, topology version, complete availability and server price. Store a quote bound to owner, design hash, exact IDs, currency, amount and expiry. Reserve the entire footprint atomically or reject it entirely. Transaction retries must not call Stripe or dispatch external jobs.

Exercise 1/50/500/10,000/100,000-cell footprints, including cross-shard shapes, overlapping buyers, disjoint buyers, retries, expiry races and process failure. Preserve the 100,000-cell product contract unless a deliberate product revision is agreed. If Firestore cannot safely handle it, evaluate a transactional SQL inventory boundary before building checkout around it.

Firestore documents and transaction requests have limits, including a 10 MiB transaction request limit; retries do not make an oversized design viable. [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [transaction behaviour](https://firebase.google.com/docs/firestore/manage-data/transactions).

Use server timestamps and explicit expiry checks; TTL deletion is cleanup, not the reservation clock. [Firestore TTL](https://firebase.google.com/docs/firestore/ttl).

**Exit:** documented schema, maximum payloads and staging load results prove no partial reservations or double ownership across the supported sizes. Define a safe admission/concurrency limit from those results.

### 3. Deliver durable drafts, ownership access and artwork preflight

Allow anonymous design, save recoverable drafts and introduce verified owner access near reservation. Provide a minimal dashboard with drafts, orders, publication status and recovery links. Upload through short-lived, scoped authorization into private storage; verify actual bytes, formats, dimensions and decompression limits. Sanitize/rasterize SVG without scripts or external-resource access.

Freeze source hash, cell IDs, transform, paint, transparency and geometry/baker versions into the reviewed design record. Reproduce Review with server-rendered proof before checkout; resolve any rendering mismatch before taking money. Validate destinations and provide moderation/rejection feedback. Add owner authorization tests, checked-in rules and server IAM restrictions, including the existing signup collection.

**Exit:** drafts survive reload and a second device; unauthorized reads/edits fail; invalid uploads cannot become public; server proofs match reviewed designs around seams and pentagons.

### 4. Prove durable publication without real charges

Use internal test orders to exercise the complete pipeline. Commit ownership plus a durable outbox record in one database transaction. Dispatch jobs from the outbox with reconciliation so a process crash cannot lose publication work.

Bake validated immutable designs into versioned candidate tiles, thumbnails and metadata. Start with one serialized release publisher to avoid lost updates; optimize to partitioned work only if measurements demand it. Every job is idempotent and checks its input/release version. Build candidates from the current authoritative placement set, including moderation state.

Write all referenced objects, verify them, then promote one release pointer under concurrency control. Include occupancy, metadata and tiles in the same release contract. Clients keep the previous coherent release if a new one is incomplete. Persist publication progress, retry counts, terminal failures and operator retry actions.

Support edits and takedowns through replacement releases. Immutable URLs alone cannot enforce removal: define old-object deletion/cache purge and blocking where required, plus a rule preventing rollback from restoring removed content. Preserve an audit record without retaining publicly accessible prohibited artwork.

**Exit:** kill jobs at each boundary, replay them, publish adjacent placements concurrently, simulate missing objects and roll back. Exactly one durable result appears, neighbours remain intact, and paid-pending-publication recovery is demonstrated using test records. Inspect desktop/mobile Review-to-publication parity and level-8 seams/gutters.

### 5. Integrate Stripe in test mode and customer recovery

Create hosted Checkout from the authoritative frozen quote. Model order, payment, reservation and publication states separately. Bind Stripe IDs to the internal order and use idempotency keys. Verify webhook signatures and deduplicate events; the return page displays backend status and never independently grants ownership.

Coordinate reservation expiry with Checkout expiry. Reconcile provider status before releasing inventory where payment may still be in flight. Initially prefer immediate payment methods; if delayed methods are enabled, explicitly retain or resolve reservations until settlement. A late successful payment after loss of its reservation must enter a durable refund/support path, never overwrite another buyer.

Payment fulfillment commits ownership and the publication outbox once. Retry failed publication without charging again or freeing paid inventory. A reconciliation job recovers missed events and detects money/inventory mismatches. Stripe requires webhook-based fulfillment and handling delayed success where applicable. [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment).

Add receipts, recoverable order/placement URLs, publication status, support contact, tax handling and refund operations. Confirm treatment of cancellations, disputes and inventory release explicitly; a refund must not silently make old artwork purchasable while it is still displayed.

**Exit:** test duplicate/out-of-order/missed events, lost redirects, abandoned Checkout, expiry/payment races, late success, refunds and outages. Every successful payment yields one durable placement or a tracked recovery/refund outcome; customers recover without manual database edits. No live keys until all roadmap gates pass.

### 6. Finish operational and launch evidence

Provide staff tools for moderation, destination disabling, retry, refund, inventory inspection and audited access. Add rate limits for reservations/uploads and anti-hoarding controls. Verify backup/restore of ownership and source artwork and regeneration of public releases.

Measure backend error rates, reservation conflicts/latency, reconciliation mismatches, oldest publication job, CDN errors/hit rate and browser startup failures. Set alert recipients and documented runbooks. Essential analytics can use a batched endpoint; do not emit Firestore writes for each view. Public metrics must meet the product visibility/deduplication rules or remain absent.

Run current globe design/navigation/loading/publication suites with screenshot inspection, physical iOS/Android and low-end-device tests, accessibility/keyboard checks and sustained occupancy/traffic tests. Migrate obsolete canvas-specific test journeys before using them as release evidence. Rehearse account recovery, outage communication, publication failure and restore.

**Proposed launch budgets to validate:** public browsing makes zero Firestore requests; reservation API p95 below 2 seconds at the agreed launch load; 99% of approved paid placements publish within 5 minutes; alert on any unresolved payment/inventory mismatch or job older than 5 minutes. Set physical-device memory/loading limits from phase 1 measurements. These are targets, not current results or customer promises.

Model 10k/100k/1m visits per month using topology-load rate, tiles per visit, cache hit rate, source retention and tile writes per publication. One million cold packed-topology loads alone transfer about 17.2 TB decimal. Include database operations, queue/compute, logs, cross-cloud output traffic and payment fees; define operating budget and surge controls.

**Exit:** every roadmap launch gate has linked evidence, operational owners and recovery procedures; commercial terms and privacy/tax requirements are reviewed for supported markets; measured cost and capacity support a bounded pilot.

### 7. Pilot, then cut over

Start with a restricted buyer cohort and explicit volume limits. Keep checkout behind a server-controlled flag. Observe complete purchase/publication/refund/recovery journeys before opening broadly.

Inventory current DNS, certificates and mail records before changing domains. Verify signup routing, Auth authorized domains, webhook destinations, redirects and share links on the production hostname. Retain the holding-site rollback artifact. Deploy assets, compatible APIs and app before final routing changes.

**Exit:** production smoke journeys and reconciliation pass, support is staffed, and rollback has been rehearsed. On failure, disable new checkout while keeping reconciliation, receipts and existing ownership access running. Frontend rollback must never roll back paid inventory.

## First implementation slice

Implementation update (9 September 2026): the repository now has a staging build, immutable runtime packaging, verified R2 upload/Workers deploy commands, CI checks and [manual setup instructions](STAGING.md). Local separated-origin desktop/mobile journeys and deployment checks passed. Cloudflare authentication, real R2 delivery/deployment, rollback, custom-domain caching and physical-device evidence are still outstanding; phase 1 is not complete.

Start with phase 1: product staging deployment, public/private asset separation, shared runtime URL configuration and clean-build verification. Keep transactional implementation behind phase 0's demand gate, then make phase 2 the first backend task. This gives a reviewable hosted product early while exposing the largest database risk before payment work.

Track each phase with one implementation issue and its exit evidence. Re-estimate after staging asset measurements and the inventory spike; a credible paid-launch date depends on those results and observed user acceptance. The original architecture review changed documentation only; the implementation status above records subsequent work.
