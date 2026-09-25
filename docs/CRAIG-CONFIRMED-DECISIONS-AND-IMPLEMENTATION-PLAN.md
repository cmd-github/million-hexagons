# Craig's confirmed decisions and implementation plan

Confirmed 25 September 2026. This document records current product/commercial decisions and translates them into implementation work. It is not final legal advice or evidence that account configuration or implementation work has passed acceptance. “Verified in code” describes the current checkout, not a live production guarantee.

These decisions supersede conflicting older wording in product notes, code comments, UI copy and draft terms. Preserve the current topology, permanent cell ownership records and working behavior unless a row below explicitly calls for a change.

## Confirmed product and commercial rules

### Payments and pricing

- Use Stripe Managed Payments with Link/OneLink as Merchant of Record; do not fall back to a Birdcage Tech merchant-liable transaction.
- Tax-inclusive fixed prices are GBP 1 per hexagon in the UK, EUR 1 in the eurozone and USD 1 in other permitted/supported countries.
- The server selects an explicit regional price. IP/location can suggest the initial display region only. If confirmed billing country and quoted region differ, reject/restart checkout at the correct fixed price.
- Do not sell into unsupported tax jurisdictions. Craig accepts Stripe's residual country/privacy risk and wants billing-address collection, a maintained allow-list, payment-method testing and Radar Plus as the strongest practical controls.
- Enable Radar Plus only if the account confirms the discussed pay-as-you-go price with no monthly or minimum commitment. Confirm the current account terms before enabling it.
- Managed Payments onboarding, eligible Product Tax Code/configuration and actual Stripe test transactions are still operational Gate 1 work. Accountant advice on FreeAgent/UK VAT treatment of payouts and self-billed invoices remains an external dependency until recorded.

### Ownership, payment, refunds and disputes

- A purchase grants the customer use of its claimed hexagons for as long as Million Hexagons operates, subject to the Terms, moderation and permitted enforcement. Do not promise legally unconditional or eternal “permanent ownership.”
- Payment/refund status and placement/ownership status are separate. A refund never automatically releases cells. Admin can refund without releasing cells, or revoke a placement/release its cells without refunding.
- Terms/moderation removal does not automatically create a refund. Refund exceptional cases separately.
- On a dispute, hide/suspend the placement while retaining its cells. Reinstate it if the dispute resolves for the customer. On an ultimately reversed payment, admin may revoke and release the cells.
- Technical publication failure after successful payment must preserve payment and ownership, retry/recover publication, and provide a full-refund route if delivery genuinely cannot be restored. Do not silently return the cells to inventory.
- UK consumer checkout must obtain explicit, legally reviewed consent/acknowledgement to begin immediate digital supply and the consequence for applicable cancellation rights. Preserve non-waivable statutory rights.
- No pre-publication human approval: successful payment -> ownership confirmed -> publish immediately -> moderate afterwards. Owner edits publish immediately and are moderated afterwards. Publication must appear in the current browser without a manual refresh. Admin can hide/revoke content for the listed legal, policy, safety, fraud, chargeback or exceptional reasons.

### Placement rights and owner tools

- At launch, owners cannot transfer/sell to another account, move/swap owned cells, or voluntarily release cells.
- Underlying owned hexagons remain fixed to the owner. The owner-management model should support multiple purchases and, as the owner tools are implemented, combining adjacent owned cells into one visual placement, splitting them into multiple visual placements, and applying artwork across any combination of owned cells.
- Owners can update name, description, website, artwork and colours, and temporarily hide content without surrendering ownership.
- Hidden/no-content cells remain visibly claimed and unavailable to buyers. Artwork is optional. A placement needs a name; image, logo, description, URL and custom cell colour are optional. Without artwork, show the normal claimed-cell treatment.
- Admin may remove/revoke placements and release cells when necessary, independently of payment/refund actions.

### Purchase, metadata, links and public data

- Minimum purchase: 10 hexagons. Self-service maximum: 10,000 per purchase; this is not a lifetime/account limit. Larger single-placement requests go through a “Planning something bigger? Contact us” route to the branded contact form.
- Name/title is required. Description, website and artwork are optional. Public hexagon count remains. Do not change hexagon-ID behavior in this work.
- Accept bare web domains and normalise to HTTPS. Reject unsafe/custom schemes. Outbound links open a new tab with `noopener noreferrer` protection.
- Placement views and outbound-link clicks are public and owner-visible, with privacy-conscious measurement and no invasive visitor profiles.
- Show the public claim/acquisition date directly beneath the placement name in small green-accent text. Never show the amount paid publicly.
- Birdcage Tech Ltd operates the product. Keep Million Hexagons as the customer-facing brand and disclose the company/legal information in appropriate legal/footer pages. Governing law is England and Wales, subject to mandatory local consumer rights.
- Use a Million Hexagons-branded support form routed internally to `support@birdcagetech.com`; do not create a separate support email account now. Provide legally required electronic contact details in the correct legal/contact location.

## Existing implementation checked

Checked against `src/main.js`, `index.html`, `src/staging-client.js`, `functions/placements.js`, `functions/index.js`, `functions/moderation.js`, `functions/payments.js`, `functions/payment-lifecycle.js`, `functions/analytics.js`, and the current payment/product docs on 25 September 2026.

| Area | Current evidence | Required follow-up |
|---|---|---|
| Regional prices | Fixed regional server quote path and staging UI are documented/deployed; account transactions are not thereby verified. | Keep; test billing-country match/mismatch, regional price, tax and unsupported-country rejection against configured Stripe test mode. |
| Stripe risk and support | Support questions are documented as sent 23 Sep and answered 24 Sep; Craig's residual-risk decision is recorded. | Keep the decision; verify Radar Plus account terms and implement/test the strongest accepted controls. |
| Title | Server `normalisePlacementClaim` rejects an empty title. | UI calls it optional and checkout/editor code substitutes “Untitled placement”; make it required visibly and remove silent fallback for new/edit submissions. |
| Quantity | UI and server paths currently allow up to 100,000; current launch UI minimum is 5. | Enforce minimum 10 and per-purchase maximum 10,000 consistently in UI, quote/reservation, checkout, fulfilment and owner flows. Add large-request contact route. |
| Immediate publication | Fulfilment creates ownership; a publication trigger compiles/publishes immutable content; current browser has poll/refresh paths. | Remove approval as a publication prerequisite, set accurate status, verify no-refresh appearance for purchase and edit; retain old version/retry recovery on failed publication. |
| Moderation | New records and edits are marked `moderationReview.status='pending'`; an admin review queue and moderation/takedown controls exist. | Convert this to post-publication review. Ensure queue labels/queries do not imply customers wait for approval. Do not remove audited reactive moderation controls. |
| Refund and revocation | Admin has separate refund and revoke controls; refund helper records ownership retained/pending-policy. Revocation releases cells. | Make independent outcomes explicit in UI, data and audit. Verify refund does not release cells and revocation does not issue a refund. |
| Disputes | `charge.dispute.created` marks order disputed and ownership pending review. | Suspend/hide immediately without releasing cells; handle customer-win restoration and final reversal/admin revocation; preserve idempotency and audit. |
| Failed publication | Durable version/publication retries and immutable releases exist; purchase/order recovery is present. | Verify paid ownership survives exhausted/retried publication failure; add visible support/full-refund resolution if delivery cannot be recovered. Never release cells automatically. |
| Cancellation consent | No evidence in checked Review/form flow of explicit immediate-supply acknowledgement. | Add checked, recorded consent where legally applicable before payment; have final language reviewed; do not waive non-waivable rights. |
| Ownership model | Each current placement fixes one exact cell set; My Globe edits content on that footprint. | Extend owner domain model to allocate fixed owned cells among multiple visual placements, merge adjacent owned cells and split presentation without transfer/release. Keep source purchase/ownership audit identity. |
| Hide/no artwork | Moderation can hide artwork or suspend content while claimed cells stay occupied; public neutral fallback exists. | Add owner-controlled temporary hide; verify explicit claimed appearance and no selection/purchase route. Verify valid name-only/no-artwork placement uses normal claimed visuals. |
| Website link | Browser normalises bare domains to HTTPS and validates HTTP(S); anchor in `index.html` already uses `_blank` with `noopener noreferrer`. | Keep; ensure server/admin edit paths share normalization and reject custom schemes. |
| Public metrics | Event model stores allowlisted placement views/outbound clicks; public placement API returns metrics; HUD renders them; owner summary also exists. | Keep one event/counter pipeline; verify the same public/owner values and document retention/deduplication. |
| Claim date and price | Placement API returns `createdAt`; inspector currently shows generic “New arrival” and no acquisition date. No public price field is rendered in the inspector. | Display formatted claim date beneath title in green small text. Keep paid amount private. |
| Support and legal pages | The operating entity/support contact and approved terms are not yet fully reflected across launch pages. | Add branded routed contact form and appropriate company/contact/legal details; verify statutory contact disclosures. |

## Implementation sequence and acceptance

### 0. External Gate 1 configuration

1. Record the accountant's actual FreeAgent, payout and UK VAT advice in `stripe-managed-payments.md`; do not leave a presumed answer or invent treatment.
2. In Stripe, complete Managed Payments activation/terms, select the eligible Product Tax Code, confirm inclusive tax, address collection and inspect public business/invoice settings.
3. Verify Radar Plus is genuinely PAYG with no monthly/minimum commitment; only then enable the supported-country allow-list/rule in test mode.
4. Confirm test-mode prices, supported jurisdictions and all offered payment methods. Do not enable live payments until launch approval.

### 1. Purchase form and server invariants

1. Make name required and clear in Review; remove “Untitled placement” as a successful checkout fallback.
2. Set and enforce 10 minimum / 10,000 per-purchase maximum at every trust boundary, including quote/reserve and checkout; preserve multiple purchases above 10,000 total.
3. Add the larger-placement contact route. Preserve current destination URL normalisation and secure new-tab behavior.
4. Implement legally reviewed immediate-supply acknowledgement and record the version/choice with the order before payment where required.

Acceptance: invalid names, sizes 1-9 and sizes above 10,000 cannot reserve or create checkout; exactly 10 and 10,000 work; repeated purchases are not blocked by account lifetime total; unsafe schemes fail; bare domains normalise; the legal acknowledgement is explicit, recorded, and does not contract out of mandatory rights.

### 2. Fulfilment, publication and moderation lifecycle

1. Ensure signed, idempotent payment fulfilment atomically preserves paid order, ownership grant and claimed inventory.
2. Publish the new content immediately after payment and each owner edit, with no pending approval gate; update the active browser without refresh.
3. Keep manual moderation post-publication with reasoned audit. Hide/suspend content without releasing owned cells; keep hidden cells visually claimed and unavailable.
4. On publication failure, retain payment/ownership/cells and retry/reconcile. Provide support and a separately controlled full refund if delivery is genuinely unrecoverable.

Acceptance: successful payment creates one ownership claim despite duplicate/delayed webhooks; current globe shows it without refresh; failed publication never returns its cells to availability; post-publication takedown keeps the claimed outline/state and records an admin action.

### 3. Refunds, disputes and admin separation

1. Keep refund command and placement revocation/release as separate explicit admin operations and audit records.
2. On dispute-created, hide the placement and retain inventory; on customer-favourable resolution, restore eligible content; on final reversal, permit a separately authorised admin revocation/release.
3. Reconcile payment gross, taxes, fees, refunds and net payouts without using net payout as the purchase price.

Acceptance: refund-only retains ownership; revoke-only releases inventory without issuing a refund; dispute hides and retains cells; a won dispute restores; final reversal changes ownership only through the explicit revocation action. Duplicate provider events are idempotent.

### 4. Owner-managed cells and content

1. Evolve the owner model from editing one immutable footprint to managing a ledger/set of fixed owned cells.
2. Permit owner-directed merge of adjacent owned cells and split of visual groupings while preserving exact cell ownership, provenance, URLs/history and metrics rules.
3. Add temporary owner hide/unhide and valid name-only/no-artwork display.
4. Keep owner transfers, cell movement/swap and voluntary relinquishment unavailable at launch; keep admin release audited.

Acceptance: ownership cell IDs never change; only verified owner actions regroup presentation; no group action frees cells or transfers to another owner; hidden/unpainted cells remain claimed.

### 5. Public placement details, support and launch terms

1. Show the acquisition date beneath placement name; retain public hex count and public/owner views and visits; never expose purchase amount.
2. Add the branded support/contact form routed internally to `support@birdcagetech.com`, plus legally required company/contact disclosure.
3. Finalise Terms for service-duration-based cell-use rights, moderation/revocation, separate refund/ownership actions, disputes, failed publication, immediate supply/cancellation, no transfers/movement/voluntary release, England and Wales law, and mandatory consumer rights.

Acceptance: public and owner metrics agree; date is sourced from authoritative claim time; payment value is absent from public API/UI; support submissions reach the internal route without unnecessarily exposing it in primary UI; legal copy matches runtime behavior and qualified review.

## Stripe end-to-end Gate 1 evidence still required

Do not close Gate 1 because the commercial decisions are now made. Capture environment-specific evidence for onboarding/activation, Product Tax Code, inclusive tax, billing address, allow-list and PAYG Radar terms, regional amounts, supported checkout, unsupported rejection, country/price mismatch, customer-visible Link/receipt/invoice information, successful test payment, signed/idempotent webhook, ownership, immediate/no-refresh publication, decline/abandonment, delayed/duplicate events, expiry/recovery, refund/dispute outcomes and gross/tax/fee/net reconciliation.

The previously observed “Could not open secure checkout. Your design is still here.” message is secondary until account activation and Product Tax Code setup are complete. Capture an obvious cause if apparent. Re-run checkout after configuration; if it still fails, diagnose it as an implementation defect.

## Decision references

- [Stripe Managed Payments](stripe-managed-payments.md)
- [Stripe support answers](stripe-support-questions.md)
- [Draft commercial terms](DRAFT-COMMERCIAL-TERMS.md)
- [Launch acceptance](LAUNCH-ACCEPTANCE.md)
- [Operational status](STATUS.md)
