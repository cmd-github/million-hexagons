# Production launch acceptance

This is the evidence checklist for opening Million Hexagons to real customers. Product principles remain in [Product direction](09-09-26-PRODUCT-DIRECTION.md); active sequencing and evidence state remain in [Status](STATUS.md).

Passing local builds, staging tests or browser emulation does not by itself close a production gate. Record the environment and evidence when each gate is accepted.

## Gate 1 - commercial and regulatory decisions

Owner: Craig, with qualified tax/legal advice where required. Product/commercial decisions are recorded in [the confirmed decisions and implementation plan](CRAIG-CONFIRMED-DECISIONS-AND-IMPLEMENTATION-PLAN.md); Gate 1 remains open for accountant advice, account configuration and test evidence.

- Configure Stripe Managed Payments/Link as Merchant of Record with fixed tax-inclusive GBP 1 UK / EUR 1 eurozone / USD 1 other permitted-country prices. IP/location is a display hint; billing country is authoritative. Reject unsupported tax jurisdictions and region mismatches; do not fall back to a Birdcage merchant-liable payment.
- Record Change Accountants' FreeAgent, UK VAT, payout and self-billed-invoice advice. Stripe Priority Support's 23-24 September answers and Craig's acceptance of residual country/privacy risk are already documented; this acceptance does not replace account/payment-method testing.
- Configure billing-address collection and supported-country allow-list. Enable Radar Plus only after confirming pay-as-you-go terms with no monthly/minimum commitment.
- Verify eligible Product Tax Code, inclusive tax, country/price behavior, customer-facing Link/receipt/invoice exposure and Stripe's current account settings.
- Implement and verify the decisions for refunds vs ownership revocation, dispute suspension/restoration/reversal, failed publication, immediate post-payment publication/moderation, required name, 10-10,000 purchase limits, explicit immediate-supply consent, seller/company contact, and service-duration-based cell-use wording.
- Publish final legally reviewed Terms and checkout copy, preserving mandatory consumer rights; governing law is England and Wales subject to those rights.
- Verify signed/idempotent payment fulfilment, no-refresh publication, decline/abandonment, duplicate/delayed webhooks, reservation recovery, fees/tax/net reconciliation and the actual customer documents in test mode.

Exit: recorded decisions, qualified advice, account configuration, Terms/checkout, support operations and end-to-end test evidence agree for the intended launch countries. No live payment is enabled by this gate alone.

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
