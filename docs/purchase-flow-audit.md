# Purchase Flow Audit — Placement Studio

**Date:** 2026-09-16
**Scope:** The end-to-end purchase flow ("Placement Studio") — `index.html`, `src/main.js`, `src/studio.css`/`src/style.css`, plus copy surfaced from `functions/payments.js`, `functions/payment-lifecycle.js`, `functions/reservations.js`.
**Method:** Two passes.
1. **Code review** of the full flow's markup, JS, and styles.
2. **Live walkthrough** — ran the app locally (`npm run dev`) and drove it in a real Chromium browser with a Playwright script (mocking the `stagingPlacements` backend the way `scripts/checkout-reservation-qa.mjs` already does), at desktop (1440×900) and mobile (390×844, iPhone-class) viewports, screenshotting every step.

Findings below are tagged **[Visually confirmed]** where the live pass verified them, **[Code only]** where they're from static review and haven't been checked in a browser, and **[Visual finding]** where the live pass surfaced something the code review missed. Screenshots referenced by filename live in `artifacts/purchase-flow-screens/` (gitignored — local artifacts, not committed).

---

## 1. Executive summary

The purchase flow is a 4-step wizard ("Location → Shape → Design → Review") layered on top of a rotating 3D globe, ending in a Stripe Embedded Checkout and a shareable social card. Structurally it's in good shape: pricing is stated early and reinforced continuously, a server-side reservation system with a visible countdown protects against double-selling a hex during checkout, and error states are generally handled rather than left to crash or silently fail.

Two issues are launch-blocking or launch-adjacent:

1. **A hardcoded "Stripe test mode" disclosure** sits directly under the real checkout button and will be shown to paying customers if shipped as-is.
2. **The entire app uses a fixed 800px viewport**, so the whole purchase flow — not just checkout — fails to reflow on phones. This was the single biggest surprise of the live pass: reading the CSS suggested a missing breakpoint; seeing it rendered showed a wizard panel occupying 60% of a 390px screen with every control shrunk to desktop scale.

Everything else is meaningful polish, not a blocker: no persistent receipt/confirmation screen, an undisclosed-until-you-get-there $5 minimum, a silent 60-second wait after payment with no progress feedback, and several smaller consistency issues (native browser dialogs breaking the branded UI, an icon that implies leaving the page when it doesn't, silent draft restoration).

---

## 2. The flow as built

| Step | What happens | Key files |
|---|---|---|
| 0. Landing | Hero states "$1 per cell, one-time"; live sold-cell counter; `Claim Your Space` CTA opens the studio | `index.html:40-51`, `src/main.js:540-623` |
| 1. Location | Pick a starting hex on the rotating globe; hover tooltip shows availability | `index.html:93,108-111` |
| 2. Shape | Set an exact hex count, or freehand-draw a connected shape; live price/count readout; blocks overlap with sold cells | `index.html:113-125` |
| 3. Design | Upload an image or pick from a 12-swatch palette; position/scale/rotate; undo/redo; live price footer | `index.html:127-147` |
| 4. Review | Optional name/description/website fields; website format validation; server-side quote + time-limited reservation with countdown and one-time extension | `index.html:149-161` |
| 5. Checkout | Stripe Embedded Checkout loads in-panel; on completion, polls up to 60s for the placement to land server-side, then updates the globe | `src/main.js:1676-1701` |
| 6. Confirmation | Toast ("Welcome to the world"), placement inspector reopens, shareable social card offered | `index.html:103,164` |

## 3. What already works well

- **Pricing transparency.** The count → price readout updates live at every step (Shape, Design, Review) — most checkout flows hide the total until the very end; this one never lets you lose track of it.
- **Reservation system.** A server-side hold with a visible countdown (`"Location reserved for MM:SS"`) and a one-time extension prevents the classic "picked a spot, lost it to someone else mid-checkout" failure — and it's communicated to the user, not silent.
- **Accessible field-level errors.** The website field uses `role="alert"` and refocuses on validation failure — a correct, standard pattern.
- **Passwordless sign-in.** Buyers can retrieve their placement later via an emailed magic link with no password to create — appropriate friction for a likely one-time purchase.
- **Graceful degradation.** Editor-unavailable, reservation-conflict, and checkout-load failures all resolve to a readable message rather than a raw error or a stuck UI.

## 4. Findings, ranked by impact

### 4.1 Ship blocker — hardcoded test-mode disclosure
**[Visually confirmed]**
`index.html:159`: **"Stripe test mode — no real payment will be taken."** renders unconditionally, directly beneath the "Continue to secure checkout" button, on both desktop and mobile.

> If this ships as written, every real paying customer is told — in the same breath as being asked for their card — that they won't actually be charged.

**Fix:** gate this string behind an environment/config flag and strip it entirely from production builds.

---

### 4.2 Sitewide — fixed viewport breaks the mobile purchase flow
**[Visually confirmed — worse in practice than static review suggested]**
`index.html:5` sets `<meta name="viewport" content="width=800" />` instead of the standard `width=device-width, initial-scale=1`. The studio panel itself is also a fixed 458px width with no responsive breakpoint (`src/style.css:143`, `src/studio.css:5` — the only breakpoint present anywhere near it is a `max-height:650px` compact-height tweak, `studio.css:77-81`).

The live pass at 390px width showed exactly what that implies: the app renders as if it were still on an 800px canvas, then gets shrunk to fit. The studio panel eats roughly 60% of the screen width, leaving the globe a barely-usable ~160px sliver, and every control inside the panel — the hex-count stepper, the ±1/±10/±100 buttons, the Colour/Move-globe/Undo/Redo/Clear-all toolbar row, the image zoom and rotate sliders — is shrunk to desktop proportions rather than reflowed for a phone. A real buyer would likely need to pinch-zoom just to hit the right control.

For a product whose entire premise is "buy a tile while browsing a globe," and where meaningful traffic will arrive from mobile/social referral, this is the single highest-leverage fix available in the whole flow.

**Fix:** switch to a responsive viewport meta tag; give the studio panel a mobile breakpoint (a full-screen bottom sheet under ~600px is the standard pattern for this kind of wizard); re-test the globe's touch/pinch gestures once the panel no longer overlaps them the same way.

---

### 4.3 No real order confirmation or receipt screen
**[Code only — the live pass couldn't reach the real Stripe panel to confirm this end-to-end; see §5]**
After a real payment, the client only shows a toast, then reopens the placement inspector, then offers a share card (`src/main.js:1694`, `index.html:164`). There's no on-screen transaction ID, no restated amount charged, and no "a receipt has been emailed to you" line. For a purchase that can range from $5 to well into five figures, buyers reasonably expect something they can screenshot or point back to as proof of purchase — this app doesn't give them one on screen (Stripe's own emailed receipt may cover it, but the app itself offers no reassurance that one was sent).

**Fix:** add a lightweight confirmation state — even inline in the same panel — showing hex count, amount charged, a placement ID, and an explicit "we've emailed you a receipt" line, shown before the flow drops into the share-card prompt.

---

### 4.4 The $5 effective minimum is disclosed in-studio, but not on the hero
**[Visually confirmed]**
Correcting an assumption from the code-only pass: the 5-hexagon minimum purchase *is* disclosed once you're in the Shape step — its helper text literally reads **"Type a total or add 1, 10 or 100 hexagons. Minimum 5."**, and the stepper defaults to 10 hexagons ($10), not 1. So nobody inside the studio is blindsided by it.

The real gap is upstream: the hero and header both advertise **"$1 per cell"** with no mention of a floor. That's not false, but it sets an expectation — "I can grab a single cell for a dollar" — that the very next screen quietly can't fulfill.

**Fix:** add a short qualifier to the hero/header pricing line, e.g. **"$1 per cell · 5 minimum"**, so the floor is visible before someone even opens the studio.

---

### 4.5 Blind 60-second wait after payment
**[Code only — see §5 for why the live pass couldn't reach this state]**
Once Stripe confirms payment, the client polls silently for up to 60 seconds with a single static message ("Adding your placement to the globe…") and no visible progress and no support link if it times out (`src/main.js:1691-1699`). This is the worst place in the entire funnel to leave someone in an unexplained wait — money has already left their account.

**Fix:** rotate the status copy through real stages ("Confirming payment" → "Reserving your hexagons" → "Publishing to the globe") so the wait visibly has stages, and if it does time out, pair the "it'll appear after refresh" fallback with a support contact.

---

### 4.6 One error region shared across unrelated failure types
**[Code only]**
`#websiteError` (`index.html:156`) is reused for field validation, reservation expiry, checkout failures, and save errors. It's a correctly single `role="alert"` region for screen readers, but sharing one DOM node across four unrelated failure types risks a stale or mismatched message surviving a state transition if a future change misses a reset.

**Fix:** low priority — split into purpose-specific status regions, or at minimum guarantee text and visibility are always set together, never independently.

---

### 4.7 Native `confirm()` dialog for "Clear all"
**[Code only]**
`src/main.js:1248` uses the browser's native `confirm()` for "Clear all colours and the image from this design?" — the one place in the studio that breaks out of the custom-branded UI.

**Fix:** replace with the app's own modal/confirmation component.

---

### 4.8 Icon/affordance mismatch on the primary CTA
**[Code only]**
`Claim Your Space` uses `data-icon="external"` (`index.html:43`), which visually implies the click will open a new tab or leave the site. It opens an in-page modal instead.

**Fix:** swap for an icon that reads as "open panel" (e.g. arrow-right or expand), not "external link."

---

### 4.9 Silent draft restoration
**[Code only]**
Reopening the studio silently restores an in-progress draft with no indication this happened (`src/main.js:628-667`).

**Fix:** a small toast/banner — "Restored your unfinished design" — with a clear option to discard and start fresh.

---

## 5. What the live pass could and couldn't verify

- **Confirmed as real, not just theoretical:** the test-mode disclosure (§4.1) and the mobile layout breakdown (§4.2) both render exactly as the code implied — seeing them removed any doubt about severity.
- **Corrected a finding:** the minimum-purchase disclosure (§4.4) turned out to be handled better in-flow than the code-only read suggested.
- **Couldn't reach the real Stripe panel.** Without a live staging backend configured, clicking "Continue to secure checkout" in local dev resolves to a client-only "Publishing preview…" state rather than opening the actual Stripe Embedded Checkout. That means §4.3 and §4.5 (the post-payment confirmation and the 60-second poll) are still code-only findings — verifying them visually needs a run against staging or live config, not local dev.
- **New, inconclusive finding:** the Review screen has a conspicuous ~150px empty gap between the Website field and the Total line (visible in both `desktop-4-review.png` and `mobile-4-review.png`). This is likely reserved space for the reservation countdown line, which never rendered during the walkthrough — plausibly because of how the mocked backend response was shaped/timed, not necessarily a real bug. Worth a quick manual check against the real backend to confirm the countdown renders there without leaving a layout hole.
- **The hero holds up fine at mobile width** — pricing and the facts strip ("1,000,000 spaces / Yours to design / $1 each") stay readable at 390px. The breakdown is specific to the studio panel, not the whole site.

## 6. Suggestions to reach "world-class"

Beyond fixing the issues above, a few things that separate a good checkout flow from a best-in-class one:

- **Carry the price breakdown into checkout, not just review.** Repeat the count × $1 = total inside the Stripe panel header itself, so the number a buyer is about to pay is still visible at the moment they enter card details, not just on the screen they already left.
- **Recover abandoned reservations.** If someone reserves a location and closes the tab, an email nudge ("your hexagons are reserved for another N minutes") could win back reservations that currently just silently expire.
- **Reinforce value right before the price commitment.** The review step already renders a canvas preview of the design — a one-line caption like "this is what visitors will see when they click your hexagons" would tie the preview directly to the purchase decision.
- **Push the share card harder.** It's already built and it's effectively free acquisition — auto-prefill share text with the buyer's own hex count and globe coordinates rather than leaving it generic.
- **Add a visible refund/support link in the checkout footer.** For real-money transactions, a visible terms/support link measurably reduces chargeback anxiety and disputes.
- **Make the post-payment wait optimistic, not blind.** Show the hexagon appearing on the globe client-side the moment Stripe confirms, then reconcile silently against the server — rather than making someone wait to see proof of what they just bought.

## 7. Priority order

1. Remove or environment-gate the "Stripe test mode" disclosure — blocks launch.
2. Fix the viewport and give the studio panel a mobile breakpoint — affects the entire mobile funnel, not just checkout.
3. Add a real confirmation/receipt state after payment.
4. Add the "$1 per cell · 5 minimum" qualifier to hero/header pricing copy.
5. Improve the post-payment wait state (staged status copy + timeout support link).
6. Everything else — branded confirm dialog, CTA icon mismatch, draft-restore notice, shared error-region cleanup — as incremental polish, roughly in that order.


## Implementation review - 16 September 2026

Implemented the responsive viewport and studio sheet, readable tool/palette controls, minimum-price qualifier, internal CTA arrow, restored-draft notice with confirmed discard, branded clear-design dialog, separate field/purchase errors, compact Review, checkout order summary and explicit payment confirmation before sharing. The phone renderer now uses the actual space above the sheet; its old fixed 490px subtraction could not support a device-width viewport.

Payment confirmation shows the quoted order total, count and placement reference. It does not claim a receipt was emailed or invent processing stages. Delayed publication keeps a payment-received confirmation and directs buyers to My Globe without inviting another payment. Stripe test-mode disclosure is retained at Craig's request.

Evidence: `artifacts/purchase-polish/`, generated by `scripts/purchase-polish-qa.mjs`, covers 1440x900, 1024x768, 390x844 and 320x568 with real globe clicks/taps and simulated checkout completion. Brand-font, image/colour, dialog, draft, Review, confirmation and share screenshots were inspected. Production build and the targeted globe-navigation journey pass. The 60-second delayed-publication fallback also passes, retaining confirmation and a clean next draft. Full regression, real Stripe and physical-device validation were intentionally not run.

Deferred commercial/growth suggestions: confirmed receipt delivery and support/refund destinations need the agreed commercial setup; abandoned-reservation emails and optimistic ownership rendering are outside this UI polish. No live deployment was made.
