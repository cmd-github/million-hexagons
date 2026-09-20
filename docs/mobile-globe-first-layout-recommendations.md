# Mobile globe-first layout recommendations

## Decision

Make the globe the mobile app surface, not the background of a marketing page.

The default phone view should be an edge-to-edge, directly manipulable globe with a small amount of floating chrome. Marketing copy, activity, search, placement details and creation tools should appear as temporary overlays or bottom sheets that preserve spatial context. Do not change the one-million-cell topology or the Location -> Shape -> Design -> Review journey.

This is a recommendation, not an implementation specification. It should be tested with first-time users before replacing the current layout.

## Evidence reviewed

On 20 September 2026 the current local app was rendered in real Chromium with touch enabled at 390x844 and 320x568, as well as 1024x768 and 1440x900. The responsive composition journey passed. The actual pixels were inspected for Browse, Design and Review.

Current evidence:

- `artifacts/desktop-composition/phone-390-globe.png`
- `artifacts/desktop-composition/phone-390-design.png`
- `artifacts/desktop-composition/phone-390-review.png`
- `artifacts/desktop-composition/phone-320-globe.png`
- `artifacts/desktop-composition/phone-320-design.png`

The broader purchase-polish journey produced the desktop states but stopped after the clear-design dialog because its second `#claimButton` click no longer matches the current close/draft behaviour. That failure does not affect the observations below, but the script should be repaired before it is used as a current regression gate.

This was emulated-mobile visual QA, not a physical iPhone or Android check. Browser chrome, safe areas, thermal performance, haptics and real two-finger gesture feel remain unverified.

## What the current screen communicates

### Browse

The current phone composition is visually polished, legible and recognisably branded. The globe is large, full-bleed and alive behind the interface. The problem is hierarchy: the eye encounters a conventional landing page before it encounters an explorable world.

At 390x844, the screen simultaneously presents:

- a two-part logo;
- a large Claim Your Space button;
- loading or live-total copy;
- an eyebrow, large animated headline, two explanatory lines and pricing;
- a three-column facts strip;
- a six-button vertical control rail;
- a large open Latest activity card;
- the globe underneath all of the above.

The sphere has physical scale but not visual ownership. Its most interesting central area is crossed by copy and the facts strip, while the activity card occupies the lower exploration area. At 320x568 the conflict is stronger: the headline, facts, rail and activity card consume nearly every usable region, so the globe reads as atmosphere rather than the product.

### Design

The Design state is more successful because its purpose is obvious and the globe becomes a real workspace. At 390x844, however, the fixed sheet begins at roughly 38% of the viewport height. The four-step breadcrumb, close button, title and tool tabs consume much of the sheet before the current tool appears. At 320x568 the sticky price/action bar is useful, but the working controls are compressed between the large progress header and that footer.

### Review

Review can legitimately become form-first, but the small strip of globe left above it does not add much context. It would be better either to keep a meaningful placement preview in the sheet header or let Review become a focused full-screen task. The current halfway state spends pixels on the world without giving the user enough of it to navigate or appreciate.

## What to learn from Google Earth

The useful lesson is not to copy Google styling. It is to copy its hierarchy.

Google Earth treats the rendered world as the primary surface. Direct drag, pinch, rotate and tilt gestures operate on that surface. Search, map style, location and contextual information sit at the edges or open progressively. Navigation controls are secondary and can fade when unused. Detail appears because the user selected a place; it does not permanently cover the scene before exploration begins.

Million Hexagons should adapt that model to its own commercial purpose:

- the world remains visible and interactive by default;
- the smallest possible edge chrome explains what can be done;
- a selected hexagon or placement opens contextual detail;
- creation opens tools without pretending the globe has stopped being the workspace;
- commercial calls to action are strong but do not become the largest object in the scene.

Unlike Google Earth, Million Hexagons must also communicate scarcity, ownership and a path to purchase. Those ideas should be attached to interactions and live state, not delivered as a full landing page over the globe.

Reference points: Google's current mobile guidance describes direct one-finger drag, pinch and one-finger zoom, with Search and My Location at the edges; its product page describes mobile as exploring the globe by swiping and treats creation as drawing directly on the map. See [Discover places and change your view](https://support.google.com/earth/answer/7364447?co=GENIE.Platform%3DAndroid&hl=en-GB) and [Google Earth versions](https://www.google.com/earth/about/download/).

## Recommended mobile information architecture

### 1. Browse is an immersive globe

Use one `100dvh` scene. The WebGL canvas remains full-bleed beneath safe-area-aware overlays. There should be no page-length marketing stack in the default state and no body scrolling behind the globe.

Recommended initial composition:

- Top left: compact MH mark. Show the full wordmark only when there is enough width or when the user opens About.
- Top centre/left: a single Search pill, such as `Search the globe`, which can expand into a real input.
- Top right: one menu/account button.
- Right lower edge: Re-centre. Expose zoom controls only as an accessibility alternative to pinch; move Tour and less-used actions into an overflow menu.
- Bottom: one prominent `Claim space` action and a quiet, collapsed activity handle.
- On first visit only: a compact two-line onboarding card, for example `One million permanent spaces. Explore one, or claim your own.` It should not cross the globe's centre.

The full animated `Your … Part of the world.` message can remain valuable on desktop and campaign landing routes. On a phone's interactive globe it should become a short-lived introduction, not permanent scenery.

### 2. Interaction removes explanation

On the first intentional globe drag, pinch or zoom:

- fade the onboarding card within about 150-250 ms;
- reduce the full logo to the MH mark;
- keep Claim space reachable but visually quieter;
- keep activity collapsed;
- never move the globe between pointer-down and pointer-up as chrome changes.

A small `i`/About item can restore the product explanation. Re-centre should restore the default world view, not automatically re-open all marketing copy.

### 3. Context arrives from the selected object

Tapping an available hexagon should open a compact bottom sheet showing its proud identifier, availability and `Claim this space`. Tapping a purchased placement should open its artwork, title and primary actions. Both sheets should have the same motion and geometry so the user learns one interaction model.

Use three sheet detents:

- Peek: 56-72 px, enough for identity/status and a chevron.
- Half: approximately 42-48% of the usable height for ordinary detail.
- Full: approximately 85-92% for long content, with an explicit close affordance.

Dragging or pinching the globe should settle a Half sheet back to Peek unless the user pinned it. This keeps exploration fluid.

### 4. Activity becomes discovery, not furniture

Replace the permanently open Latest activity card with the collapsed sheet handle. Its Peek state might show one real event: `Latest · Acme claimed 25 hexagons · 3m`. Expanding it reveals the feed. If there is no live activity, show no large empty card; use a compact `Be the first placement` message in the sheet.

Selecting a feed item should fly the globe to the placement, collapse the sheet to Peek and leave a clear way back to the feed. This turns activity into a globe-navigation feature rather than a separate content panel.

### 5. Creation uses a globe plus a tool sheet

Keep Location -> Shape -> Design -> Review, but adapt the chrome by stage.

#### Location

- Default to a low Peek sheet with the instruction `Zoom until the hexagons appear, then choose a starting spot`.
- Give the globe at least 65% of the usable height.
- Show only Re-centre, zoom accessibility controls and close.
- After a cell is proposed, raise the sheet to Half for the Hexagon ID and Start here confirmation.

#### Shape

- Open at Half height so the count, +/- controls, presets and compact legend fit.
- Let a downward drag reduce the sheet to Peek while the user paints the globe.
- Keep the count and `Continue to Design` available in a sticky sheet footer.

#### Design

- Open at roughly 45-50% height on taller phones and 50-56% on short phones.
- Replace the full four-label breadcrumb with `3 of 4 · Design`; tapping it can reveal the full journey.
- Keep Image and Colour as the two visible tool tabs. Move Undo, Redo and Clear into a compact action row or overflow; disabled controls should not occupy prime space.
- When Move globe is active, collapse the tool sheet to Peek and restore it when editing resumes.
- The existing sticky count, total and Keep this space action is good and should remain.

#### Review

- Treat Review as a focused full-screen task rather than leaving a token strip of globe.
- Pin a compact artwork/location preview to the top, with `Edit design` beside it.
- Keep total and checkout action sticky above the safe area.
- A Back gesture returns to Design without losing state.

### 6. Controls express tasks, not every capability

The current six-button rail is visually dominant and asks a first-time visitor to decode unfamiliar icons before touching the globe. In Browse, retain at most three immediately visible actions:

1. Search.
2. Re-centre / Home.
3. More.

Pinch is the primary zoom mechanism. Plus/minus may remain in More or appear after an accessibility preference/keyboard interaction. Tour belongs in discovery content or More, not in the permanent rail. In creation, show only controls relevant to the current stage.

All icon-only controls still need accessible names, visible pressed states where applicable and at least 44x44 px targets.

## Proposed phone layouts

### 390x844 browse target

- Canvas: full 390x844.
- Top chrome: safe-area inset plus a 48-56 px row.
- Globe: approximately 370-410 px apparent diameter, visually centred around 43-47% of the usable height.
- Onboarding card: no more than 120 px tall and 330 px wide, positioned above the bottom actions without crossing the centre of the sphere.
- Bottom action area: 56 px Claim space button plus safe area.
- Activity Peek: 56-64 px; it may replace rather than stack above the Claim action when expanded.
- Unobstructed globe interaction area: at least 60% of viewport pixels and one continuous central region at least 280x280 px.

### 320x568 browse target

- Use the MH mark, not the full wordmark.
- Use a one-line/expanding search control.
- Limit onboarding to one short sentence plus Claim space.
- Show no permanent facts strip and no open activity card.
- Keep one 44 px right-edge Home button; place remaining controls under More.
- Preserve at least a 250x250 px uninterrupted central gesture region.

### Studio target

- Use dynamic viewport units and `env(safe-area-inset-*)`.
- Sheet corners begin below the globe, never at the top safe area except in Full.
- Tool-sheet changes must update the renderer's usable rectangle, not simply cover the same camera framing.
- Never allow a sheet animation to change hit projection during an active pointer sequence.

## Visual direction

Keep the current dark navy, lime accent, typography and restrained hex field. They already create a distinctive identity. Change the density and layering:

- Darken or blur only the small region directly behind readable overlay text, not the whole scene.
- Use one consistent translucent surface treatment for search, sheets and menus.
- Reduce border lines and boxed subdivisions in the default Browse state.
- Use lime for the selected/proposed cell and the single primary action, not for several equally loud controls.
- Let the sphere carry visual motion. Background hex stars should remain subtle enough that they do not compete with cell detail.
- Prefer brief camera flights and sheet motion over additional explanatory copy.

## Technical implementation direction

### Layout and state

Introduce explicit UI states rather than deriving mobile layout from scattered body classes:

```text
browse.intro
browse.exploring
browse.search
browse.selection.peek|half|full
browse.activity.peek|half|full
create.location.peek|half
create.shape.peek|half
create.design.peek|half
create.review.full
```

One state owner should control sheet detent, visible controls, camera usable rectangle and history. Avoid duplicated mobile markup or separate click handlers; move or restyle the existing semantic nodes where practical.

### Camera and picking

Continue treating the full canvas as the render target. Calculate a usable rectangle from the top chrome, active sheet detent and safe areas. Use that rectangle for:

- overview globe centring;
- placement flights;
- selection framing;
- Home/Re-centre;
- screen-to-cell picking;
- pointer stability during overlay transitions.

Only commit a usable-rectangle change before a pointer begins or after it ends. Animate the camera and sheet from the same state transition so the selected object does not appear to jump.

### Sheet behaviour

Use a single sheet component with CSS transforms for detents. Keep the canvas mounted and avoid reinitialising WebGL. The sheet needs:

- drag handle and velocity/nearest-detent settling;
- inner scrolling only at Full or when content exceeds the chosen detent;
- focus trapping only for modal Full states;
- Escape and browser/device Back behaviour matching the current journey;
- reduced-motion transitions;
- keyboard-accessible expand/collapse actions.

### Performance

Prefer opacity and transform animations. Do not animate layout properties on every pointer move. Avoid a large live `backdrop-filter` over most of the viewport on lower-end devices; use a bounded surface or opaque fallback. Keep globe detail and artwork budgets unchanged until measured on physical phones.

## Delivery order

### Phase 1 - highest value, lowest product risk

1. Replace the mobile Browse marketing stack with compact first-visit onboarding.
2. Collapse Latest activity to a Peek sheet.
3. Reduce permanent globe controls to Search, Home and More.
4. Keep Claim space as the only loud persistent action.
5. Preserve the current desktop composition.

This phase should make the globe feel like the product without changing the purchase journey.

### Phase 2 - creation workspace

1. Add Peek/Half/Full detents to the existing studio sheet.
2. Replace the full mobile breadcrumb with compact stage progress.
3. Couple each detent to the globe's usable camera rectangle.
4. Collapse Design tools while Move globe is active.
5. Make Review intentionally full-screen.

### Phase 3 - discovery polish

1. Connect activity items to camera flights.
2. Add a real expanding search experience.
3. Tune haptics and gesture thresholds on physical iOS/Android.
4. Consider a short first-run gesture hint, shown once and never over the globe centre.

Do not begin Phase 2 until Phase 1 has been tested with first-time users. A globe-first visual can still fail if people cannot discover how to claim or inspect a space.

## Acceptance criteria

### Visual hierarchy

- In a five-second test, first-time users identify the globe as the product before they describe the page as an advert or landing page.
- At 320x568 and 390x844, no permanent overlay crosses the central third of the globe in Browse.
- At least 60% of Browse viewport pixels remain available for direct globe interaction.
- Empty activity never reserves a large card.
- Claim space is the only high-emphasis persistent CTA.

### Interaction

- Drag, pinch, one-finger zoom and cell selection work in the unobstructed globe area on physical iOS and Android.
- Chrome changes do not alter the picked cell between pointer-down and pointer-up.
- Every sheet supports Peek/Half/Full as appropriate, safe-area spacing and browser/device Back.
- Location and Shape leave at least 60% of the usable height to the globe; Design leaves at least 42% except when the user expands tools.
- Review and checkout retain the exact selection, price and draft across Back/Edit round trips.

### Accessibility

- Every target is at least 44x44 CSS px with a readable accessible name.
- All content and actions work at 200% text scaling without covering the primary globe gesture region.
- Sheets have logical focus order and do not trap focus in non-modal detents.
- Reduced motion removes typewriter/camera flourish while retaining state clarity.
- Text and icon contrast meets WCAG AA against both fallback and live globe imagery.

### Evidence required before shipping

- Rendered and inspected screenshots at 320x568, 390x844, 430x932, 820x1180, 1024x768 and 1440x900.
- Automated bounds, overflow, touch-target, safe-area and pointer-stability assertions.
- Full Location -> Shape -> Design -> Review -> simulated Checkout journeys on desktop and emulated mobile.
- Physical Safari/iPhone and Chrome/Android checks for browser chrome, rotation, keyboard, pinch, sheet drag, thermal performance and recovery from backgrounding.
- Five to ten first-time-user sessions measuring whether people can explore, inspect and begin a claim without instruction.

## Success measures

Track these through the shared analytics abstraction once the layout is tested:

- time to first globe gesture;
- percentage of visitors who manipulate the globe before leaving;
- placement/hex inspection rate;
- activity-to-placement flight rate;
- Claim space start rate;
- Location -> Shape and Design -> Review completion;
- accidental sheet closes and rapid Back reversals;
- mobile abandonment compared with the current layout.

The goal is not merely a cleaner screenshot. It is a phone experience where touching the world feels like the obvious first action, while claiming space remains understandable and commercially prominent.
