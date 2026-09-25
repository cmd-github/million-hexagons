# Gate 1: decisions and payment checks

This earlier checklist is superseded for current product/commercial decisions and implementation order by [Craig's confirmed decisions and implementation plan](CRAIG-CONFIRMED-DECISIONS-AND-IMPLEMENTATION-PLAN.md). Use that document as the current source; this note preserves Stripe/account evidence context only. It records repository evidence as of 25 September 2026; unchecked means not evidenced here, not necessarily unfinished outside the repository.

## Current position

- Stripe Managed Payments is the preferred launch direction.
- Stripe Priority Support answered the questions about Radar pricing, billing-country enforcement, fixed regional prices and customer-facing business details. The answers and their limits are in [Stripe support questions](stripe-support-questions.md).
- Craig accepted the residual country/privacy risk on 24 September 2026 and chose to proceed with Stripe Managed Payments using the strongest practical controls described below. This accepts that Stripe does not guarantee Radar's billing-country rule across every payment method or customer flow; it does not waive the requirement to test the exact launch configuration.
- Tax-inclusive regional pricing is decided as GBP 1 per hexagon in the UK, EUR 1 in the eurozone and USD 1 elsewhere in the supported region. The authoritative region selection and quote path is deployed to staging (Worker `d22c0f62`, release `6121418c`).
- The repository's accountant section still says confirmation is pending. It records a question to Change Accountants about FreeAgent and UK VAT treatment of Managed Payments payouts and self-billed invoices. This does not establish whether a reply exists outside the repository.
- The Managed Payments path is implemented behind configuration but documented as disabled by default and not yet exercised against Stripe. The payment doc says activation and an eligible Product Tax Code are not configured.
- The 24 September review reports: “Could not open secure checkout. Your design is still here.” Its cause has not been established.

## Decisions recorded from Craig's Stripe discussion

- Use Stripe Managed Payments with OneLink/Link as Merchant of Record where Stripe assumes indirect-tax liability.
- Charge tax-inclusive fixed unit prices: GBP 1 in the UK, EUR 1 in the eurozone and USD 1 in every other permitted country. Do not use exchange-rate conversion to alter those customer totals.
- Detect the visitor's country automatically to choose the initial website currency and headline. Treat that detection as a display hint, provide a visible correction for VPN/travel errors, and let the server create the authoritative regional quote.
- Pass the resulting authoritative sale to Stripe Checkout. If the confirmed billing country belongs to another price region, reject or restart Checkout with the correct fixed price.
- Do not allow purchases from jurisdictions outside Stripe Managed Payments' current tax-coverage list and do not fall back to a merchant-liable Birdcage transaction.
- Accept Stripe's residual enforcement/privacy limitation and proceed with billing-address collection, a maintained supported-country allow-list, testing of every offered payment method, and Radar Plus as defence in depth.
- Use Radar Plus only on the pay-as-you-go basis quoted by Stripe, subject to confirming the account's current price and absence of a monthly subscription or minimum in the Dashboard/contract. Craig did not agree to a GBP 12 monthly subscription.
- Keep Managed Payments, paid Radar configuration and live payments disabled until the account setup and test-mode checks in this note pass.

## Outstanding operations and external inputs

### 1. Accountant's FreeAgent and VAT treatment

Check whether Change Accountants has replied to the existing questions:

1. How should income collected from the customer by Stripe/OneLink and paid out to Birdcage Tech Ltd be recorded in FreeAgent and treated on the UK VAT return?
2. How should Stripe Managed Payments self-billed invoices be recorded?

If the answer has arrived, record its date, the advice or a concise faithful summary, and any conditions in [Stripe Managed Payments](stripe-managed-payments.md). Then remove the pending status and checklist item there. If no answer has arrived, this remains an external dependency; do not infer tax treatment in product code.

### 2. Residual country and privacy risk

Craig has accepted the known residual risk and selected these proposed controls for test configuration:

- collect the billing address;
- maintain an allow-list of countries where Managed Payments assumes tax liability;
- configure the applicable Radar Plus billing-country rule after confirming the pay-as-you-go account terms;
- test every payment method offered, including Link and wallets where available;
- prevent unsupported or mismatched-region payments from completing, not merely from being fulfilled.

Stripe's response explicitly limits the guarantee: billing-country data may be missing, changed, or handled differently in saved Link/wallet flows. Radar is defence in depth, not proof of tax-jurisdiction enforcement. If the requirement is that an unsupported-country purchase can never expose Birdcage's business details, the documented configuration does not prove that requirement. The known invoice exposure on merchant-liable transactions and the residual uncertainty on other customer-facing surfaces must remain visible in the decision.

Radar Plus pricing was quoted by Stripe Priority Support as USD 0.07 per screened transaction at pay-as-you-go list pricing; verify the account's current Dashboard/contract price before enabling it. Stripe said allowed, blocked and reviewed screenings are charged, while retrying the same failed payment is not charged twice.

### 3. Product/commercial decisions

Craig has confirmed these decisions in the linked current implementation plan. They are no longer an open decision-gathering task: fixed tax-inclusive regional pricing; Stripe Managed Payments/Link with accepted residual country/privacy risk; no Birdcage merchant-liable fallback; refund and ownership separation; dispute suspension/recovery; immediate publication followed by moderation; service-duration-based cell-use rights; England and Wales law subject to mandatory consumer rights; branded support form; and the 10–10,000 self-service range.

Remaining work is to implement the decisions, record the accountant's treatment when received, configure Stripe, and obtain qualified review of final legal wording. Keep payment/refund and ownership/inventory actions explicitly separate.

### 4. Stripe account and configuration

The account-side checklist in [Stripe Managed Payments](stripe-managed-payments.md) should be marked only from current Dashboard evidence:

- complete Managed Payments onboarding and terms;
- select an eligible Product Tax Code and verify inclusive-tax behavior;
- review the business/public address and invoice settings, including the planned registered-office/service-address change;
- confirm Radar Plus pay-as-you-go account terms and configure the supported-country rule in test mode;
- confirm the current tax-coverage allow-list and customer-facing document behavior;
- verify that explicit GBP/EUR/USD prices remain the customer totals and that Adaptive Pricing cannot silently change the intended amounts;
- confirm account activation and test-mode availability.

Do not infer completion from source code, staging deployment, or Stripe documentation alone. Do not enable live payments as part of this checklist without the launch gates' separate production approval.

### 5. Payment and failure-path verification

After test-mode configuration is available, use a controlled test run to verify:

- supported-country checkout, exact regional currency/amount and tax presentation;
- unsupported, missing and changed billing-country behavior for each offered payment method;
- customer-facing Checkout, Link, receipt and invoice details for business-address/VAT exposure;
- successful test payment, signed and idempotent webhook fulfillment, ownership creation and publication;
- decline, abandonment/expiry, duplicate or delayed webhooks and reservation release/reconciliation;
- refund processing and the explicitly decided ownership outcome;
- Stripe fees and gross/tax/net amounts represented correctly in order records.

Existing controlled browser journeys and backend payment tests do not by themselves prove an actual Stripe Checkout Session or end-to-end Stripe webhook lifecycle. The payment validation procedure is documented in [VALIDATION.md](VALIDATION.md#payment-lifecycle).

### 6. Secure-checkout report (after account setup)

Do not prioritise a broad investigation before Managed Payments activation and eligible Product Tax Code setup. Capture an obvious cause if readily visible. Re-run checkout after that configuration; if it still fails, reproduce the exact report in the environment where it occurred and capture:

- route and checkout action immediately before the error;
- browser/device, timestamp and selected pricing region;
- whether a reservation was created and whether it was released;
- the sanitized application/API error and relevant server/Stripe test-mode logs;
- whether retry or reload recovers without losing the reviewed design.

Classify the cause as account/configuration, Stripe session creation, application/API failure, or transient network/browser failure. Fix and rerun the affected journey. Preserve the design and reservation-recovery guarantees; never include secrets or payment credentials in evidence.

## Suggested order

1. Record accountant's FreeAgent/UK VAT advice when received.
2. Complete account onboarding, tax-code and agreed address/privacy configuration in Stripe test mode; verify Radar's no-monthly/minimum PAYG terms first.
3. Re-run checkout and complete payment/country/webhook/reservation/refund/dispute/publication/customer-document checks against configured test mode.
4. Investigate the secure-checkout message fully only if it persists after setup, unless a clear cause appears sooner.
5. Implement the remaining product decisions using the linked plan, then update [Stripe Managed Payments](stripe-managed-payments.md), [launch acceptance](LAUNCH-ACCEPTANCE.md) and [operational status](STATUS.md) from evidence. Keep live-payment and production launch decisions in their separate gates.

## Source notes

- [Stripe Managed Payments decision](stripe-managed-payments.md)
- [Stripe support answers](stripe-support-questions.md)
- [Production launch acceptance](LAUNCH-ACCEPTANCE.md)
- [Payment lifecycle validation](VALIDATION.md#payment-lifecycle)
- [24 September Craig review](craig-review-24-09-26)
