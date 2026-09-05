# Commercial and release audit

Date: 5 September 2026. Scope: current repository, implementation, delivery plan, build, existing browser smoke test, and a limited competitor/payment-documentation check.

Verdict: suitable for continued prototype development; not ready for a paid public launch. The visual concept and staged flow are a useful foundation, but customers cannot yet receive a durable, clickable advertising placement. Cosmetic polish alone will not close that gap.

This audit proposes priorities; it does not change the agreed product roadmap or implement checkout.

## Commercial assessment

The proposition is understandable: pay once to put your brand on a finite shared globe. Its strongest initial appeal is participation, novelty, and a shareable brand presence. Advertising effectiveness remains an unproven hypothesis: there is no measured audience, discovery funnel, or advertiser click reporting in the current implementation.

A globe also makes discovery harder than a flat advertising wall: only part of it is visible, and small placements require zooming. Buyers need a direct placement page, a link that focuses the globe on their artwork, and a useful way for visitors to discover businesses. Shareable placement links should be proposed for the first paid release, despite currently being deferred to Phase 3. A full analytics dashboard can wait; reliable destination clicks and basic measurement cannot if advertising value is the pitch.

Current adjacent offers include [DollarTiles](https://dollartiles.com/), selling linked image tiles, and [The Forever Canvas](https://www.theforevercanvas.com/story), positioning an evolving shared canvas. Their existence does not prove demand or profitability. It does mean that a prettier implementation of a familiar concept is not sufficient differentiation. Focus the launch on one reachable community, recruit real founding advertisers, and give buyers a reason to share their placements.

At the agreed fixed price, 1,000,000 cells × $1 gives a maximum original-inventory gross revenue of $1,000,000, before costs. This is a finite sales opportunity, not recurring revenue. At an illustrative average order of $150, full inventory represents roughly 6,667 orders. At an assumed 2% qualified-visitor purchase rate, that implies roughly 333,350 visits; these are planning assumptions, not forecasts. Permanent placements also create ongoing hosting and support costs after inventory sells out.

Track contribution per order: collected revenue less payment fees, refunds, acquisition cost, support, and a provision for ongoing service. Define what “permanent” means operationally and in customer terms before accepting payment. Do not imply guaranteed impressions or traffic without evidence. Keep pricing at $1 per hexagon during validation; test whether the 50/150/400 bundles make sense to buyers before changing it.

## Findings ordered by release impact

### P0 — blockers for taking money

1. **No durable purchase or ownership system.** `src/main.js:1236` changes local arrays, textures, and a counter. There is no backend, payment integration, stored placement record, ownership, or recovery after refresh. This is intentional prototype scope, but a paid launch requires authoritative inventory, transactional reservations, persistent artwork, payment reconciliation, and operational recovery. A successful payment must create exactly one placement even if the buyer closes the page. [Stripe's fulfillment guidance](https://docs.stripe.com/checkout/fulfillment) requires webhook-based fulfillment and handling repeated/concurrent fulfillment calls; a checkout success screen is not sufficient proof of purchase.

2. **The advertiser's website is discarded.** `index.html:107` collects `#website`, but `src/main.js` never reads it. Exploration provides an ownership tooltip, not a placement detail view or working destination link (`src/main.js:625–650`). Implement placement records with validated HTTP(S) destinations and a deliberate visitor action to open the website. Confirm the link survives reload and opens the correct advertiser for every cell in its territory.

3. **Preview and published appearance do not share one rendering contract.** `previewCells()` uses aspect factor `.82` with limits `.35–3`; `connectedPattern()` uses `.8` with limits `.25–4` (`src/main.js:486,787`). Flat drawing fits artwork to the editor canvas; the globe fits it to territory textures (`813,1140,1203`). Review copies the design canvas (`934`) rather than rendering the authoritative selected footprint. These are confirmed implementation differences; their complete visual impact is not measured in this audit. Use one canonical cell set, topology, artwork transform, and fit calculation for all three views. Verify spread/repeat and rotations at each preset before retaining the “exactly how it will appear” promise.

4. **Boundary clipping can change the purchased quantity without changing the quoted total.** `connectedPattern()` filters cells outside the address range, while `refreshSelection()` accepts any remaining conflict-free set (`486–550`). `updateTotals()` prices the requested draft count (`771`), while commit uses `selectedCells.length` (`1238`). Reject incomplete footprints or apply an explicitly defined seam mapping. Assert requested count = selected count = reviewed count = billed count = committed count. Reject fractional quantities as well: the number input has `step=1`, but JavaScript clamps without rounding or validity checking (`946`).

5. **Mobile placement is obstructed by the panel layout.** At widths at or below 620px, the panel runs from 82px below the top to 8px above the bottom, with 8px side margins (`src/style.css:67`), including the location step. The panel intercepts interaction over nearly the entire globe. This is a source-derived layout finding, not a completed mobile visual test. Use a compact bottom sheet during Place, leaving a large reachable globe area, and validate real touch rotation, pinch, placement, and review.

6. **Demo inventory is presented as commercial activity.** The landing page says “sold”, “LIVE ON THE GLOBE”, and names Nike/Google as featured campaigns (`index.html:14–31`). README explains these are examples; the landing experience does not disclose that at the same point. Explicitly label the prototype and sample placements. The production ledger must start from real inventory and real sales; do not carry seeded occupancy into sellable inventory. The static “50% available” fact must also agree with actual data.

### P1 — conversion and trust before public release

7. **The primary value proposition disappears on small screens.** The mobile rule hides the paragraph containing the $1 price and permanent-placement explanation (`src/style.css:47`). Keep a short visible statement of what is being sold, one-time price, and what visitors can do with it.

8. **Finding a valid location is manual trial and error.** Buyers must alternate movement and placement, then hunt for an area big enough for the whole design. A conflict clears the whole selection rather than marking the blocking cells (`src/main.js:524`). Keep the agreed modes but add a suggested available location and a “Find another spot” action. Show exactly which cells block a manual choice and preserve the design.

9. **The review button can remain enabled after an invalid click.** `choosePatternOrigin()` returns early on an occupied origin without updating `#toReview`; `refreshSelection()` updates only the commit button (`570–585,549`). After a valid selection followed by an occupied click, review can remain reachable with zero selected cells. Derive all navigation/commit enabled states from one validated draft.

10. **Editing has weak recovery.** There is no durable draft save or undo/redo; Clear deletes paint immediately (`955`). Closing/reopening returns to type selection and clears location (`670`). Add draft resume, reversible painting, clear feedback when changing types, and restoration of the previous valid location where possible. Review needs a direct Edit design action, as specified by the delivery plan.

11. **Accessibility and fallback journeys are incomplete.** Placement and painting depend on pointer-driven canvases. The closed panel uses transform plus `aria-hidden`, without removing its controls from keyboard focus. There is no explicit focus transfer/restoration, Escape handling, or live announcement of status. WebGL startup has no user-facing fallback (`19`). Provide a keyboard-operable suggested placement path, named canvas context, managed focus, readable status, adequate targets, and a useful unsupported-device screen. Verify these with keyboard and screen-reader journeys; static inspection is not an accessibility certification.

12. **Artwork guidance is too generic for a paid promise.** Review warns solely when a logo has fewer than 100 cells (`940`), contrary to the plan's complexity/geometry-based guidance. Rotation and repeat use different flat/globe transformations. Uploads check compressed size but do not bound decoded dimensions, revoke object URLs, or protect against out-of-order load completion (`1082–1111`). Test transparent, wide, tall, tiny, malformed, and unusually large-dimension images. A failed replacement must not silently cause the previous logo to be purchased.

13. **Post-purchase value is missing.** The only completion is a 2.8-second toast. Paid buyers need a persistent confirmation, publication/moderation status, receipt, share link, owner access, destination correction, and support contact. Make link correction easy; permanent advertising links will otherwise become obsolete.

14. **No evidence of an acquisition/conversion funnel.** There is no application event tracking or purchase-intent capture. Measure entry, artwork upload success/failure, design completion, location attempts/conflicts, review, checkout start, confirmed payment, publication, and destination clicks. Separate demos and staff testing from real demand. Do not put uploaded images or destination query strings into generic analytics events.

### P2 — engineering work supporting reliability

- Split the approximately 1,289-line `src/main.js` along the responsibilities already agreed in the delivery plan before adding transactional state. DOM fields should not serve as the authoritative purchase record.
- Remove duplicated CSS and obsolete editor branches as a behaviour-preserving cleanup. Media-query overrides are already contributing to layout risk.
- Profile representative low-end mobile hardware and a realistically populated production world. GPU addressing and merged territory meshes are good foundations, but a single successful test does not establish scalability. Every image placement currently introduces its own texture/material/mesh; plan bounded visible content and lifecycle management.
- The production JS chunk is 552.21 kB (144.66 kB gzip), and Vite warns about chunk size. This is a performance investigation item, not proof of slow rendering. Measure startup, frame time, upload latency, and memory before choosing optimisation work.
- Add domain-level regression coverage for canonical geometry, pricing, conflicts, and purchase transitions. Expand browser journeys rather than relying on an uploaded-image element and a CSS rotation property as visual correctness checks.

## Recommended low-friction customer journey

Preserve Design → Place → Review. The following are proposed refinements for a future agreed plan update:

1. **Understand:** visible one-sentence offer, honest example placement, one-time price, and a prominent “Create your placement” action. Make the prototype/non-payment status unmistakable until real checkout exists.
2. **Design:** keep the three artwork paths; visually prioritise Logo for business buyers. Upload, automatic fit, priced size presets, and live hex-clipped preview are the main controls. Keep Custom, repeat, scale, and rotation available with less visual prominence. Explain recommended sizes through actual examples, not implied exposure guarantees.
3. **Place:** offer a valid suggested location immediately, then let buyers explore or choose another. On mobile, the globe remains visible above a compact sheet. Keep total price visible and never silently reduce a design to fit.
4. **Review:** exact artwork and location, cell count, currency, final total including any applicable charges, editable website with a test-link action, direct editing routes, and clear publication timing. No surprise mandatory account-creation detour: consider email-based ownership and a secure management link, subject to the transactional design.
5. **Pay:** short hosted checkout with supported convenient payment methods, clear reservation expiry, recoverable cancellation, and no duplicate billing. Preserve the design if checkout fails. Payment confirmation and inventory ownership must be server-authoritative.
6. **Receive:** durable confirmation and receipt, “View my placement”, a shareable preview/link, and an obvious way to correct details or get help. If moderated before publication, clearly distinguish payment received from placement live.

## Proposed delivery order and release gates

**First: prototype integrity.** Fix canonical geometry/counts, review state, mobile panel layout, demo disclosure, and basic accessibility. Add undo and draft recovery. Complete the supplied-logo visual matrix already required by the plan; the repository currently contains only the smoke fixture, not the named Birdcage artwork.

**Second: validate the offer.** Add measurement and a clearly described non-payment interest/reservation action. Run the plan's five observed first-time-user sessions, covering desktop and mobile; at least four should finish without help. Verify price comprehension and that users can explain what value they expect. Seek concrete intent from the actual target buyer segment; no sales forecast should be inferred from five usability sessions or email signups alone.

**Third: transactional implementation.** Build durable drafts/artwork, atomic inventory reservation, idempotent payment fulfillment, ownership recovery, moderation, safe links, receipts, support tooling, and operational reconciliation. Propose moving basic sharing/discovery into this phase. Define publication duration, refunds, content policy, and operating responsibilities before taking money.

**Paid launch gate:** all P0 findings resolved; all three creation paths complete on desktop and mobile; 50/150/400 presets and wide/tall artwork verified at every supported rotation/treatment; exact preview/commit parity; boundary and conflict checks; refreshed purchases retain artwork and destinations; concurrent buyers cannot buy the same cell; duplicate webhooks cannot duplicate fulfillment; failed/expired checkout releases inventory; late payments have an explicit reconciliation outcome; moderation/rejection/refund paths work; customer can retrieve receipt and placement without help.

## Verification performed and limits

- `npm run build`: passed, with the chunk-size warning recorded above.
- `SMOKE_URL=http://127.0.0.1:4177 npm test`: passed with no recorded console/page errors. Covered a 150-cell SVG upload, 180-degree CSS preview value, valid logo placement/review/mock commit, and painting two cells.
- Existing smoke does not cover the solid-colour journey, full paint purchase, mobile, conflict recovery, boundary quantities, persistence, working links, or rendered-image equivalence. Its printed reviewPrice is hard-coded, although an earlier assertion checks the DOM price. Its rotation assertion checks CSS, not the committed globe image.
- Interactive visual QA could not be completed: the supported browser runtime reported no browser available. No claim is made here that desktop/mobile visuals, the Birdcage logo, or real touch gestures passed. The existing repository smoke test ran separately as project validation.
- No product code or agreed roadmap was changed. This document records findings and proposed implementation priorities.
