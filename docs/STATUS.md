# Million Hexagons — Status

Updated: 9 September 2026
North star: [Product direction](09-09-26-PRODUCT-DIRECTION.md).
Operational checklist only; update after meaningful verified work: Next → Now → Done.

## Now

- [ ] Build moderated background publication, safe replacement and coherent release promotion.

## Next

- [ ] Validate first-time purchase intent and physical-device performance.
- [ ] Add passwordless owner access and purchase recovery.
- [ ] Add server quotes and Stripe test checkout; prove fulfillment/refunds before live payments.
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

## Blocked / Needs Craig

- [ ] Configure/confirm the $10 Cloudflare budget alert.
- [ ] Agree final pricing and commercial terms, including refunds and permanent-use wording.
- [ ] Provide physical iOS/Android testing and observed first-time-user feedback.

## Launch progress

Launch readiness: ~25%

- Production foundation: IN PROGRESS
- Durable ownership/domain: IN PROGRESS (staging ownership, versions and editable sources verified)
- Inventory + checkout: IN PROGRESS (atomic staging reservations verified; quotes/payment not started)
- Publication: IN PROGRESS (durable staging pipeline verified; moderation, replacement and release promotion remain)
- Owner experience: NOT STARTED
- Growth/sharing: IN PROGRESS (cell links only)
- Analytics: NOT STARTED (illustrative/local counters only)
