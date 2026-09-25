# Stripe questions to send together

Status: sent by Craig on 23 September 2026; answered by Stripe Priority Support on 24 September 2026.
Append new unresolved provider/account questions here. Record dated answers under their question, then update the [payment decision](stripe-managed-payments.md). Keep answered questions for context.

## Copy-paste reply to Stripe

Hi Sandhiya,

Thank you for the detailed reply. It confirms the main points around product eligibility, merchant-of-record treatment and using the customer's billing-address country to block tax-unsupported jurisdictions.

I have four remaining questions so that we can configure the integration correctly:

1. You mentioned that the custom billing-country rule requires Radar for Fraud Teams. I believe our account currently has Radar Lite selected, and I'd rather not take out a monthly Radar subscription. Stripe's current public pricing refers to Radar Plus rather than Radar for Fraud Teams. Which current Radar plan does our account need for this rule? Is there a pay-as-you-go option with no monthly subscription or minimum? Please confirm the charge per screened payment, whether blocked or failed attempts are charged, and whether there is any supported way to enforce this restriction without paying for an upgraded Radar plan.

2. Does the `:billing_address_country:` rule block an unsupported-country payment before it succeeds for every payment method that Managed Payments might offer, including Link and digital wallets? What happens if the billing country is missing, the customer uses saved Link or wallet details, or the customer changes their billing country during Checkout? If any payment method cannot reliably provide this attribute or could bypass the rule, can that payment method be disabled for our account?

3. Our prices must include tax and use fixed regional price points: GBP 1 per hexagon in the UK, EUR 1 per hexagon in our European pricing region, and USD 1 per hexagon in all other permitted countries. What is the supported way to implement those exact amounts and currencies with Managed Payments? The documentation says Managed Payments controls Adaptive Pricing, so can we stop automatic conversion from changing those customer-facing amounts? We use embedded Checkout Sessions. How should we handle a customer whose billing country entered during Checkout places them in a different pricing region from the price initially displayed on our website?

4. You confirmed that an invoice for a jurisdiction where Stripe cannot assume tax liability can show Birdcage Tech Ltd's configured address and tax IDs, while the payment receipt remains OneLink/Link branded. For a transaction where Managed Payments does assume tax liability, can Birdcage Tech Ltd's address or VAT details appear anywhere else visible to the customer, including their Link/Onelink account, payment confirmation or another document or screen? If so, please identify the circumstances and the relevant Dashboard settings.

To be clear, our intended setup is that customers in tax-unsupported jurisdictions cannot complete payment at all. We will not fall back to a transaction where Birdcage Tech Ltd is responsible for the customer's indirect tax.

Thanks again for your help.

Best,
Craig

## Internal answer tracking

1. **Country-rule cost:** answered. Custom rules require Radar Plus, the current name for Radar for Fraud Teams; they are unavailable on Radar Lite. Stripe quoted pay-as-you-go list pricing of USD 0.07 per screened transaction, subject to the account's Dashboard or contract. Allowed, blocked and reviewed screenings are charged; retrying the same failed payment is not charged twice. Stripe offers no free-tier custom-rule alternative.
2. **Country-rule edge cases:** answered with a material limitation. The rule evaluates the billing country available on the payment method or billing address, not IP, issuer country or an address stored only on the Customer. Stripe does not guarantee it as tax-jurisdiction enforcement across missing data, saved Link/wallet details, changes at payment time or every Link flow, and could not confirm that every problematic payment method can be disabled. Stripe recommends requiring billing-address collection, maintaining the allow-list and testing every offered method, with Radar as an additional control rather than the sole guarantee.
3. **Exact regional, tax-inclusive prices:** answered. Create explicit GBP 1, EUR 1 and USD 1 prices and have the server select the applicable price before creating the embedded Checkout Session. Explicitly selected multi-currency prices take precedence, although Adaptive Pricing remains enabled and cannot be disabled. Configure inclusive tax behaviour. If the confirmed billing country belongs to a different price region, reject or restart Checkout with the correct price.
4. **Remaining privacy surfaces:** answered only to Stripe's documented limit. For a tax-covered transaction the receipt remains Link branded and Stripe's current guidance does not list Birdcage's address or VAT details as standard receipt content. Stripe would not give an exhaustive guarantee for every customer-facing surface. Merchant-liable invoices remain the known exposure case.

## Keep out of the Stripe question list

- Product pre-approval: already answered; onboarding is not final approval and review follows live transactions.
- General product fit: already answered; Stripe says Million Hexagons aligns with the published eligibility criteria, subject to an eligible Product Tax Code and post-transaction review.
- Basic country blocking: Stripe recommends a maintained tax-coverage allow-list with `:billing_address_country:` on Radar Plus, but expressly says this is an additional control rather than a guaranteed tax-jurisdiction gate.
- Europe versus eurozone membership: resolved by Craig on 24 September 2026; use the eurozone for EUR, the UK for GBP and USD for other permitted countries.
- UK VAT / FreeAgent treatment of payouts and self-billed invoices: for Change Accountants.
- Current tax-covered country list, API parameters and eligible tax-code catalogue: check public docs/Dashboard ourselves; ask Stripe only if the appropriate product classification remains ambiguous.
- Actual checkout/rule behaviour: test ourselves as well as obtaining provider guidance. A support answer is not implementation evidence.

## Implementation consequences

Current implementation state:

- Implemented: an opt-in staging Managed Payments Checkout path with one-time payment mode, an eligible tax-code configuration requirement, explicit inclusive tax behaviour, API version `2025-03-31.basil` and unsupported `payment_method_types` removed. It is disabled by default and has not been exercised against Stripe because the account tax code and activation are not configured.
- Centralise explicit GBP, EUR and USD prices, the agreed UK/eurozone/other country mapping and server-generated quote snapshots. Keep the purchase-permission allow-list separate from pricing regions.
- Prototype the regional headline and matching Review price on staging, using estimated visitor country for display and restarting/requoting when confirmed billing country differs. Unknown location needs explicit currency wording. Do not publish a regional price promise until the checkout honours it.
- Exercise reservation release, duplicate/delayed webhooks, ownership and publication with test payments; prepare blocked/missing/changed-country and customer-document checks.
- Treat Radar Plus as a paid defence in depth control, not proof that unsupported-country payments cannot succeed. Craig accepted the known residual risk on 24 September 2026, subject to testing the exact launch configuration.

Verify that Radar Plus is available to this account on the quoted pay-as-you-go basis without a monthly subscription or minimum before enabling it. Do not claim country enforcement is complete until the configured flows pass testing. No real payments are authorised by this list.
