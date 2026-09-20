# Mobile globe: combined recommendation

Status: proposed direction, consolidated 20 September 2026. Documentation only; no UI or rendering changes implemented.

## Outcome

Make the globe the obvious thing to explore on a phone, with a clear, reachable path to claiming space. Keep the brand and proposition, but stop permanent copy and empty activity from covering the world.

This combines the progressive information and interaction model from the [layout review](history/mobile-globe-first-review-2026-09-20.md) with the occlusion diagnosis and staged delivery from the [hero review](history/mobile-globe-hero-review-2026-09-20.md). Those originals are archived, not competing plans.

Follow [Product direction](09-09-26-PRODUCT-DIRECTION.md), especially its current Design on globe -> Review flow. Both source reviews describe an older Location -> Shape -> Design -> Review journey. Do not reintroduce those stages. Preserve the exact million-cell topology, confirmed starting spot, connected editing, purchase state and permanent placement identity.

## What the evidence supports

Both reviews report local emulated-phone inspection at 390x844 and 320x568. Their shared finding is persuasive: the permanent headline/copy stack dominates Browse, the six-button rail adds clutter, and an empty activity card spends space without helping exploration. The layout review also reports desktop/tablet comparison and cramped studio controls.

The hero review quotes 61.3% and 99.1% globe occlusion. That challenge was correct about the evidence and has now been resolved. The `occlusion-390.json`/`occlusion-320.json` files it cites came from an abandoned first attempt that projected cells through the `geodesicQA` hook; at overview altitude only two cells are loaded, so it reported 11px and 0px diameters and was discarded. The published percentages actually came from a separate pixel measurement of the silhouette that was never written to disk — a real gap in the trail, not a real gap in the numbers.

The measurement has been rebuilt as a single reproducible script, `artifacts/mobile-hero-audit/measure-occlusion.mjs`, which captures a clean render with overlays transparent, finds the globe silhouette row by row, and intersects it with the live overlay rects. The misleading files have been deleted and replaced by `occlusion-measured.json`. Re-running it confirms the claims with one small revision:

| | 390x844 | 320x568 |
|---|---|---|
| Globe diameter | 327px | 267px |
| Globe as % of screen | 25.5% | 30.8% |
| Globe covered by UI | **59.5%** (was quoted 61.3%) | **99.2%** |
| Unobstructed globe as % of screen | **10.3%** | **0.2%** |
| Permanent chrome as % of screen | 52.0% | 79.8% |

`.intro` alone accounts for 57.7% of the covered globe at 390 and 92.8% at 320. The 390 figure moves by 1.8 points because the row-wise silhouette is more precise than the earlier bounding-box estimate. Treat these as the baseline. The artifact folder is gitignored, so re-run the script rather than expecting the JSON to be present.

The source audits report an empty local globe and no physical-device testing. This consolidation did not rerun browser QA. Judge the eventual design with empty, sparse and populated inventory; do not infer real-phone performance or populated-globe quality from these audits. The layout review also records a stale second Claim action in the purchase-polish script; repair or verify that journey before relying on it.

## Visual Google Earth reference audit

Neither source review visually inspected Google Earth. The layout review worked from Google's interaction documentation; the hero review's five "rules" were written from recollection and are now known to be wrong in two specifics (see Corrections below). That gap was closed in two passes on 20 September 2026: first from official store screenshots, then from a live measured capture.

### Evidence inspected

- The current [Google Earth listing on Google Play](https://play.google.com/store/apps/details?hl=en_GB&gl=GB&id=com.google.earth), updated 10 September 2026. Eight official portrait phone screenshots and six landscape/tablet screenshots were inspected at source resolution.
- The current [Google Earth listing on Apple's UK App Store](https://apps.apple.com/gb/app/google-earth/id293622097). Its visible iPhone previews show the same core composition as Google's Android imagery.
- Google's current [mobile navigation guidance](https://support.google.com/earth/answer/7364447?co=GENIE.Platform%3DAndroid&hl=en-GB) and [product overview](https://www.google.com/earth/about/download/).

These are official current promotional screenshots, not a controlled recording of app launch or every interaction state. This establishes the published mobile visual hierarchy; it does not claim physical-app gesture or animation verification. No physical Android/iPhone instance was connected.

The live Earth web client was initially reported as uncapturable because its navigation aborted. That was a solvable harness problem, not a property of the client, and it has since been captured and measured — see [Live web-client capture](#live-web-client-capture-measured) below.

### What the official phone screenshots show

- Earth imagery fills essentially the complete viewport, including behind the system status region.
- There is no persistent logo, headline, explanatory paragraph, fact strip, metric or promotional card over the scene.
- Search is one circular button at the top-left and Layers is one circular button at the top-right.
- Compass, Street View, 2D/3D and location form a small vertical cluster on the lower-right edge.
- Scale is a quiet line and label at bottom-left.
- Context rests as a shallow bottom-sheet Peek with only a drag handle visible.
- Controls are isolated white circles, not one large framed toolbar.
- The middle of the viewport remains completely clear for viewing and direct manipulation.

The iPhone previews use the same broad grammar: full-bleed imagery, two isolated top controls, a compact lower-right navigation cluster, scale at bottom-left and a bottom surface. This cross-platform consistency is more useful than any Android-specific pixel value.

The published screenshots are mostly close aerial/3D views rather than the opening whole-Earth view. They support conclusions about chrome, hierarchy and contextual surfaces; they do not establish Google's exact default globe diameter or launch-camera position. The live capture below does establish those, and the answer turned out to contradict an assumption running through both source reviews.

### Live web-client capture, measured

The gap noted above — that promotional stills "do not establish Google's exact default globe diameter or launch-camera position" — has since been closed. The live Earth web client **was** captured on 20 September 2026 at the same 390x844 viewport used for our own audit, and measured the same way. Captures and scripts are in `artifacts/mobile-hero-audit/google-earth/`.

The earlier navigation abort was a mobile user-agent being redirected to an "Open in app?" interstitial. Using a desktop user-agent at a 390px viewport loads the real WebGL client. That is the important caveat: this is the **web build at phone width**, not the native app, and the two differ (most visibly, the web build shows a wide labelled search pill where the native app uses a circular button). Where the two disagree, prefer the native-app grammar from the store screenshots; where they agree, the evidence is now strong.

Measured at the default whole-Earth view:

| | Google Earth (web, 390x844) | Million Hexagons (390x844) |
|---|---|---|
| Scene as % of screen | **75.9%** earth + 14.9% space | 25.5% globe |
| Permanent chrome as % of screen | **9.0%** | **52.0%** |
| Scene covered by chrome | ~0% (floating pills only) | **59.5%** |
| Scene median luminance | 136.3 | 48.9 |
| Background median luminance | **1** (pure black) | 14.4 |
| Figure-to-ground ratio | **23.5:1** | **2.78:1** |

Two findings change the direction, both of which the store screenshots could not show:

**1. Earth does not fit the globe into the frame — it overfills it.** At the default view the sphere is cropped off the left, right and bottom edges, with only the upper limb and atmosphere band visible against black. The globe is not a disc floating in space with margin around it. Our `globeFitDistance()` at [src/main.js:171](../src/main.js#L171) does the opposite: it fits to `Math.min(verticalFov, horizontalFov)` with a `1.12` padding factor, so on a portrait phone it fits the sphere to the *width*, leaving 445px of empty sky above and below.

The archived hero review's "fit the globe into the visible band" and this document's "fit to both width and height" were both assuming a constraint that the reference product does not accept, and the assumption had never been examined. Craig has since decided to follow Earth and overfill; the measured geometry is in Camera and interaction rules.

**2. At low altitude there is no horizon at all.** A tilted 1200m view is entirely surface — no curvature, no limb, no sky. Orientation comes instead from three things: camera tilt giving 3D parallax, place labels drawn over the scene, and a small 2D minimap inset at top-right, plus a 2D/3D toggle. This directly contradicts the archived hero review's proposal to "keep a horizon" at high zoom, which should not be implemented as written. The transferable rule is *keep an orientation cue*, and the cheap one is the inset locator — which Earth has, and which is now evidence-backed rather than speculative. Our equivalent of place labels is neighbouring placements and owner names.

The contrast gap is the other actionable number. Earth's background is pure black, ours is a dark navy at luminance 14.4, and that difference alone accounts for much of the 23.5:1 versus 2.78:1 gap. Deepening the space background costs nothing and requires no change to the globe material.

### Direct comparison

| Surface | Current Million Hexagons Browse | Current Google Earth official phone imagery | Million Hexagons direction |
|---|---|---|---|
| Primary scene | Globe sits behind the product pitch | World imagery owns almost every pixel | Let the globe own the viewport |
| Top-left | Full MH mark and wordmark | One Search button | Use the compact mark; keep utilities light |
| Top-right | Large Claim Your Space action | One Layers button | Move Claim into the bottom thumb area |
| Centre | Headline, supporting copy, price and facts cross the sphere | Completely clear | Keep the central globe region empty |
| Right edge | Six controls inside one 260px framed rail | Four separated contextual circles in the lower half | Show only stage-relevant controls and remove the containing rail |
| Bottom | Large open Latest activity card | Shallow bottom-sheet Peek | Collapse activity/selection into a compact bottom surface |
| Empty state | Large card explains that activity will appear | Scene remains the content | Reserve no large area for absent activity |
| Commercial action | Competes with branding at the top | Not applicable | Retain one strong Claim action below the globe's centre |

### Consequences for this recommendation

The visual audit strengthens four proposals and adjusts one:

1. Keeping the central third clear should be a hard design rule, not just a preference.
2. Collapsed activity and selected-object detail should share a shallow bottom-surface grammar.
3. Remove the framed six-button rail. Three or four individually floating, stage-relevant controls will feel lighter even before reducing the count further.
4. Claim remains prominent because Earth has no equivalent commercial task, but it belongs in the bottom thumb zone rather than a top corner.
5. Do not introduce a large permanent Search pill by default. At 320px use a circular icon; at wider phone sizes expand only when active or when evidence shows a label is needed. The live web build does use a wide labelled pill at 390px, but the native app does not, and the native grammar is the better reference for a phone.

The live capture adds three more:

6. Overfill and crop on portrait phones, as Earth does, reaching roughly 70% scene coverage against 25.5% today. Decided; the measured limb geometry is in Camera and interaction rules.
7. Deepen the space background toward black. Earth reaches 23.5:1 figure-to-ground where we are at 2.78:1, and the background colour accounts for much of that gap. This is the cheapest change measured in this document. Tracked with a target rather than enforced as a gate.
8. Do not force a horizon at high zoom. Earth abandons the horizon entirely when tilted and close, and replaces it with labels, parallax and a minimap inset. This agrees with the camera rules already in this document and removes the archived hero review's conflicting proposal. An inset locator is now a verified pattern rather than a guess, though still evidence-gated for our own abstract sphere.

Borrow this hierarchy, not Google's white Material styling, satellite imagery or exact control set.

### Corrections to the source reviews

Recorded so nobody mines the archived reviews for claims that have since been tested.

| Claim | Source | Status |
|---|---|---|
| "The globe owns the frame. It is centred, fills the short axis" | hero review, rule 1 | **Wrong.** Earth overfills and crops the sphere on three edges. |
| "You never lose the horizon... at every altitude there is curvature" | hero review, rule 5 | **Wrong.** A tilted 1200m view has no horizon at all. |
| "Text arrives in a bottom sheet that the globe makes room for" | hero review, rule 3 | **Unverified.** Not observed in the web build; the store imagery does show a bottom-sheet Peek, so treat as plausible but unconfirmed. |
| "Controls live in the thumb zone, bottom-right" | hero review, rule 2 | **Confirmed**, by both store imagery and live capture. |
| "The globe is the brightest object on screen" | hero review, rule 4 | **Confirmed**, and quantified at 23.5:1. |
| Suggested "cell #123,456 · 12 km" altitude readout | hero review, 4.2 | **Rejected.** Invents geography for an abstract canvas. Cell ID alone is fine. |
| 45% unobstructed-sphere target | hero review | **Superseded.** Impossible while fitting the whole sphere; depends on the open framing decision. |
| 61.3% / 99.1% occlusion | hero review | **Confirmed** at 59.5% / 99.2% after rebuilding the measurement. |
| Live web client "could not be captured" | this document, earlier revision | **Resolved.** Harness problem, since captured. |
| "Do not adopt a mandatory 4:1 luminance target" | this document, earlier revision | **Partly upheld.** Not a gate, but tracked with a target; the measurement is like-for-like, not a borrowed text threshold. |

The two source reviews' behavioural conclusions — direct manipulation on the scene, progressive disclosure, edge-anchored controls, no permanent pitch over the world — are unaffected and were independently supported by the capture.

## Recommended phone composition

- **World:** retain a full-bleed canvas in a dynamic-viewport-height shell, with no Browse body scrolling. On portrait phones the sphere overfills the frame and is cropped at the edges, with the limb held near the top; see Camera and interaction rules. Leave the visible centre clear of permanent copy.
- **Top:** compact brand mark and one menu/account affordance. Keep search accessible through existing navigation initially; a new permanent search pill needs demonstrated use.
- **Bottom:** one prominent Claim Your Space action above the safe area. Move the existing action here rather than duplicating it. Retain its wording pending the separate headline/copy decision.
- **Introduction:** a compact bottom introduction above the CTA, containing the agreed headline, one short proposition and current price only when available. Move supporting facts and explanation into About. Start with a total introduction/action budget near 30% of usable height; allow readable, scrollable disclosure when text scaling or a short screen requires it.
- **Controls:** a compact Home/re-centre and zoom cluster near the lower edge of the globe band. Keep button alternatives to pinch discoverable and reachable; put Tour and other secondary actions in More. Avoid replacing six visible controls with a different six-control arrangement.
- **Activity:** collapsed by default. Show a small real-event summary when available; hide the empty feed surface. Loading/error states must be compact and truthful, with retry where useful.

After the first intentional drag, pinch or zoom, dismiss the introductory copy and keep the CTA reachable. About can restore the explanation; Home restores framing without reopening the pitch. Do not fade the whole action area on every pointer-down or restore it after every pointer-up: that produces flicker and can hide actionable controls. Invisible UI must not intercept touches or retain hidden focus targets.

Keep the existing navy/lime identity. Use a small consistent overlay surface for readable text rather than dimming the whole scene. Background particles should support the sphere, not compete with it.

## Chrome budget: every surface, not just Browse

Craig's framing, 20 September 2026: the central principle is that **menus, info panels and design boxes must stay compact enough that they never take over the globe** — the same discipline Earth applies. This section makes that a budget rather than a preference, and applies it to surfaces the rest of this document had exempted.

The Browse case is already covered above: chrome at most 20% of the viewport, clear centre, collapsed activity, reduced controls. The gap is everything else. Panel heights, read from [src/studio.css](../src/studio.css) at the `max-width:700px` breakpoint:

| Surface | Rule | Panel as % of screen | Globe left |
|---|---|---|---|
| Location | `top:62dvh` (line 549) | 38% | 62% |
| Shape | `top:38dvh` (line 548) | 62% | 38% |
| Design | `top:38dvh`, `32dvh` under 650px tall (line 588) | 62-68% | 32-38% |
| **Review** | `top:16dvh` (line 550) | **84%** | **16%** |
| Placement inspector | `max-height:55dvh` | up to 55% | 45% |

So during Shape and Design — the stages where the user is working *on the globe* — the globe holds a third of the screen. At Review it holds a sixth. These are the surfaces Craig is describing, and they are worse offenders than the landing copy that this document was written about.

Proposed budgets, to be agreed:

- No surface exceeds **50%** of the viewport at rest on a phone. Contextual detail (inspector, activity, selection) stays at or under **35%**.
- Review may exceed the budget, because at Review the user is reading a summary rather than manipulating the globe. If it does, make that a deliberate, stated exception rather than a side effect of a `dvh` value.
- Any surface over 40% offers a collapse or peek state that returns the globe to at least 60%.
- Measure the same way as Browse, with the panel rect against the viewport, and record it per stage.

**This conflicts with an existing deferral, and that needs a decision.** [STATUS.md](STATUS.md) lists studio-layout changes under "After launch / non-blocking", and this document says "preserve the current studio in the first delivery" and "only repeated user evidence should trigger studio changes such as collapsible tools, compact progress or full-screen Review". Those rules exist for good reason: the studio works, and speculative restructuring risks a working purchase flow.

Craig has now named panel compactness as the key principle, which is direction rather than speculation. But the two positions cannot both stand. The options are:

1. **Hold the deferral.** Fix Browse now; bring the studio budgets to the Gate 2 sessions and change it on observed evidence. Slowest, safest, and consistent with the existing rules.
2. **Treat the budget as a constraint, not a restructure.** Adjust the `dvh` values and add collapse states without changing the studio's structure, tools or flow. Much smaller than "restructure the studio" and probably reaches most of the benefit.
3. **Lift the deferral.** Restructure the studio for compactness in the first delivery. Largest scope and the most risk to a working purchase journey.

Option 2 is the recommendation: it honours the principle, is mostly numbers rather than architecture, and does not reopen the studio's design. The numbers above are the starting point for it.

Note the caveat on evidence: the per-stage figures are read from the CSS rules and confirmed by a forced flow state, not by an exercised purchase journey. Only the Location figure was independently confirmed from a real captured screenshot. Re-measure across a genuine Design -> Review journey before fixing the budgets.

## Camera and interaction rules

Moving copy is layout work; fitting and re-centring the globe is a separate camera change and needs regression coverage.

Measure a usable rectangle from safe areas, top chrome and the bottom surface, then centre the globe in that rectangle rather than in the raw viewport. Keep desktop behaviour unchanged.

Portrait phones overfill, per the decision recorded above. Measured from Google Earth at 390x844 at 20,000km altitude. Earth's own opening view, captured separately with no camera in the URL, reports 22,251km — about 11% further out — so the figures below are from a very slightly closer view than its true default:

| Property | Google Earth | Target |
|---|---|---|
| Limb apex, from top of viewport | 86px (10% of height) | ~10% of height |
| Limb where it meets the left/right edges | 148px (17.5%) | sphere spans the full width |
| Sag between apex and edges | 62px | a shallow arc, not a tight curve |
| Space above the limb at centre | 6.6% of viewport height | under 12% |
| Scene below the limb | 93.4% of viewport height | the rest is world |

Two implementation notes, because overfilling is not simply "move the camera closer":

1. **The globe centre must sit below the viewport**, otherwise reducing distance crops the sphere on all four edges at once and the limb leaves the top of the screen entirely. Earth's implied sphere centre is far below the bottom edge. Offset the controls target (or the rendered globe) downward rather than only shortening the camera distance.
2. **The sphere's angular radius must exceed half the horizontal FOV** so it genuinely bleeds off the sides. At 390x844 with `camera.fov = 38`, the horizontal FOV is about 18 degrees, which is the axis `globeFitDistance()` currently fits to.

This replaces the `Math.min(verticalFov, horizontalFov)` fit with its `1.12` padding at [src/main.js:171](../src/main.js#L171) for portrait phones only. Desktop and landscape keep the current fitted framing. Solve for the distance and offset numerically against the limb-apex target and verify with the measurement script rather than hard-coding a distance; `globeFitDistance()` is shared by Home, placement flights and picking, so all three need regression coverage.

Use the same camera/projection state for rendering, placement flights, Home and picking. Pointer coordinates remain relative to the actual canvas; do not casually remap them to the smaller usable rectangle. Defer sheet-driven framing changes until all active pointers are released, including pinch gestures. Do not alter the picked cell during an active gesture.

Keep cell-level zoom. A visible horizon at every scale is not a workable requirement for selecting tiny cells on a million-cell sphere. The live capture confirms this independently: Google Earth abandons the horizon completely at low tilted altitude, so the archived hero review's "never lose the horizon" rule is wrong on its own terms and must not be implemented.

What Earth substitutes is instructive: parallax from tilt, labels over the scene, and a small 2D inset locator. The inset locator is therefore a verified pattern rather than a guess, which strengthens the case for it — but it stays evidence-gated for *our* product, because an abstract single-colour sphere may not disorient users the way varied terrain does. Retain an obvious Home/overview escape as the first-line answer; build the locator if observation shows Home is not enough.

Do not invent kilometre altitude or geographic location for this abstract canvas. This overrides the archived hero review's suggested "cell #123,456 · 12 km" readout, which imported a geographic idea that does not apply here. A cell identifier alone is legitimate; a fabricated altitude is not. Our equivalent of Earth's place labels is neighbouring placements and owner names.

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

Overview grid changes and lighting are experiments, not prerequisites for the layout fix.

On the luminance question, this document previously said "do not adopt a mandatory 4:1 globe/background luminance target: sphere aesthetics and text contrast are different tests." That objection is right about borrowed text-contrast thresholds and wrong as a reason to ignore the measurement. Figure-to-ground separation was measured directly on both products: 2.78:1 here against 23.5:1 in Google Earth. That is not a text-accessibility threshold applied to a sphere; it is a like-for-like measurement of the same property, and a gap that large is a real finding about why our globe reads as a background gradient.

Resolution: treat figure-to-ground as a tracked diagnostic with a target, not as a blocking gate. It informs the background-colour decision and the optional surface study; it does not hold up the layout fix. The specific number is recorded under acceptance criteria and should be revisited once measured on a populated globe, which will raise it on its own.

## Proposed acceptance criteria

These are implementation targets to agree before coding, not completed checks.

- [ ] At 320x568 and 390x844, permanent copy does not cross the visible centre of the globe. Compare rendered screenshots before and after.
- [ ] On portrait phones the sphere overfills the viewport: it spans the full width, the limb apex sits within the top 12% of height, and scene coverage is at least 65% (today 25.5%). Desktop and landscape keep the current fitted framing.
- [ ] At least 60% of Browse viewport area accepts direct globe gestures, excluding overlays that intercept input. Measure this separately from visible sphere area; sky is interactive canvas, not visible globe.
- [ ] At least 90% of the *visible* sphere area is unobstructed at rest (today 40.5% at 390x844 and 0.8% at 320x568). With an overfilled globe this is measured against the on-screen sphere area, not a full silhouette. The measurement has been rebuilt and verified as `measure-occlusion.mjs`, so this target is now enforceable.
- [ ] Claim is the only high-emphasis persistent action, with its centre in the lower 35% of the viewport at default text size. Empty activity reserves no large card.
- [ ] All controls have accessible names and at least 44x44 CSS-pixel targets. At 200% text scaling, all content/actions remain reachable without horizontal overflow; sheets may scroll internally.
- [ ] Drag, pinch, zoom buttons, cell picking, Home, sheet dismissal and Back work without projection jumps or lost selection. Reduced motion removes decorative transitions.
- [ ] Design -> Review -> simulated checkout, Back/Edit and draft recovery preserve the exact footprint, artwork and quoted total. Desktop composition remains intact.
- [ ] Inspect 320x568, 390x844, 430x932, 820x1180, 1024x768 and 1440x900 with empty and populated fixtures; verify safe areas and keyboard behaviour.
- [ ] Run relevant current journeys from [Validation](VALIDATION.md), including composition/startup and purchase navigation; add performance checks if rendering changes.
- [ ] Check physical iPhone/Safari and Android/Chrome for browser chrome, rotation, gestures, background recovery and performance. Observe 5-10 first-time users exploring, inspecting and starting a claim unaided.

A fully visible width-fitted circle can occupy at most about 36% of a 390x844 viewport, before margins. The source hero review's 45% unobstructed-sphere target therefore conflicts with keeping the whole globe visible. That arithmetic is right, and it exposes a real choice rather than a mistake, because the live Earth capture shows Earth resolves it by **not** keeping the whole globe visible — it overfills the frame and crops the sphere, reaching 75.9% scene coverage.

The requirement that the full sphere fit within the measured usable rectangle — carried in the first criterion above and in the camera rules — was therefore not neutral. It was one of two incompatible positions:

- **Fit the whole sphere.** Ceiling of ~36% scene coverage. Argues that Million Hexagons is about a finite whole — one million spaces on one world — so seeing the entire globe at rest is part of the proposition in a way it never is for Earth.
- **Overfill and crop, as Earth does.** Reaches ~70%+ scene coverage and feels far more immersive, but the viewer never sees the whole world at rest and must zoom out deliberately.

**Decided 20 September 2026 by Craig: overfill and crop, as Google Earth does.** The remaining risk is that cropping weakens the finite/scarcity message, since a world that runs off the edges reads as endless. That is to be carried by copy and live state — the headline, the count and the fill meter — rather than by the camera. Watch for it in the Gate 2 first-time-user sessions: if people cannot say how much of the world is left, the message is not landing and the framing should be revisited.

Add two measurable targets that are independent of that choice:

- [ ] Permanent chrome occupies no more than 20% of the viewport at rest on Browse (today 52.0% at 390x844 and 79.8% at 320x568; Earth is 9.0%).
- [ ] No studio or contextual surface exceeds 50% of the viewport at rest, and contextual detail stays at or under 35% (today Shape/Design 62-68%, Review 84%, inspector up to 55%). Any stated exception, such as Review, is deliberate and recorded. See Chrome budget.
- Tracked, not gating: figure-to-ground ratio of globe to background median luminance, target 8:1 or better (today 2.78:1; Earth reaches 23.5:1). Measured with the same method as `measure-occlusion.mjs`. Per Delivery order, this informs the background-colour and surface-study decisions and must not block the layout fix. Re-measure on a populated globe before treating the number as settled.

## Decisions before implementation

Agree the compact mobile headline/proposition and whether the introduction dismisses for the current visit or persists as dismissed across visits. Approve Browse layout plus framing as the initial scope. Keep studio restructuring and surface effects deferred unless observed evidence makes them necessary.

**Decided.** Fit the whole sphere, or overfill and crop? Craig chose to follow Google Earth and overfill, on 20 September 2026. Measured target geometry is in Camera and interaction rules; the scarcity-message risk it carries, and how to watch for it, are recorded under acceptance criteria. Portrait phones only — desktop and landscape keep the current fitted framing.

One decision remains from the live Earth capture:

1. **Does deepening the space background toward black clear the deferred "surface effects" gate?** It is a background colour change rather than a globe-material or shader change, it is the single cheapest improvement measured here, and it moves figure-to-ground substantially on its own. Worth separating from the rest of the deferred surface work.
