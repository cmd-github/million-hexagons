# Million Hexagons — Status

Updated: 11 September 2026
North star: [Product direction](09-09-26-PRODUCT-DIRECTION.md).
Operational checklist only; update after meaningful verified work: Next → Now → Done.

## Now

- [ ] Review and complete the commercial launch decisions: pricing, refunds, permanent-use wording, seller identity and governing law.

## Next

- [ ] Implement the launch-scale immutable snapshot-plus-delta artwork compiler. Baked demos have been removed; test brands and purchases now share the existing live placement path. The 33,094-cell fixture set exposes that path honestly but does not prove full-globe scalability. Compile active placement records into immutable snapshots, apply later edits/purchases as deltas, and verify rollover, takedowns, exact cell IDs, sparse detail and bounded memory.
- [ ] Choose the next launch-critical engineering slice after the commercial decisions are settled.
- [ ] Later: design explicit domain rules for voluntarily merging connected purchases under the same verified owner so one artwork can span the expanded holding.

## Done

- [x] Published all 12 editable test brands to Craig's verified account and removed baked demo artwork from staging. Exact footprints span 48-12,000 cells (33,094 total); existing uploads remain. Verified owner/grant records, published images, private artwork/design checksums, idempotent seed rerun and all 1,549 runtime objects/CDN health. Startup now stays at the globe overview while preparing live artwork. Deployment: `3d9657e7-c49d-43bd-bdb0-d28304875be8`. See [editable test brands](EDITABLE-TEST-BRANDS.md) for evidence and limits.

- [x] Prepared replacement of baked demo inventory with an empty runtime base and 12 dispersed editable staging fixtures (48-12,000 cells; 33,094 total). Administrator-only creation resolves verified ownership and retains the normal private source/version/publication paths; retries preserve owner edits. Backend tests (36), deployment tests (9), desktop/mobile owner and persistent-checkout journeys, staging build and inspected footprint/editor screenshots passed. Not deployed or seeded: real account identification, live ownership/source checks and cold/repeat performance measurements remain open.

- [x] Made owner updates behave like an immediate save and deployed them to staging (`a144c106-3b01-4bfc-8867-bc2f628fe0e4`). The editor now reports "Saving changes" then "Updating globe", waits until the new artwork is publicly available, reloads directly onto the updated placement and confirms "Changes saved"; desktop and mobile keep that confirmation visible beside the live HUD. Customer-facing owner copy now uses "Live", "Updating" and "Save changes" instead of publication queues or version jargon. Desktop/mobile owner journeys, production/staging builds, all 9,733 public runtime objects, live health/CDN checks and the disposable live publication suite passed. The separate persistent-checkout browser harness timed out twice during its initial page load before reaching checkout and remains an explicit test-harness follow-up.

- [x] Reused the original globe Design workspace for owner updates and deployed it to staging (`bd294887-2687-4414-b33d-9b54c79b1005`). My Globe now loads normal or legacy published artwork into the shared editor, locks the purchased footprint/location, hides cell count and Add/Remove controls, retains image replacement/movement/scale/rotation, background colour and per-cell Paint/Clear/Restore, and proceeds directly to Review → Publish update without availability reservation or checkout. Desktop/mobile journeys verified exact cell preservation, per-cell colour state, immutable version payloads, legacy-source fallback, claimed-cell HUD interaction and responsive rendered layouts. Live health/CDN and disposable source/version/publication acceptance passed; Craig's existing placement was not modified.

- [x] Repaired claimed-placement interaction and legacy owner editing and deployed it to staging (`ca7b8906-f15a-4619-a014-8baa2941dc0c`). A globe click now waits for its exact streamed geometry and completes the original click instead of silently requiring another attempt. My Globe falls back to the published artwork for older placements whose private design source returns 404, loads cross-origin artwork safely for canvas export, and explains when the published copy is being edited. Desktop/mobile owner journeys cover a forced first-hit geometry miss, normal private-source editing, published-copy fallback, replacement upload, crop controls, immutable publication and exact-cell preservation. Live health/CDN checks and the disposable live source/version/publication journey passed; Craig's existing older placement has not been republished during verification.

- [x] Exact regional geometry streaming deployed to staging (`dd9f68a2-c907-4e02-bdf8-702466122867`). Visitors fetch visible/required regions instead of the 17.2 MB monolithic topology. Exhaustive comparison preserves all 1,000,000 canonical IDs, polygon bits and adjacency; connected footprints and artwork projection inputs match. Recorded desktop/mobile journeys preserve Design -> Place -> Review at 1,500 and 100,000 cells and recover from failed downloads across seams/poles. Immutable release contains 9,733 verified objects; live regional checks confirm CDN hits. See [regional geometry](REGIONAL-GEOMETRY.md) and [performance measurements](GLOBE-PERFORMANCE-AUDIT.md). Physical-device acceptance remains open.

- [x] Typed conversion analytics and trustworthy public globe statistics deployed to staging (`09ac4e22-f5ea-40bf-8c88-e67403a7b4e7`). One browser boundary now captures globe views/searches, placement views/clicks/shares, cell selection, design progress and checkout starts with bounded privacy-minimal context; Stripe fulfilment emits idempotent purchase completion server-side. Active authoritative placements drive claimed, remaining, placement and latest-placement totals, replacing fabricated global figures and example activity. My Globe shows measured views, visits and CTR. Backend tests (33), desktop/mobile sharing and owner-dashboard journeys, checkout regressions and the full live publication/funnel/statistics journey passed. A fresh paid event was not created in this deployment run.
- [x] Public placement links, share cards and privacy-minimal view/click analytics deployed to staging (`1cc9fe93-16b5-46d6-959a-598cc890087d`). Permanent placement URLs open the correct globe location, expose public campaign details and support native share/copy. Firestore-backed totals deduplicate views by browser session without storing raw session IDs. Backend tests (31), controlled desktop/mobile journeys with inspected screenshots, persistent-checkout regression coverage, and the full live publication journey passed; live acceptance measured one view and one click while rejecting the duplicate view.
- [x] Recoverable artwork editing in My Globe deployed to staging (`1c723695-66c3-4853-bae4-b737635aaa92`). Verified owners can load the private saved source, upload a replacement PNG/WebP, crop by moving/scaling/rotating, restore the saved artwork, edit metadata and publish an immutable version without changing the placement ID or purchased cells. Legacy paid versions without a design bundle fall back to their private publication source, and Stripe-email-recovered ownership is authorized correctly. Backend tests (29), controlled desktop/mobile artwork journeys with inspected screenshots, and the full live durable-source/version/publication/recovery/release journey passed.
- [x] Payment resilience and server-side Stripe acceptance deployed. Failed and expired Checkout sessions release reservations idempotently, processing payments retain cells, and paid sessions fulfil during cleanup/reconciliation. Stripe's test webhook subscription now includes asynchronous success/failure, payment failure, refund and dispute events. A real declined test payment and disposable successful charge/refund reached the signed webhook; the refund retained its explicit ownership outcome. Forced reconciliation closed an externally expired Checkout reservation with zero failures. Backend tests (29), live Checkout creation/retry/cancel, and desktop/mobile founder workspace passed. The staging UI remains at `aea27f1a-485c-44bd-bada-6861afe9a8bb`.
- [x] Passwordless purchase recovery and My Globe deployed to staging (`031bc04b-e711-4b2a-9c05-2be6552c9b79`). Verified email sign-in now recovers both Firebase-UID and Stripe-email-owned placements, including cross-device link completion by re-entering the receiving email. My Globe shows placement artwork, status, acquisition date, versions and total cells; owners can return to a placement and publish immutable name, description or URL updates. Backend identity tests and desktop/mobile controlled browser journeys passed; live staging owner-access layout passed. Live inbox delivery and a real owner metadata edit remain unverified.
- [x] Globe performance audit and staging startup/cache/grid repair deployed (`ddae8c82-7756-4546-8db7-3a5ba1e3cac7`). Live desktop/mobile first draw improved from roughly 18 seconds to 0.9–1.2 seconds; repeat saved close-ups reached 2.7–2.9 seconds. Obsolete wide grid work is cancelled after zooming. Exact first-visit close-ups still took 20–32 seconds across the observed runs, including CPU-throttled mobile emulation. Image/zoom checks and remaining memory/scaling limits are recorded in [Globe performance audit](GLOBE-PERFORMANCE-AUDIT.md).
- [x] Fixed missing awaits in public placement listing and reservation release. Reproduced the live restoration error, then verified saved artwork/cell links and activity entries on live desktop/mobile. Final staging deployment, including reduced-motion repair: `dc620bda-1efc-41d7-a2df-6b84767ebe8e`.
- [x] Fresh embedded Stripe test-card payment completed, automatically closed checkout, appeared without refresh and restored artwork on a fresh page. Verification placement: `cb963840-0598-4e78-a1d6-90d2cb79ed84`, cell `31677` (test mode only). Backend tests: 24 passed. Automated client/renderer regression coverage: `npm run test:persistent-checkout`; physical devices remain unverified.
- [x] Deferred startup placement navigation until the inspector is initialized, fixing missing artwork when reduced-motion flights finish synchronously. Desktop/mobile regression journeys cover completion, full reload, stalled artwork and occupied-cell rejection, including reduced motion.

- [x] Exact 1,000,000-cell globe with frozen canonical IDs.
- [x] Design → Place → Review with exact cell/count parity (local QA).
- [x] Image framing, rotation, paint, transparency and connected editing (local QA).
- [x] Globe exploration, search, navigation and cell-location sharing (local QA).
- [x] Session-only publication with streamed artwork tiles (local QA).
- [x] Cloudflare staging: SSL and live desktop/mobile preview journeys verified.
- [x] Live Review/Edit, publication, reload and failure recovery; screenshots inspected.
- [x] Versioned R2 topology/artwork uploaded and all 8,196 objects publicly verified.

- [x] Live rollback rehearsal; desktop/mobile journeys passed after restore.
- [x] Availability monitor verified live and against simulated HTTP failure.
- [x] Cloudflare DNS cutover preserved the Firebase coming-soon site and `www` redirect.
- [x] Custom R2 hostname deployed; JSON, gzip, manifests and artwork verified as CDN cache hits.
- [x] Implement and test the staging placement-domain core: stable IDs, exact encoded cell sets, ownership grants, domain events and reversible test deletion.
- [x] Live persistent sandbox acceptance: authenticated create, reload/restore, delete/release, same-cell reclaim and second persistence all passed.
- [x] Durable staging publication: private Firebase Storage source, checksum reference, retry-enabled background publication and immutable R2 artwork/metadata.
- [x] Automated live publication acceptance: create, owner reload, overlap rejection, R2 delivery/cache policy, deletion, exact-cell release and reuse all passed.
- [x] Designer waits for saved-inventory restoration before enabling placement, so a returning owner cannot select over an existing claim during load.
- [x] Private editable design bundles and original artwork are recoverable for owner drafts and placement versions; live draft save/load/delete and immutable v2 publication passed.
- [x] Atomic reservations passed at the 100,000-cell maximum, including conflict rejection, exact release/reuse, premature-expiry rejection and concurrent expiry idempotency.
- [x] Secured staging content controls passed live: silent artwork/link/description removal, full suspension placeholder, immutable-version rollback and audited revocation with exact cell release.
- [x] Owner credit ledger passed live: one credit represents one hex, grants and redemptions are immutable/idempotent, overspending is rejected, and revocation compensation is separately recorded.
- [x] Subtle key control deployed in the globe utility bar for passwordless owner access; signed-in state shows placement and credit summaries and reserves admin controls for administrator claims.
- [x] Founder-only content controls deployed and browser-tested: placement/owner lookup, field takedown/editing, suspension, version restoration, revocation, compensating credits and combined moderation/credit audit history.
- [x] Authoritative versioned server quotes and 15-minute exact-cell reservations deployed; anonymous quote, overlap rejection, atomic placement fulfilment, expiry/release and desktop/mobile Review passed live.
- [x] Stripe test Checkout deployed from server-authoritative quotes; live session creation and idempotent retry passed, and signed webhook fulfilment is deployed.
- [x] Staging builds now force the persistent sandbox client and fail if Checkout is tree-shaken; served Worker assets were verified after redeploy.
- [x] First Stripe test payment recovered and verified: one paid order fulfilled 12 exact cells under hashed buyer ownership and published immutable artwork; five-minute paid-order reconciliation now backs up webhooks.
- [x] Embedded Stripe Checkout is deployed inside the Review panel; live server session creation/idempotent retry pass, and anonymous public placement restoration is wired into staging startup.
- [x] The Review-to-Stripe wait now shows the shared branded hex loader immediately; the boot, editor and checkout states all inherit the same animation source and the staging bundle is deployed.
- [x] A second paid 17-cell placement fulfilled and published, exposing a fragile post-payment cell-match; completion now follows the permanent placement ID, tolerates transient polling/render errors and provides a saved-placement fallback.
- [x] Fresh staging loads restore published CDN artwork as explicit CORS textures and focus the newest persistent placement so saved custom work is immediately visible.
- [x] Persistent inventory restoration no longer waits serially for artwork: every saved cell is marked occupied immediately, while each image loads independently without blocking later placements.

## Blocked / Needs Craig

- [ ] Configure/confirm the $10 Cloudflare budget alert.
- [ ] Review and complete [draft commercial terms](DRAFT-COMMERCIAL-TERMS.md), including final pricing, refunds, permanent-use wording and governing law.
- [ ] Provide physical iOS/Android testing and observed first-time-user feedback.

## Launch progress

Launch readiness: ~25%

- Production foundation: IN PROGRESS
- Durable ownership/domain: IN PROGRESS (staging ownership, versions and editable sources verified)
- Inventory + checkout: IN PROGRESS (successful and declined test payments, refund handling, signed webhooks and forced reconciliation verified; final commercial terms and production configuration remain)
- Publication: IN PROGRESS (immediate publication, public staging projection and backend takedown/rollback verified)
- Owner experience: IN PROGRESS (passwordless recovery, owned-placement dashboard and recoverable immutable metadata/artwork editing deployed)
- Growth/sharing: IN PROGRESS (permanent placement links, public share cards, live inventory totals and latest placements deployed; country representation remains)
- Analytics: IN PROGRESS (typed conversion funnel, server-authored purchases and advertiser views/visits/CTR deployed; geography and time-series reporting remain)
