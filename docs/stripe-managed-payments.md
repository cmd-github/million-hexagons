# Stripe Managed Payments Decision

## Status

**Preferred direction: Stripe Managed Payments for Million Hexagons at launch, conditional on resolving the unsupported-country enforcement risk below.**

Stripe has now answered the batched [support questions](stripe-support-questions.md). Custom country rules require Radar Plus and are available at quoted pay-as-you-go list pricing of USD 0.07 per screened transaction, but Stripe does not guarantee the billing-country rule across every Managed Payments flow. This prevents the current design from honestly guaranteeing that Birdcage's details can never appear on a merchant-liable invoice.

Stripe Priority Support has confirmed that the Million Hexagons product model aligns with the published eligibility criteria for Managed Payments.

Million Hexagons is:

* a directly sold digital product;
* automatically fulfilled;
* not a marketplace;
* not an investment or financial asset;
* not intended for resale.

Stripe cannot provide definitive product approval before launch. Final eligibility review happens after the first live Managed Payments transaction.

This is an accepted platform risk.

## Support chronology and evidence limits

* **17 September 2026, Jordan/Jack chat:** Jack described the product as likely eligible, confirmed UK tax-covered checkout/standard receipts do not display Birdcage's address/VAT number, and described `LINK.COM* [statement descriptor]` and Link transaction support. He could not confirm country enforcement, warned that Radar country data was not necessarily the tax-jurisdiction source of truth, and escalated both enforcement and product eligibility. His suggestion to build a pre-session country check was provisional.
* **Later Sandhiya Priority Support email, supplied 22 September:** explicitly recommends `:billing_address_country:` with Radar for Fraud Teams and confirms product alignment, but no definitive pre-launch approval. This is the later support guidance we follow; preserve Jack's uncertainty as the reason to validate the actual integration, not as a competing implementation instruction.
* **Sandhiya follow-up, supplied 24 September:** confirms Radar Plus pay-as-you-go pricing and explicit regional prices, but says the country rule is only an additional control. Missing billing country, saved Link/wallet data, changes at payment time and some Link flows prevent Stripe from guaranteeing universal enforcement.
* None of the exchanges demonstrates our configuration working or guarantees that business details can never appear on every customer surface. Inspect checkout, receipts, invoices, confirmations and the Link customer account where available. Test purchases do not appear in the Link app, so that surface needs a genuine live-purchase check ([Stripe testing guidance](https://docs.stripe.com/payments/managed-payments/update-checkout#link)).

---

# Payment model

Million Hexagons will use:

**Stripe Managed Payments + OneLink/Link as Merchant of Record**

Where Stripe Managed Payments assumes indirect-tax liability:

* Stripe/OneLink is the Merchant of Record;
* Stripe handles applicable VAT, GST and sales-tax calculation, collection and remittance;
* customer receipts/invoices are issued through the Managed Payments structure;
* Birdcage Tech Ltd's address and VAT number are not normally displayed to the customer;
* Birdcage Tech's name may still appear in places such as the transaction descriptor.

This significantly reduces the tax/compliance burden of selling Million Hexagons internationally.

---

# Pricing decision

Craig confirmed on 22 September 2026 that prices per hexagon include tax:

| Buyer region | Tax-inclusive unit price |
| --- | --- |
| UK | GBP 1 |
| Eurozone | EUR 1 |
| USA and all other supported countries | USD 1 |

Use explicit inclusive tax behaviour; applicable tax comes out of the stated customer price. These are regional price points, not a request to exchange USD 1 into local currencies. Unsupported tax jurisdictions remain blocked.

Craig confirmed on 24 September 2026 that the EUR tier means the **eurozone**, excluding the UK. Other permitted countries use USD. Radar's billing-country allow-list determines permission to purchase, not the price or currency.

Stripe confirms that Adaptive Pricing remains enabled and cannot be disabled, but an explicitly selected GBP, EUR or USD price takes precedence. The server must select the correct explicit price before creating Checkout. If the customer's confirmed billing country changes the price region, reject or restart the Session with the correct price. The stated prices are therefore supported in principle but remain unverified in our account and integration.

See the [captured Dashboard setup instructions](stripe-managed-payments-setup.md). The automatic regional display and fixed-currency server quote are implemented in staging code; Managed Payments account configuration and a real regional Checkout Session remain unverified.

---

# Important jurisdiction restriction

Managed Payments cannot assume tax liability in every country.

If a customer purchases from a jurisdiction where Stripe cannot assume the tax liability:

* Birdcage Tech Ltd becomes responsible for the relevant tax obligations;
* the customer-facing tax invoice can identify Birdcage Tech Ltd;
* the invoice can include the business address configured in Stripe;
* the invoice can include Birdcage Tech's VAT or other tax IDs;
* Birdcage may potentially need to register and manage tax obligations in that jurisdiction.

Million Hexagons will therefore **not allow purchases from jurisdictions outside Stripe Managed Payments' supported tax-coverage list at launch**.

Sandhiya, Stripe Priority Support (message supplied by Craig on 22 September 2026), clarified that a merchant-liable invoice does **not** mean the payment becomes a standard Stripe transaction: it remains a Managed Payments transaction, and its payment receipt remains OneLink/Link branded. The tax invoice identifies Birdcage as the tax-liable party. A branded receipt alone is therefore not proof that Stripe assumed tax liability.

---

# Country enforcement

Stripe Priority Support confirmed that the appropriate mechanism is a **Radar custom rule using the customer's billing-address country**.

Do not use:

* IP country;
* card issuer country;
* geolocation;
* generic fraud-country signals.

The relevant Radar field is:

```text
:billing_address_country:
```

Conceptually:

```text
Block if :billing_address_country: not in (SUPPORTED_COUNTRIES)
```

The actual country list must be populated from Stripe's current [Managed Payments tax-supported jurisdictions](https://docs.stripe.com/payments/managed-payments/tax-compliance), including applicable seller-specific exceptions.

## Requirements

* Custom rules require **Radar Plus**, the current name for Radar for Fraud Teams; Radar Lite cannot create this rule.
* Stripe quoted pay-as-you-go list pricing of USD 0.07 per screened transaction, subject to the account Dashboard or contract. Allowed, blocked and reviewed screenings are charged; the same failed payment retry is not charged twice.
* Use the billing-address country as the country signal.
* Maintain an allow-list of countries covered by Managed Payments tax compliance.
* Block the payment if the billing-address country is not on the allow-list.
* Keep this allow-list easy to update as Stripe expands or changes coverage.

The country list should be treated as configuration rather than being scattered through application logic.

When the rule evaluates and matches, it blocks payment; it does not convert the transaction to non-Managed Payments or pre-approve the product. Support's example `Block if :billing_address_country: not in ('AT', 'AU', 'BE', ...)` is illustrative, not a complete deployable rule or country list.

Stripe expressly does not guarantee this rule as tax-jurisdiction enforcement. Missing billing country may not match; saved Link or wallet data can differ or be incomplete; the country can change at payment time; and the rule is not guaranteed in every Link flow. Stripe could not confirm that every problematic method can be disabled. Require billing-address collection, maintain the allow-list and test every offered payment method, but treat Radar as an additional control rather than the sole launch guarantee. A pre-session country selector can improve UX but cannot prove the final billing country is unchanged. A post-payment webhook rejection/refund is too late to guarantee no merchant-liable transaction or invoice occurred.

Do not implement the earlier chat's shipping-country workaround: the current [Managed Payments migration guide](https://docs.stripe.com/payments/managed-payments/update-checkout#remove-unsupported-parameters) prohibits `shipping_address_collection`. Do not assume generic Payment Element advice applies to our supported embedded Checkout integration.

---

# Checkout behaviour

The desired flow is:

```text
User designs placement
        ↓
User reviews placement and price
        ↓
Server selects explicit regional price
        ↓
Checkout requires billing-address country
        ↓
Country/price mismatch → reject and restart with correct price
        ↓
Radar applies supported-country allow-list as an additional control
        ↓
Successful Managed Payments transaction
        ↓
Million Hexagons order confirmed
        ↓
Ownership / placement published
```

An unsupported-country payment detected by our controls must **not** fall back to a standard Birdcage Tech transaction.

It must fail cleanly.

The user should receive an appropriate message explaining that purchasing is not currently supported in their country.

---

# Payment architecture

Managed Payments must remain reasonably isolated from the core Million Hexagons ownership model.

Do not tightly couple Stripe-specific objects to permanent ownership records.

The application should retain a separation such as:

```text
Payment Provider
      ↓
Successful Payment
      ↓
Internal Order
      ↓
Purchase
      ↓
Placement / Ownership
      ↓
Publication
```

This allows Stripe to be replaced or modified later without changing the fundamental ownership model.

The permanent ownership record should rely on Million Hexagons' own order/purchase identifiers rather than Stripe objects being the canonical source of ownership.

---

# Managed Payments eligibility

Stripe has stated that Million Hexagons aligns with the general Managed Payments eligibility criteria.

However:

* completing Managed Payments onboarding does not constitute final product approval;
* the Dashboard can show the account as ready before final product review;
* Stripe performs its substantive eligibility review once Managed Payments transactions begin;
* Stripe therefore cannot guarantee acceptance before the first live transaction.

## Launch implication

Do not make a major paid marketing push before Stripe has seen the first genuine transactions.

At launch:

1. enable Managed Payments;
2. make the site available;
3. allow initial low-value genuine purchases;
4. ensure Managed Payments remains active after Stripe's review;
5. then increase launch/marketing activity.

No artificial or fake transactions should be created purely to trigger review.

---

# Stripe product tax code

Every Million Hexagons product/payment must use a Product Tax Code that is eligible for Managed Payments.

The exact code should be selected during Stripe configuration based on the final categorisation available in the Stripe Dashboard.

The intended classification is broadly:

**automated digital / electronically supplied digital service**

Do not invent or hard-code a tax code from documentation without validating that it is currently eligible in Stripe.

---

# Business-address strategy

Birdcage Tech Ltd's Companies House registered office is being moved away from the director's home address to the accountant's office.

The intended structure is therefore:

```text
Companies House registered office
→ Accountant's address

Director service address
→ Accountant's address

HMRC VAT / principal place of business
→ Remains as required by HMRC

Supported-country customer transactions
→ Stripe / OneLink Merchant of Record

Unsupported-country transactions
→ Blocked
```

The objective is that the private/home VAT address does not become customer-facing through Million Hexagons transactions.

Stripe Priority Support directs us to **Dashboard -> Settings -> Business -> Public business information** to review the business address on file. An address configured there can appear on a merchant-liable tax invoice. Stripe's [tax-compliance documentation](https://docs.stripe.com/payments/managed-payments/tax-compliance#send-invoices-for-tax-unsupported-transactions) also points to invoice settings for invoice business/tax details. Check both before launch; do not infer privacy from OneLink/Link receipt branding.

---

# UK VAT and accounting

Stripe support has deliberately not provided advice about the VAT treatment of the payment between Stripe/OneLink and Birdcage Tech Ltd.

This is an accounting/tax question rather than a checkout implementation question.

Change Accountants have been asked to confirm:

> When Stripe/OneLink collects the customer's payment and subsequently pays Birdcage Tech Ltd under Stripe Managed Payments, how should that income be recorded in FreeAgent and treated on Birdcage Tech Ltd's UK VAT return?

They have also been asked how Stripe's Managed Payments self-billed invoices should be recorded.

## Until confirmed

Do not invent VAT treatment in the application or accounting automation.

The answer from Change Accountants should be documented here once received.

**Status: Pending accountant confirmation.**

---

# Fees

Managed Payments fees should be considered part of the transaction economics when finalising launch pricing.

Pricing logic should not assume that:

```text
£1 paid by customer = £1 received by Birdcage
```

The order model should retain separately:

* gross customer price;
* taxes where relevant;
* Stripe/Managed Payments fees;
* refunds;
* net proceeds to Birdcage.

Do not use net Stripe payout amounts as the canonical purchase price.

---

# Refunds

Refund behaviour should be handled through the Managed Payments model.

A refund must also trigger the appropriate Million Hexagons ownership/business logic.

Refunding a Stripe payment must not independently and silently remove ownership without an explicit application-level decision.

Order status and ownership state should remain separately controlled.

---

# Webhooks

Stripe webhooks must be treated as the authoritative payment-completion signal.

Do not grant permanent ownership merely because the browser reaches a "success" page.

The expected model is:

```text
Stripe payment succeeds
        ↓
Verified Stripe webhook received
        ↓
Order marked paid
        ↓
Ownership committed
        ↓
Placement publication triggered
```

Webhook handling must be:

* authenticated;
* idempotent;
* safe against duplicate delivery;
* able to recover from temporary processing failures.

---

# Inventory / race-condition requirement

Payment integration must preserve the Million Hexagons inventory guarantees.

A successful payment must never result in two users owning the same cells.

The checkout implementation therefore needs to integrate with the existing reservation/inventory architecture rather than treating payment success as an independent action.

Expected high-level flow:

```text
Cells selected
    ↓
Temporary reservation
    ↓
Checkout
    ↓
Payment succeeds
    ↓
Reservation converted atomically into ownership
```

If payment fails or expires, the reservation must eventually be released.

---

# Launch requirements

Before real payments are enabled:

* [ ] Stripe Managed Payments onboarding completed
* [ ] Appropriate Managed Payments Product Tax Code configured
* [ ] Radar/custom-rule capability enabled
* [ ] Current supported-country allow-list created
* [ ] Billing-address-country blocking rule configured
* [ ] Unsupported-country checkout tested
* [ ] Missing/changed country, saved Link/wallet details and all offered payment methods verified against country restrictions
* [ ] Supported-country checkout tested
* [ ] EUR region membership and exact tax-inclusive regional pricing verified with Managed Payments Adaptive Pricing
* [ ] Available customer-facing receipts/invoices/checkout checked for business-address and VAT exposure
* [ ] Stripe webhook verification implemented
* [ ] Webhook processing made idempotent
* [ ] Reservation → payment → ownership flow tested
* [ ] Failed-payment reservation release tested
* [ ] Refund behaviour tested
* [ ] Stripe fees represented correctly in internal order data
* [ ] Registered office/service address change completed
* [ ] Privacy Policy / Terms / checkout wording updated for Merchant of Record model
* [ ] Accountant confirms FreeAgent and UK VAT treatment
* [ ] Real low-value launch transactions monitored for Stripe eligibility review

---

# Ongoing maintenance

Managed Payments tax coverage can change.

The supported-country allow-list must therefore be treated as operational configuration.

Periodically verify:

* Stripe Managed Payments supported jurisdictions;
* Radar allow-list;
* product eligibility requirements;
* Product Tax Code eligibility;
* Managed Payments fees;
* any changes to customer-facing invoice behaviour.

Do not assume the country list configured at launch remains permanently correct.

---

# Current conclusion

Stripe Managed Payments remains the preferred launch payment model, but it has not yet met the absolute requirement that an unsupported-country purchase can never expose Birdcage's business details.

The chosen architecture is:

> **Stripe Managed Payments + OneLink/Link Merchant of Record + explicit regional prices + required billing address + Radar Plus allow-list as defence in depth.**

This is workable only if Craig accepts the residual enforcement risk or Stripe provides a narrower configuration that closes it. If the privacy requirement is absolute, another Merchant of Record or a provably restricted set of payment methods/countries must be assessed before launch.

## Next steps, in order

1. **Craig:** decide whether the residual country-enforcement/privacy risk is acceptable. If it is not, obtain a guaranteed narrower Stripe configuration or assess another Merchant of Record before further live-payment commitment. Do not buy Radar Plus merely to resolve this decision.
2. **Craig / Stripe:** finish onboarding and terms, confirm sandbox/test availability and select an eligible product tax code. Activation is not final product approval. Review business and invoice settings without substituting an inaccurate address.
3. **Development, test mode only:** configure explicit GBP/EUR/USD prices, server-side region selection and requoting, inclusive tax behaviour, required billing-address collection where supported, a maintained tax-coverage allow-list, and existing quotes, reservations and verified webhook fulfilment. No ordinary-payment fallback.
4. **Acceptance:** prove supported and blocked-country journeys, correct regional totals/taxes, customer-facing documents, failed/expired payment release, duplicate/delayed webhooks and successful ownership/publication. Country filtering must prevent payment, not merely prevent fulfilment after payment.
5. **Craig / accountant, alongside development:** obtain FreeAgent and UK VAT treatment for Stripe payouts/self-billed invoices; finish commercial terms, refunds, support responsibilities and accurate business-address configuration.
6. **Controlled live launch after gates pass:** configure live keys/webhooks and rules separately, monitor genuine initial purchases, inspect live Link/customer documents and Stripe eligibility review, then expand promotion. Test-mode success is not product approval or production verification.

Regional-pricing integration work can begin now. Live acceptance remains conditional on Craig's country-enforcement risk decision, account-level testing, accounting/commercial decisions and the repository's other launch gates.
