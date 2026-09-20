# Stripe Managed Payments Decision

## Status

**Decision: Use Stripe Managed Payments for Million Hexagons at launch.**

Stripe Priority Support has confirmed that the Million Hexagons product model aligns with the published eligibility criteria for Managed Payments.

Million Hexagons is:

* a directly sold digital product;
* automatically fulfilled;
* not a marketplace;
* not an investment or financial asset;
* not intended for resale.

Stripe cannot provide definitive product approval before launch. Final eligibility review happens after the first live Managed Payments transaction.

This is an accepted platform risk.

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

# Important jurisdiction restriction

Managed Payments cannot assume tax liability in every country.

If a customer purchases from a jurisdiction where Stripe cannot assume the tax liability:

* Birdcage Tech Ltd becomes responsible for the relevant tax obligations;
* the customer-facing tax invoice can identify Birdcage Tech Ltd;
* the invoice can include the business address configured in Stripe;
* the invoice can include Birdcage Tech's VAT or other tax IDs;
* Birdcage may potentially need to register and manage tax obligations in that jurisdiction.

Million Hexagons will therefore **not allow purchases from jurisdictions outside Stripe Managed Payments' supported tax-coverage list at launch**.

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

The actual country list must be populated from Stripe's current Managed Payments tax-supported jurisdictions.

## Requirements

* Enable the Stripe product/tier required for custom Radar rules.
* Use the billing-address country as the country signal.
* Maintain an allow-list of countries covered by Managed Payments tax compliance.
* Block the payment if the billing-address country is not on the allow-list.
* Keep this allow-list easy to update as Stripe expands or changes coverage.

The country list should be treated as configuration rather than being scattered through application logic.

---

# Checkout behaviour

The desired flow is:

```text
User designs placement
        ↓
User reviews placement and price
        ↓
Checkout initiated
        ↓
Stripe obtains billing-address country
        ↓
Radar checks country against supported-country allow-list
        ↓
Supported → payment continues
Unsupported → payment blocked
        ↓
Successful Managed Payments transaction
        ↓
Million Hexagons order confirmed
        ↓
Ownership / placement published
```

A blocked unsupported-country payment must **not** fall back to a standard Birdcage Tech transaction.

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
* [ ] Supported-country checkout tested
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

Stripe Managed Payments is the selected launch payment model for Million Hexagons.

The chosen architecture is:

> **Stripe Managed Payments + OneLink/Link Merchant of Record + billing-address-country allow-list restricting purchases to Managed Payments tax-supported jurisdictions.**

This gives Million Hexagons a practical way to sell internationally while avoiding the need for Birdcage Tech Ltd to independently manage customer-side indirect taxes across multiple jurisdictions.

The two remaining operational items are:

1. complete the Stripe implementation and country restrictions;
2. receive Change Accountants' instructions for recording Stripe Managed Payments income and self-billed invoices in FreeAgent / UK VAT returns.

Neither currently blocks development of the payment integration.
