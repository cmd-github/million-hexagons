# Million Hexagons — Status

Updated: 10 September 2026
North star: [Product direction](09-09-26-PRODUCT-DIRECTION.md).
Operational checklist only; update after meaningful verified work: Next → Now → Done.

## Now

- [ ] Embed Stripe Checkout in the Review panel and load paid placements from a public persistent projection.

## Next

- [ ] Validate first-time purchase intent and physical-device performance.
- [ ] Complete passwordless purchase recovery and the My Globe ownership experience.
- [ ] Prove payment failures, refunds and reconciliation before live payments.
- [ ] Build My Globe: owned placements and versioned content editing.
- [ ] Add public placement/share pages and cards, then placement-based analytics.

## Done

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

## Blocked / Needs Craig

- [ ] Provide the Stripe test publishable key (`pk_test_...`) for browser-side embedded Checkout; this key is intentionally public.
- [ ] Configure/confirm the $10 Cloudflare budget alert.
- [ ] Review and complete [draft commercial terms](DRAFT-COMMERCIAL-TERMS.md), including final pricing, refunds, permanent-use wording and governing law.
- [ ] Provide physical iOS/Android testing and observed first-time-user feedback.

## Launch progress

Launch readiness: ~25%

- Production foundation: IN PROGRESS
- Durable ownership/domain: IN PROGRESS (staging ownership, versions and editable sources verified)
- Inventory + checkout: IN PROGRESS (first payment/fulfilment verified; embedded payment UI and public persistent projection remain)
- Publication: IN PROGRESS (immediate publication and backend takedown/rollback verified; founder UI and public release projection remain)
- Owner experience: NOT STARTED
- Growth/sharing: IN PROGRESS (cell links only)
- Analytics: NOT STARTED (illustrative/local counters only)
