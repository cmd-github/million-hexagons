# Stripe questions to send together

Status: draft, not sent. Updated: 23 September 2026.
Append new unresolved provider/account questions here. Record dated answers under their question, then update the [payment decision](stripe-managed-payments.md). Keep answered questions for context.

## Message for Stripe

We are integrating Million Hexagons, a directly sold, automatically fulfilled digital placement purchased once, with no resale or investment element. We use embedded Checkout Sessions. Your earlier replies recommended Managed Payments with a billing-address-country Radar allow-list to prevent purchases where Stripe cannot assume indirect-tax liability.

We believe we selected Radar Lite. We want no monthly Radar subscription. Prices must include tax: GBP 1 per hexagon in the UK, EUR 1 in our European pricing region, and USD 1 in other permitted countries. Unsupported tax jurisdictions must not be charged at all. Please answer these questions for our account:

1. **Country-rule access and cost.** Is the recommended billing-country rule included with our Managed Payments account or Radar Lite? If not, which plan is required (your email said Radar for Fraud Teams; the public site now lists Radar Plus), and can we use it without a monthly subscription or minimum? Please confirm the per-screening charge and whether blocked/failed attempts are charged. Is there a supported no-additional-Radar-fee alternative that enforces the restriction before payment?

   Answer: pending.

2. **Reliable blocking across payment methods.** Does `:billing_address_country:` reliably enforce the Managed Payments tax-coverage allow-list for every payment method our checkout offers, including Link and wallets? What happens when country is missing, saved details are used, or the customer changes billing country during Checkout? Please give the supported configuration that prevents an unsupported-country payment from succeeding, and explain any difference between this field and the country used to determine tax liability. Our earlier chat raised uncertainty; the later email recommended Radar. If any methods bypass the rule, can you disable those methods for our Managed Payments account?

   Answer: pending.

3. **Exact regional, tax-inclusive prices.** What supported setup keeps the final price at GBP 1 / EUR 1 / USD 1 per hexagon according to the confirmed billing country? Your documentation says Managed Payments controls Adaptive Pricing. Can we retain these exact regional amounts/currencies without automatic conversion changing the customer total? How should an embedded Checkout integration handle a billing-country change that moves the customer to another price region before payment?

   Answer: pending.

4. **Remaining privacy surfaces.** For transactions where Managed Payments assumes tax liability, can Birdcage Tech Ltd's address or VAT details appear in the customer's Link/Onelink account, payment confirmations, or other customer documents beyond the standard checkout/receipt surfaces already discussed? Please identify any exceptions and relevant settings. We understand unsupported-country tax invoices can expose these details and intend to block those purchases.

   Answer: pending.

## Keep out of the Stripe question list

- Product pre-approval: already answered; onboarding is not final approval and review follows live transactions.
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
