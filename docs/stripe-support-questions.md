# Stripe questions to send together

Status: draft, not sent. Updated: 23 September 2026.
Append new unresolved provider/account questions here. Record dated answers under their question, then update the [payment decision](stripe-managed-payments.md). Keep answered questions for context.

## Message for Stripe

We are integrating Million Hexagons, a directly sold, automatically fulfilled digital placement purchased once, with no resale or investment element. We use embedded Checkout Sessions. Sandhiya from Priority Support confirmed that we can prevent purchases where Managed Payments cannot assume indirect-tax liability with a Radar custom rule using `:billing_address_country:` and the current tax-coverage allow-list. She also confirmed that this requires Radar for Fraud Teams and blocks the payment rather than converting it to a non-Managed Payments transaction.

We believe we selected Radar Lite. We want no monthly Radar subscription. Prices must include tax: GBP 1 per hexagon in the UK, EUR 1 in our European pricing region, and USD 1 in other permitted countries. Unsupported tax jurisdictions must not be charged at all. Please answer these questions for our account:

1. **Country-rule cost.** We understand a paid custom-rule tier is required. We believe we selected Radar Lite and do not want a monthly subscription. The email named Radar for Fraud Teams, while the current public site names Radar Plus. Which current plan is required on our account, and can we use it without a monthly subscription or minimum? Please confirm the per-screening charge, whether blocked/failed attempts are charged, and whether a supported no-additional-Radar-fee alternative can enforce the restriction before payment.

   Answer: **partially answered.** Priority Support confirmed that Radar for Fraud Teams is required for the custom rule. It did not confirm current plan naming, account-specific inclusion, monthly versus pay-as-you-go availability or charges.

2. **Country-rule edge cases.** Priority Support confirmed that `:billing_address_country:` with the current Managed Payments tax-coverage allow-list blocks unsupported-country payments. Does that rule apply before payment succeeds for every payment method Managed Payments offers, including Link and wallets? What happens when country is missing, saved details are used, or the customer changes billing country during Checkout? If any method can bypass or cannot supply the attribute, can it be disabled for our account?

   Answer: **core approach answered; edge cases pending.** The later Priority Support email supersedes the earlier chat's uncertainty and confirms the billing-country Radar rule. It does not discuss each payment method, missing data, saved details or address changes.

3. **Exact regional, tax-inclusive prices.** What supported setup keeps the final price at GBP 1 / EUR 1 / USD 1 per hexagon according to the confirmed billing country? Your documentation says Managed Payments controls Adaptive Pricing. Can we retain these exact regional amounts/currencies without automatic conversion changing the customer total? How should an embedded Checkout integration handle a billing-country change that moves the customer to another price region before payment?

   Answer: pending.

4. **Remaining privacy surfaces.** Priority Support confirmed that merchant-liable tax invoices can show Birdcage Tech Ltd's configured business address and tax IDs, while the payment receipt remains OneLink/Link branded. For transactions where Managed Payments does assume tax liability, can those details appear in the customer's Link/Onelink account, payment confirmations or any other customer surface? Please identify any exceptions and relevant settings.

   Answer: **partially answered.** The merchant-liable invoice exposure and Dashboard address location are confirmed. The reply does not explicitly answer every supported-country customer surface, particularly the Link/Onelink account.

## Keep out of the Stripe question list

- Product pre-approval: already answered; onboarding is not final approval and review follows live transactions.
- General product fit: already answered; Stripe says Million Hexagons aligns with the published eligibility criteria, subject to an eligible Product Tax Code and post-transaction review.
- Basic country blocking: already answered; use a maintained tax-coverage allow-list with `:billing_address_country:` on the required custom-rule tier. The payment is blocked and does not fall back to a standard Birdcage transaction.
- Europe versus eurozone membership: Craig's commercial decision, not Stripe's.
- UK VAT / FreeAgent treatment of payouts and self-billed invoices: for Change Accountants.
- Current tax-covered country list, API parameters and eligible tax-code catalogue: check public docs/Dashboard ourselves; ask Stripe only if the appropriate product classification remains ambiguous.
- Actual checkout/rule behaviour: test ourselves as well as obtaining provider guidance. A support answer is not implementation evidence.

## Work possible while answers are pending

Current implementation state:

- Implemented: an opt-in staging Managed Payments Checkout path with one-time payment mode, an eligible tax-code configuration requirement, explicit inclusive tax behaviour, API version `2025-03-31.basil` and unsupported `payment_method_types` removed. It is disabled by default and has not been exercised against Stripe because the account tax code and activation are not configured.
- Centralise regional prices, country mappings and server-generated quote snapshots. Keep the purchase-permission allow-list separate from pricing regions. Do not invent the unresolved EUR country mapping.
- Prototype the regional headline and matching Review price on staging, using estimated visitor country for display and a clear correction when confirmed billing country differs. Unknown location needs explicit currency wording. Do not publish a regional price promise until the checkout honours it.
- Exercise reservation release, duplicate/delayed webhooks, ownership and publication with test payments; prepare blocked/missing/changed-country and customer-document checks.

Wait for confirmed configuration before enabling paid Radar, claiming country enforcement is complete, or publishing exact regional checkout pricing. No real payments or subscription purchase is authorised by this list.
