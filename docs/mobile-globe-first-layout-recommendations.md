# Mobile globe: combined recommendation

Status: proposed direction, consolidated 20 September 2026. Documentation only; no UI or rendering changes implemented.

## Outcome

Make the globe the obvious thing to explore on a phone, with a clear, reachable path to claiming space. Keep the brand and proposition, but stop permanent copy and empty activity from covering the world.

This combines the progressive information and interaction model from the [layout review](history/mobile-globe-first-review-2026-09-20.md) with the occlusion diagnosis and staged delivery from the [hero review](history/mobile-globe-hero-review-2026-09-20.md). Those originals are archived, not competing plans.

Follow [Product direction](09-09-26-PRODUCT-DIRECTION.md), especially its current Design on globe -> Review flow. Both source reviews describe an older Location -> Shape -> Design -> Review journey. Do not reintroduce those stages. Preserve the exact million-cell topology, confirmed starting spot, connected editing, purchase state and permanent placement identity.

## What the evidence supports

Both reviews report local emulated-phone inspection at 390x844 and 320x568. Their shared finding is persuasive: the permanent headline/copy stack dominates Browse, the six-button rail adds clutter, and an empty activity card spends space without helping exploration. The layout review also reports desktop/tablet comparison and cramped studio controls.

The hero review quotes 61.3% and 99.1% globe occlusion. Treat these as unverified historical estimates: the saved `artifacts/mobile-hero-audit/occlusion-390.json` and `occlusion-320.json` currently detect globe diameters of 11px and 0px, so they do not reproduce those claims. Rebuild the silhouette/overlay measurement before using percentages as a baseline. The local artifact folder exists but is gitignored.

The source audits report an empty local globe and no physical-device testing. This consolidation did not rerun browser QA. Judge the eventual design with empty, sparse and populated inventory; do not infer real-phone performance or populated-globe quality from these audits. The layout review also records a stale second Claim action in the purchase-polish script; repair or verify that journey before relying on it.

## Recommended phone composition

- **World:** retain a full-bleed canvas in a dynamic-viewport-height shell, with no Browse body scrolling. Keep the sphere fully visible in the unobstructed band and leave its centre clear.
- **Top:** compact brand mark and one menu/account affordance. Keep search accessible through existing navigation initially; a new permanent search pill needs demonstrated use.
- **Bottom:** one prominent Claim Your Space action above the safe area. Move the existing action here rather than duplicating it. Retain its wording pending the separate headline/copy decision.
- **Introduction:** a compact bottom introduction above the CTA, containing the agreed headline, one short proposition and current price only when available. Move supporting facts and explanation into About. Start with a total introduction/action budget near 30% of usable height; allow readable, scrollable disclosure when text scaling or a short screen requires it.
- **Controls:** a compact Home/re-centre and zoom cluster near the lower edge of the globe band. Keep button alternatives to pinch discoverable and reachable; put Tour and other secondary actions in More. Avoid replacing six visible controls with a different six-control arrangement.
- **Activity:** collapsed by default. Show a small real-event summary when available; hide the empty feed surface. Loading/error states must be compact and truthful, with retry where useful.

After the first intentional drag, pinch or zoom, dismiss the introductory copy and keep the CTA reachable. About can restore the explanation; Home restores framing without reopening the pitch. Do not fade the whole action area on every pointer-down or restore it after every pointer-up: that produces flicker and can hide actionable controls. Invisible UI must not intercept touches or retain hidden focus targets.

Keep the existing navy/lime identity. Use a small consistent overlay surface for readable text rather than dimming the whole scene. Background particles should support the sphere, not compete with it.

## Camera and interaction rules

Moving copy is layout work; fitting and re-centring the globe is a separate camera change and needs regression coverage.

Measure a usable rectangle from safe areas, top chrome and the bottom surface. Fit the sphere to **both** its available width and height, with modest padding, then centre it in that rectangle. Fitting only to the available height can crop the sphere horizontally on portrait phones. Keep desktop behaviour unchanged.

Use the same camera/projection state for rendering, placement flights, Home and picking. Pointer coordinates remain relative to the actual canvas; do not casually remap them to the smaller usable rectangle. Defer sheet-driven framing changes until all active pointers are released, including pinch gestures. Do not alter the picked cell during an active gesture.

Keep cell-level zoom. A visible horizon at every scale is not a workable requirement for selecting tiny cells on a million-cell sphere. Retain an obvious Home/overview escape; consider a small overview locator later only if users repeatedly lose orientation. Do not invent kilometre altitude or geographic location for this abstract canvas.

## Context and creation

Keep existing available-cell and purchased-placement actions, including Start here confirmation. Compact contextual detail can use a shared bottom-surface treatment; do not build a universal sheet framework just for Browse.

Later, if observed use justifies it, introduce Peek / Half / Full detents for details and activity. Use explicit expand/collapse controls as well as drag, safe-area spacing, appropriate focus management and predictable Back/Escape behaviour. Non-modal sheets must not trap focus. Feed items may navigate to their placement and collapse the feed while retaining a return path.

Preserve the current studio in the first delivery. Test choosing a starting spot, connected drawing, image/colour editing, Review, Back/Edit and draft recovery with the new Browse entry. Owner edits retain their locked footprint and location.

Only repeated user evidence should trigger studio changes such as collapsible tools, compact progress or full-screen Review with a placement preview. Any later change follows Design -> Review, retains count/price/action reachability, and allows internal scrolling where needed. A blanket ban on pane scrolling would make short-screen and enlarged-text controls inaccessible.

## Delivery order

1. **Browse layout:** compact introduction, bottom CTA, collapsed/empty activity handling and simpler reachable controls. Preserve desktop and the purchase journey.
2. **Browse framing:** measure the remaining space and fit/centre the globe without cropping or gesture jumps. Verify separately from CSS. Evaluate steps 1-2 together with first-time users before expanding scope.
3. **Evidence-led interaction work:** fix observed discovery or studio problems; consider contextual detents, activity navigation and orientation aids only where useful.
4. **Optional surface study:** test restrained rim lighting, lower particle prominence and placement legibility on populated scenes. Keep behind the existing non-blocking surface-study gate and measure phone GPU/frame/memory costs. No Earth texture, topology changes or coarse grid that appears to represent purchasable cells.

Do not adopt a mandatory 4:1 globe/background luminance target: sphere aesthetics and text contrast are different tests. Overview grid changes and lighting are experiments, not prerequisites for the layout fix.

## Proposed acceptance criteria

These are implementation targets to agree before coding, not completed checks.

- [ ] At 320x568 and 390x844, permanent copy does not cross the globe centre; the full sphere fits within the measured usable rectangle. Compare rendered screenshots before and after.
- [ ] At least 60% of Browse viewport area accepts direct globe gestures, excluding overlays that intercept input. Measure this separately from visible sphere area; sky is interactive canvas, not visible globe.
- [ ] At least 90% of the projected sphere silhouette is unobstructed at rest. Rebuild and visually verify the silhouette measurement before enforcing this target.
- [ ] Claim is the only high-emphasis persistent action, with its centre in the lower 35% of the viewport at default text size. Empty activity reserves no large card.
- [ ] All controls have accessible names and at least 44x44 CSS-pixel targets. At 200% text scaling, all content/actions remain reachable without horizontal overflow; sheets may scroll internally.
- [ ] Drag, pinch, zoom buttons, cell picking, Home, sheet dismissal and Back work without projection jumps or lost selection. Reduced motion removes decorative transitions.
- [ ] Design -> Review -> simulated checkout, Back/Edit and draft recovery preserve the exact footprint, artwork and quoted total. Desktop composition remains intact.
- [ ] Inspect 320x568, 390x844, 430x932, 820x1180, 1024x768 and 1440x900 with empty and populated fixtures; verify safe areas and keyboard behaviour.
- [ ] Run relevant current journeys from [Validation](VALIDATION.md), including composition/startup and purchase navigation; add performance checks if rendering changes.
- [ ] Check physical iPhone/Safari and Android/Chrome for browser chrome, rotation, gestures, background recovery and performance. Observe 5-10 first-time users exploring, inspecting and starting a claim unaided.

A fully visible width-fitted circle can occupy at most about 36% of a 390x844 viewport, before margins. The source hero review's 45% unobstructed-sphere target therefore conflicts with keeping the whole globe visible. Use the separate interaction-area and sphere-occlusion measures above.

## Decisions before implementation

Agree the compact mobile headline/proposition and whether the introduction dismisses for the current visit or persists as dismissed across visits. Approve Browse layout plus framing as the initial scope. Keep studio restructuring and surface effects deferred unless observed evidence makes them necessary.
