# Random Cell Illumination - Launch Globe Design

Status: implemented and deployed to staging on 14 September 2026 as sparse lime twinkles on real available cell centres. The effect uses a bounded sprite layer, fades before the close-up grid and is disabled for reduced motion. Physical-device visual and performance acceptance remains open; see [Status](STATUS.md).

## Goal

The globe currently feels visually empty at launch because there are no real customer placements yet.

We do not want to solve this by adding fake customers, fake logos, large decorative hexagons, or anything that could imply cells have already been claimed.

Instead, make the globe feel alive by occasionally illuminating individual real cells for a short period of time.

These temporary illuminated cells represent possibility, not ownership.

The intended feeling is:

- subtle
- premium
- calm
- intriguing
- slightly futuristic
- alive without appearing busy

The effect should make the empty globe feel intentional rather than unfinished.

---

## Core Behaviour

Random individual cells on the globe should softly illuminate, remain visible briefly, and then fade back to their normal state.

The cycle should continue indefinitely while the globe is visible.

Example behaviour:

1. Select a small number of currently visible, unclaimed cells.
2. Fade them into a soft illuminated state.
3. Hold briefly.
4. Fade them smoothly back to normal.
5. After a slightly random delay, illuminate another selection elsewhere.

The animation should feel organic and irregular rather than obviously procedural.

---

## Visual Style

Temporary illuminated cells should use the Million Hexagons accent colour, currently the lime/green used throughout the brand.

However, the illumination should be restrained.

Suggested appearance:

- soft lime glow
- partially transparent
- subtle bloom if the current rendering system supports it
- no harsh border
- no logo or artwork
- no text
- no indication of ownership
- slightly softer than the appearance of a genuinely claimed cell

The globe should remain predominantly dark blue.

Do not allow the green illumination to become visually dominant.

---

## Quantity

At the normal hero/default camera position, approximately:

- 3-8 cells visible in an illuminated state at any one time

This is not a strict requirement if globe scale, camera distance, or cell density makes another number look better.

The important requirement is that the effect remains sparse.

Do not create a field of constantly flashing cells.

---

## Timing

Initial suggested ranges:

- Fade in: 400-800ms
- Hold illuminated: 1-2 seconds
- Fade out: 1-2 seconds
- Delay before a cell or group activates: randomised

Avoid having every illuminated cell start and stop at exactly the same time.

Each cell should have slightly different timing so the effect feels natural.

Avoid obvious fixed loops.

---

## Cell Selection

Only illuminate actual cells from the real Million Hexagons topology.

Do not create decorative geometry that does not correspond to a real purchasable space.

Prefer cells on the currently visible hemisphere.

Selections should be distributed naturally across the visible globe.

Avoid:

- obvious rows
- evenly spaced selections
- symmetrical arrangements
- repeating patterns
- clusters that repeatedly appear in the same places
- illuminating cells on the hidden/rear hemisphere unnecessarily

The effect should appear random to the user.

---

## Relationship to Claimed Cells

Temporary illumination must never be confused with a real claimed placement.

If a cell is genuinely claimed:

- do not apply the temporary illumination effect to it
- its real artwork/colour/placement takes priority
- it remains persistent

Temporary cells should disappear again.

Claimed cells should remain.

This distinction is important.

---

## Launch State

When there are few or zero genuine customer placements, the illumination effect should provide subtle visual activity across the globe.

The desired impression is:

> The world is waiting to be filled.

Not:

> These cells have already been purchased.

There should be no fake traction.

---

## Evolution as the Globe Fills

The feature should continue to work after real customer placements appear.

As more cells are claimed:

- only unclaimed cells should participate in the temporary illumination
- real placements remain visually persistent
- temporary illumination becomes secondary to genuine content

This means the launch visual effect can naturally evolve rather than needing to be removed immediately after launch.

Consider making the number/frequency of temporary illuminations gradually reduce as genuine globe activity increases, but do not implement complicated behaviour unless it is useful and maintainable.

---

## Camera / Zoom Behaviour

At the default hero distance, temporary illuminated cells should provide subtle points of interest.

As the user zooms closer:

- individual cell boundaries may become more visible if the existing rendering system already supports this
- illumination should continue to correspond precisely to real cells
- do not increase glow so much that close-up cells become distracting

If the user zooms far away, avoid rendering unnecessary detail that cannot be perceived.

Respect existing performance optimisation and LOD behaviour.

---

## Interaction

Temporary illuminated cells are primarily decorative/product-discovery cues.

They should not behave like claimed placements.

If a user hovers or clicks one, use the same behaviour as any other available cell.

Do not create a special ownership/info card for an illuminated cell.

The fact that it happens to be illuminated should not affect purchasing behaviour or availability.

---

## Performance

This feature must be lightweight.

Million Hexagons ultimately contains 1,000,000 cells, so do not implement animation by continuously updating every cell.

The animation system should only operate on the small set of cells currently participating in the effect.

Avoid:

- iterating through all 1,000,000 cells every frame
- rebuilding globe geometry
- creating excessive draw calls
- creating individual expensive animation objects unnecessarily
- unnecessary React/UI rerenders if rendering is handled by Three.js

Prefer extending the existing globe rendering/material/state architecture cleanly.

Maintain current interaction and rendering performance.

---

## Accessibility / Reduced Motion

Respect `prefers-reduced-motion` if the application already supports it.

For users requesting reduced motion:

- either disable the effect
- or show a much slower/static version

Do not allow this visual enhancement to interfere with usability.

---

## What Not To Do

Do not:

- add large decorative hexagons across the globe
- fabricate customer logos
- simulate fake purchases
- make temporary cells look permanently claimed
- flash rapidly
- illuminate hundreds of cells at once
- create obvious animation waves or regular patterns
- make the globe predominantly green
- change existing purchase/selection behaviour
- introduce significant rendering cost
- replace the actual million-cell topology with simplified decorative geometry

---

## Desired Result

At launch, the globe should still feel spacious and mostly untouched, but no longer lifeless.

A visitor should see occasional individual spaces softly coming to life across the surface.

The effect should subtly communicate:

> Every point on this world is a space that could become something.

As genuine placements are purchased, those permanent placements naturally begin replacing the temporary visual activity.

The globe therefore visually progresses from:

**possibility -> activity -> populated world**

without ever pretending that customers exist when they do not.

---

## Acceptance Criteria

The implementation is complete when:

1. The default launch globe no longer feels completely static.
2. Only genuine Million Hexagons cells are illuminated.
3. Approximately a handful of cells are illuminated at once.
4. Illumination fades smoothly in and out.
5. Timing and location feel random rather than repetitive.
6. Claimed cells are never temporarily illuminated.
7. Illuminated available cells remain fully selectable/purchasable.
8. The effect cannot reasonably be mistaken for an existing customer placement.
9. Globe performance remains effectively unchanged.
10. The effect works at the current desktop and mobile hero views.
11. Existing selection, purchase, artwork, hover and camera behaviour remains unchanged.
12. No fake data or fake customer content is introduced.
