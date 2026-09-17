# Production launch acceptance

This is the evidence checklist for opening Million Hexagons to real customers. Product principles remain in [Product direction](09-09-26-PRODUCT-DIRECTION.md); active sequencing and evidence state remain in [Status](STATUS.md).

Passing local builds, staging tests or browser emulation does not by itself close a production gate. Record the environment and evidence when each gate is accepted.

## Gate 1 - commercial and regulatory decisions

Owner: Craig, with qualified tax/legal advice where required.

- Approve the price and currency shown before reservation and charged by Stripe.
- Decide VAT/sales-tax handling, evidence required from buyers, invoice/receipt content and who is merchant/seller of record.
- Approve refund, cancellation, dispute and failed-publication outcomes, including whether ownership is retained or revoked.
- Approve the permanent-use wording, moderation rights, seller identity, governing law and customer-support route.
- Translate the decisions into server pricing/configuration, customer copy, operational actions and tests; no contradictory hard-coded regional prices remain.

Exit: the decision record and customer terms agree with checkout, receipts, refunds and support operations in the intended launch countries.

## Gate 2 - first-time-user usability

- Observe 5-10 people who have not seen the product attempt Explore -> Location -> Shape -> Design -> Review -> test Checkout on a mix of desktop and phone.
- Record whether each person understands the million-cell scarcity, price, permanence/editability, selected quantity, final artwork and what happens after payment.
- Record unaided completion, time to Review, abandonment point and facilitator intervention without coaching participants through the interface.
- Fix repeated blockers and high-risk misunderstandings; redesign Create a placement only where evidence shows the current interface is failing.
- Re-run affected journeys after changes and retain anonymised findings without payment details or unnecessary personal data.

Exit: no repeated critical usability failure or material purchase misunderstanding remains unresolved.

## Gate 3 - artwork scale and physical devices

- Execute the specified 1k/10k/100k/1M varied-image matrix with cold/warm loading, sustained navigation, publication changes, faults and recovery.
- Establish and meet explicit loading, detail, memory and publication budgets for the launch configuration.
- Verify real iOS and Android devices across Explore, Create, Nearby, activity, Review, Checkout mount/release, restoration, ownership access and sharing.
- Confirm the deployed background and sparse real-cell twinkles remain legible, accessible and performant; do not reopen alternative surface studies unless device evidence finds a problem.

Exit: the chosen production artwork runtime and physical-device journeys meet recorded budgets without correctness, memory or interaction failures.

## Gate 4 - purchase-to-share

- A completed purchase leads directly to a useful branded share moment tied to the permanent `placementId` URL.
- Approve the memento/card, headline, Open Graph image and supported destinations on desktop and mobile.
- Define pending-artwork, asset-generation failure, unsupported native sharing and copy-link fallbacks.
- The buyer can revisit the share experience after leaving checkout; sharing is not available only in transient completion state.
- Capture privacy-minimal share events and verify the complete purchase -> publication -> share -> recipient-link journey.

Exit: a fresh controlled purchase passes the durable sharing journey on desktop and mobile.

## Gate 5 - public website, legal and customer acceptance

- Approve and publish the headline plus indexable public routes, unique metadata/canonicals, correct 404, favicon set, `robots.txt`, sitemap and Open Graph output.
- Publish terms, privacy, storage/cookie disclosure, content policy, refund/purchase terms and seller/contact identity; link them before payment and in persistent navigation.
- Gate non-essential analytics on consent where required and document browser/server storage.
- Verify semantic content, meaningful image alternatives, keyboard access, focus, contrast, loading/empty/success/error states and recoverable form failures.
- Test the complete anonymous visit -> purchase -> confirmation -> owner recovery journey against production-like configuration.

Exit: public pages and the purchase journey satisfy the approved commercial/legal decisions and customer-facing acceptance checks.

## Gate 6 - production cutover rehearsal

- Create and review separate production Firebase, Storage, R2/Cloudflare and Stripe live-mode configuration; staging secrets and resources cannot be reused accidentally.
- Configure the production R2 custom domain/cache policy, Firebase/Auth authorised domains, Stripe webhook endpoints/events, least-privilege credentials and server-controlled checkout enablement.
- Inventory DNS, certificates, mail records, redirects and current Firebase coming-soon/waitlist storage before changes; export the waitlist and preserve a rollback artifact.
- Rehearse deploy, smoke checks, checkout disabled/enabled transitions, DNS/domain switch and rollback without losing ownership, payments, source artwork or waitlist data.
- Verify the production hostname, CSP, CORS, caching, indexing controls, permanent links and webhook signatures before accepting real money.

Exit: a timed rehearsal has named operators, commands, evidence, rollback criteria and no unresolved production-only configuration gap.

## Gate 7 - operational safety

- Back up authoritative ownership, orders, placement versions and private artwork sources; perform a restore drill into an isolated environment.
- Demonstrate that public R2 placement output can be regenerated from authoritative records and private sources without changing permanent identity.
- Alert on failed/stale publication jobs, webhook failures, reconciliation mismatches, unresolved paid orders, public availability failures and exhausted capacity/budgets.
- Configure Cloudflare/Firebase/Stripe budget or anomaly notifications as available, name the recipient and escalation route, and confirm delivery with a safe test.
- Document refund, moderation, takedown, rollback, credential rotation, provider outage and support-response runbooks.

Exit: backups and regeneration are proven, production alerts reach a named human, and launch-day rollback/support ownership is explicit.

## Does not block launch

Unless evidence from the gates above exposes a launch defect, do not delay launch for:

- four-value or defensible impression-style HUD analytics beyond existing basic measurements;
- connected-purchase merging;
- further globe surface/illumination studies;
- achievements, rankings or richer advertiser dashboards;
- speculative Create redesign or studio-layout work not supported by usability findings.
