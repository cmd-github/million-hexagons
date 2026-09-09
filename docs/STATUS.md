# Million Hexagons — Status

Updated: 9 September 2026, 13:24 UK time (BST)
North star: [Product direction](09-09-26-PRODUCT-DIRECTION.md).
Operational checklist only; update after meaningful verified work: Next → Now → Done.

## Now

- [ ] Finish production foundation: custom-domain caching, rollback and monitoring.

## Next

- [ ] Validate first-time purchase intent and physical-device performance.
- [ ] Implement durable domain: stable placement IDs, owners, fixed cell sets and grants.
- [ ] Retain private design sources, content versions and recoverable drafts.
- [ ] Prove atomic inventory/reservations up to 100,000 cells, including expiry races.
- [ ] Build moderated background publication, safe replacement and coherent releases.
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

## Blocked / Needs Craig

- [ ] Agree final pricing and commercial terms, including refunds and permanent-use wording.
- [ ] Provide physical iOS/Android testing and observed first-time-user feedback.

## Launch progress

Launch readiness: ~25%

- Production foundation: IN PROGRESS
- Durable ownership/domain: NOT STARTED (design proposed)
- Inventory + checkout: NOT STARTED
- Publication: NOT STARTED (durable pipeline; session prototype works)
- Owner experience: NOT STARTED
- Growth/sharing: IN PROGRESS (cell links only)
- Analytics: NOT STARTED (illustrative/local counters only)
