# Stripe questions to send together

Status: draft, not sent. Updated: 23 September 2026.
Append new unresolved provider/account questions here. Record dated answers under their question, then update the [payment decision](stripe-managed-payments.md). Keep answered questions for context.

## Copy-paste reply to Stripe

Hi Sandhiya,

Thank you for the detailed reply. It confirms the main points around product eligibility, merchant-of-record treatment and using the customer's billing-address country to block tax-unsupported jurisdictions.

I have four remaining questions so that we can configure the integration correctly:

1. You mentioned that the custom billing-country rule requires Radar for Fraud Teams. I believe our account currently has Radar Lite selected, and I do not want to take out a monthly Radar subscription. Stripe's current public pricing refers to Radar Plus rather than Radar for Fraud Teams. Which current Radar plan does our account need for this rule? Is there a pay-as-you-go option with no monthly subscription or minimum? Please confirm the charge per screened payment, whether blocked or failed attempts are charged, and whether there is any supported way to enforce this restriction without paying for an upgraded Radar plan.

2. Does the `:billing_address_country:` rule block an unsupported-country payment before it succeeds for every payment method that Managed Payments might offer, including Link and digital wallets? What happens if the billing country is missing, the customer uses saved Link or wallet details, or the customer changes their billing country during Checkout? If any payment method cannot reliably provide this attribute or could bypass the rule, can that payment method be disabled for our account?

3. Our prices must include tax and use fixed regional price points: GBP 1 per hexagon in the UK, EUR 1 per hexagon in our European pricing region, and USD 1 per hexagon in all other permitted countries. What is the supported way to implement those exact amounts and currencies with Managed Payments? The documentation says Managed Payments controls Adaptive Pricing, so can we stop automatic conversion from changing those customer-facing amounts? We use embedded Checkout Sessions. How should we handle a customer whose billing country entered during Checkout places them in a different pricing region from the price initially displayed on our website?

4. You confirmed that an invoice for a jurisdiction where Stripe cannot assume tax liability can show Birdcage Tech Ltd's configured address and tax IDs, while the payment receipt remains OneLink/Link branded. For a transaction where Managed Payments does assume tax liability, can Birdcage Tech Ltd's address or VAT details appear anywhere else visible to the customer, including their Link/Onelink account, payment confirmation or another document or screen? If so, please identify the circumstances and the relevant Dashboard settings.

To be clear, our intended setup is that customers in tax-unsupported jurisdictions cannot complete payment at all. We will not fall back to a transaction where Birdcage Tech Ltd is responsible for the customer's indirect tax.

Thanks again for your help.

Best,
Craig

## Internal answer tracking

1. **Country-rule cost:** partially answered. Priority Support confirmed that Radar for Fraud Teams is required for the custom rule. Current plan naming, account-specific inclusion, monthly versus pay-as-you-go availability and charges remain unanswered.
2. **Country-rule edge cases:** core approach answered. The later Priority Support email confirms the billing-country Radar rule. Individual payment methods, missing data, saved details and address changes remain unanswered.
3. **Exact regional, tax-inclusive prices:** unanswered.
4. **Remaining privacy surfaces:** partially answered. Merchant-liable invoice exposure and the Dashboard address location are confirmed. Other supported-country customer surfaces, particularly the Link/Onelink account, remain unanswered.

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
