# Draft commercial terms and content policy

Status: working product-policy draft only. Craig's commercial/product decisions are recorded in [the confirmed decisions and implementation plan](CRAIG-CONFIRMED-DECISIONS-AND-IMPLEMENTATION-PLAN.md). This is not final legal text and must be reviewed for the countries in which Million Hexagons will sell before live payments are enabled.

This document captures commercial decisions as the product develops. Keep the public terms concise, understandable and consistent with the implemented system.

## Product being purchased

- A purchase grants the customer the right to use the purchased hexagons for as long as Million Hexagons operates, subject to the Terms, moderation and permitted enforcement.
- The underlying owned hexagons do not move or change owner at launch. Their visual grouping can be changed by the verified owner as the owner-management tools support combining adjacent owned cells or splitting visual placements.
- Artwork, colours, required name, optional description and optional destination URL may be changed. Content may also be temporarily hidden without surrendering the cells.
- Do not describe the right as unconditional or promise that the service will operate forever. `placementId` is a stable technical identifier, not a promise of perpetual service.
- Ownership records, content versions, payments and refunds are separate records and must not be inferred from rendered globe files.

## Publication

- New purchases and owner edits publish immediately after successful payment/save; human moderation follows publication.
- Million Hexagons may take post-publication enforcement action for Terms, legal, fraud, safety or exceptional reasons. Do not add a mandatory pre-publication approval gate under the current launch decision.
- A replacement is made public only when its complete artwork and metadata release is ready. Until then, the existing public version remains available.

## Content and destination rules

Customers must not submit content or links that are unlawful, fraudulent, malicious, infringing, deceptive, hateful, sexually exploitative, or designed to compromise visitors or the service. A fuller prohibited-content list and reporting route must be completed before paid launch.

Million Hexagons may respond to a policy, safety or legal issue by:

- disabling the destination link while leaving artwork visible;
- hiding the artwork behind a neutral “content unavailable” placeholder;
- suspending all public content for the placement;
- restoring the last acceptable content version; or
- reinstating corrected content.

Each intervention should record the affected placement/version, action, reason, timestamp and administrator. The owner should receive a clear explanation and a route to submit corrected content or dispute a decision where appropriate.

## Effect of a content takedown

- A takedown does not by itself delete the placement.
- Its cells remain claimed and cannot be resold while ownership continues.
- The ownership grant and purchase record remain intact.
- A takedown does not automatically produce a refund.
- Removing ownership, releasing cells, cancelling an order and issuing a refund are separate exceptional actions requiring an explicit reason and audit record.

## Refunds and failed service

Payment/refund and ownership/inventory states are independent. A refund does not automatically revoke ownership or release cells; admin may refund without release. Admin may also revoke a placement and release cells without a refund. Content removal for a Terms/moderation breach does not automatically produce a refund.

For a payment dispute, temporarily hide/suspend the placement but keep its cells claimed. Restore it if the dispute resolves for the customer. If payment is ultimately reversed, admin may separately revoke the placement and release its cells.

If technical publication fails after successful payment, preserve the paid order, ownership and cells while retrying/recovering. If delivery cannot be restored, provide a route to a full refund and explicitly resolve ownership/cell state; never silently release cells during technical recovery.

Purchases should become non-cancellable once immediate supply begins to the extent legally permitted. For UK consumers, obtain explicit acknowledgement/consent to immediate supply and the applicable cancellation-right consequence before payment, using qualified legal wording. Preserve rights that cannot lawfully be waived. Mistaken/duplicate purchases, disputes, service outages and support handling must be addressed in final terms and operating procedures.

## Account credits

- One account credit can be redeemed to claim one available hexagon.
- Credits belong to an owner account and do not become cell ownership until successfully redeemed.
- Credits are non-transferable, cannot be traded or resold at launch, and do not represent money, an investment or an entitlement to financial return.
- Credits should not expire initially unless later commercial and legal review supports a clearly disclosed expiry rule.
- Purchased, promotional and customer-service credits must be recorded in an auditable ledger. Moderation compensation must link back to the relevant placement and action.
- Account credit is not a cash refund and does not replace any refund or cancellation right required by law.

## Owner responsibilities

- Owners must keep their destination safe and functioning.
- Owners must have the rights needed to use submitted artwork, names and trademarks.
- Owners are responsible for keeping account access and management links secure.
- Ownership cannot be transferred, resold or subdivided at launch unless later terms explicitly introduce those capabilities.

## Decisions recorded; legal review and implementation still required

- Stripe Managed Payments/Link is the chosen Merchant of Record direction; Craig accepts the documented residual country/privacy risk and requires the strongest practical controls. Account configuration and payment verification remain open.
- Regional tax-inclusive pricing is GBP 1 UK / EUR 1 eurozone / USD 1 other permitted countries.
- Birdcage Tech Ltd operates Million Hexagons. Disclose legally required company details appropriately while keeping Million Hexagons as the public brand.
- England and Wales law is intended, subject to mandatory consumer rights in the customer's jurisdiction.
- Use a Million Hexagons-branded support form routed internally to `support@birdcagetech.com`; provide any legally required direct electronic contact details in the correct legal location.
- No transfer/resale, owner cell movement/swap or voluntary release at launch.
- Required name; optional description, link and artwork; minimum 10 and maximum 10,000 hexagons per self-service purchase; larger requests go through the contact form.

Still required before paid launch:

- Qualified legal review of seller/contact disclosures, immediate-supply consent, applicable cancellation rights and the final Terms for launch jurisdictions.
- Accountant confirmation of payout/self-billed invoice and UK VAT treatment.
- Implement decisions and verify Stripe/account configuration, ownership, refund/dispute, failed-publication and support procedures.
- Detailed prohibited-content and intellectual-property complaint process.
- Privacy, cookies, analytics retention and processor disclosures.
- Enforcement notices, appeals and repeat-abuse rules.
