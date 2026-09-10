# Million Hexagons — Status

Updated: 10 September 2026
North star: [Product direction](09-09-26-PRODUCT-DIRECTION.md).
Operational checklist only; update after meaningful verified work: Next → Now → Done.

## Now

- [ ] Extend My Globe editing from versioned name/description/URL updates to recoverable artwork editing.

## Next

- [ ] Reduce first-visit close-up latency by loading exact geometry for the visible region instead of the full 17.2 MB topology (reserved for a higher-capability model).
- [ ] Validate first-time purchase intent and physical-device performance.
- [ ] Add public placement/share pages and cards, then placement-based analytics.

## Done

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
- Owner experience: IN PROGRESS (passwordless recovery, owned-placement dashboard and versioned metadata editing deployed; artwork editing remains)
- Growth/sharing: IN PROGRESS (cell links only)
- Analytics: NOT STARTED (illustrative/local counters only)
