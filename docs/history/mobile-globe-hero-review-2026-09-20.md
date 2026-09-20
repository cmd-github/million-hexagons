> Archived source review. Superseded by [the combined recommendation](../mobile-globe-first-layout-recommendations.md). Observations and proposals below are historical, not current acceptance criteria.

# Mobile layout — making the globe the hero

Status: recommendation only. No code changed. Written 20 September 2026.

Aligned to [Product direction](../09-09-26-PRODUCT-DIRECTION.md) priority 5, "Make browsing the
globe interesting even for people who never buy", and to the rule that existing globe/rendering
behaviour is preserved unless a change is explicitly required.

---

## 1. How this was measured

Emulated Chrome via the repository's own Playwright setup against `npm run dev`, at
390x844 (iPhone 14) and 320x568 (smallest supported), `deviceScaleFactor: 2`, touch enabled.

Captured states: first paint after `#world[data-ready=true]`, the same screens with every
overlay forced to `opacity:0` to judge the globe render alone, progressive zoom, the Location
step, and the landing after tap and after a rotate drag.

Screenshots, per-element geometry and the occlusion maths are in `artifacts/mobile-hero-audit/`
(gitignored), alongside the four scripts that produced them.

This is emulated, not physical-device evidence. Local inventory is empty
(`public/artwork/sample` is empty, `sold: 0`), so the globe is rendered with zero placements —
which flatters nothing but is also not what a populated globe will look like.

---

## 2. What the phone actually shows today

### 2.1 The globe is a minority of the screen, and most of it is hidden

Measured from the rendered pixels:

| | 390x844 | 320x568 |
|---|---|---|
| Globe diameter | 327px | 268px |
| ...as % of viewport width | 84% | 84% |
| Globe as % of screen area | 25.5% | 31.0% |
| Globe covered by UI | **61.3%** | **99.1%** |
| **Unobstructed globe as % of screen** | **9.9%** | **0.3%** |

On a 390-wide phone, one tenth of the screen is visible globe. On a 320-wide phone the globe
is effectively invisible — you can see a rim.

The occluder is almost entirely one element. Of the globe's area, the `.intro` hero copy block
covers 59.3% at 390 and 92.5% at 320. The topbar, `#globalMetrics` and `#claimFeed` cover
none of it; `.globe-controls` clips 2-7% at the edge.

### 2.2 The hero copy never yields

`.intro` stays at `opacity: 1` through a tap on the globe and through a rotate drag. There is
no interaction, scroll or timeout that hands the screen back to the globe. The only way to
clear it is to press Claim Your Space and enter the studio.

The structural cause is in [src/style.css:126](../../src/style.css#L126) — `.intro` is
`position:fixed; top:24%; left:4%; width:340px` with `h1{font-size:62px}`, i.e. desktop
composition. The `@media(max-width:700px)` block at
[src/studio.css:536](../../src/studio.css#L536) is well developed for the *studio*, but for the
landing it only shrinks the same slab (`top:132px; left:20px; width:calc(100% - 80px)`,
`h1` clamped to `7.8vw`). The slab is scaled down, never restructured, and never moved off
the globe.

### 2.3 The camera deliberately fits the globe to the narrow axis

[src/main.js:171](../../src/main.js#L171) `globeFitDistance()` fits to
`Math.min(verticalFov, horizontalFov)` with a `1.12` padding factor. On a portrait phone the
horizontal FOV is the smaller one, so the globe is fitted to the **width** — which is why it
is a consistent 84% of width and only ~39% of height on both sizes. The 445px of vertical
space above and below the globe at 390x844 is dead sky.

This is correct, conservative behaviour for a shared desktop composition. It is the wrong
framing rule for a tall portrait screen.

### 2.4 Unzoomed, the globe does not read as an object

With overlays hidden, the globe is a smooth blue disc: no grid, no placements, no rim light,
no terminator, no surface event of any kind. Median globe luminance is 48.9 against a
background of 14.4 — a 2.78:1 figure-to-ground ratio, which is why it reads as a soft gradient
rather than a lit sphere sitting in space.

The material is a single flat `MeshStandardMaterial({ color:'#071c2b', emissive:'#1c3545' })`
at [src/main.js:102](../../src/main.js#L102), lit by a hemisphere plus two directional lights.
There is no Earth texture anywhere in `src/` — correct per the product direction, which calls
for an abstract shared canvas, not a map. But an abstract sphere with nothing on it and no rim
definition has nothing for the eye to hold.

The floating hexagon particles ([src/main.js:153](../../src/main.js#L153)) are currently the most
legible thing on screen. They draw attention *away* from the globe and read as dust.

### 2.5 Zoomed in, all sense of the globe is lost

Zoom to cell level and the screen becomes a flat, featureless blue field with a faint hex grid
and no horizon, no curvature, no scale reference and no indication of where on the globe you
are. This is the single biggest departure from Google Earth, which never lets you lose the
horizon or your altitude.

The Location step asks you to "Move and zoom the globe until you can see individual hexagons,
then choose one to start from" — but at the moment you can see individual hexagons, every cue
that this is a globe has gone.

### 2.6 Controls sit in the hardest-to-reach zone

On the landing, the primary CTA is at the top-right (y 16-60) and `.globe-controls` is a
vertical rail at the top-right (y 125-385). Both are in the worst corner for a one-handed
right thumb, and the rail overlaps the globe edge. In the studio the rail correctly moves to a
horizontal cluster, but it moves to the *top*-right there too.

### 2.7 Smaller issues worth folding in

- `#claimFeed` is open by default and shows a 159px-tall empty box reading "The next live
  placement will appear here." It claims 11.6% of the screen to say nothing. At 320 it also
  sits over the globe's lower rim.
- `#globalMetrics` was still showing "Loading live totals…" well after the globe was ready.
- `scrollHeight === innerHeight`: the landing does not scroll. Every pixel of copy must be
  paid for out of globe area. This is the right call — it just means the copy budget is real.

---

## 3. What to take from Google Earth (and what not to)

Google Earth on a phone works because of five rules:

1. **The globe owns the frame.** It is centred, fills the short axis, and nothing is
   permanently parked on top of it. Chrome is a search pill and a small control cluster.
2. **Controls live in the thumb zone**, bottom-right, not top.
3. **Text arrives in a bottom sheet** that the globe makes room for, by re-centring the camera
   into the remaining band — the sheet never simply covers the planet.
4. **The globe is the brightest object on screen**, always, with a hard lit limb against dark
   space.
5. **You never lose the horizon.** At every altitude there is curvature, a visible terminator
   or atmosphere band, and a persistent altitude/location readout.

What does **not** transfer: Earth's imagery, place labels and geography. Million Hexagons is
deliberately not a map. Our equivalent of "terrain" is the grid and the placements themselves —
so rules 4 and 5 have to be met with grid, limb, lighting and orientation cues rather than with
satellite imagery.

---

## 4. Recommendations

Four phases, ordered by value-per-risk. Phase 1 is layout-only and touches no rendering.

### Phase 1 — Give the globe the screen (CSS only, no render changes)

**1.1 Turn the landing into a globe with a bottom sheet.**

Restructure `.intro` inside the `@media(max-width:700px)` block from a slab over the globe's
centre into a bottom-anchored sheet:

```css
@media(max-width:700px){
  body:not(.detail-view):not(.creating) .intro{
    top:auto; bottom:0; left:0; right:0; width:100%; max-width:none;
    padding:18px 20px max(18px,env(safe-area-inset-bottom));
    background:linear-gradient(to top,#050b14f2 62%,#050b1400);
    display:grid; gap:10px;
  }
}
```

Target a resting sheet height of **≤ 34dvh** at 390x844 and **≤ 30dvh** at 320x568. That
leaves a clear globe band of 66-70% of the screen with nothing over it.

**1.2 Cut the resting copy to what earns its place.**

At rest the sheet shows the eyebrow, `h1`, the price line and the CTA. Everything else —
"One million spaces. A place for your story.", "Includes 12 special, claimable pentagons.",
and the `1,000,000 / YOURS / $1` fact row — moves behind a drag-up or a "What is this?"
affordance on the sheet. The `h1` stays; it is the approved headline and it is the reason
someone stays. Drop it to `clamp(26px, 7vw, 36px)` in the sheet.

**1.3 Move the primary CTA into the sheet and out of the topbar.**

`#claimButton` becomes a full-width button at the bottom of the sheet, in the thumb zone.
Keep the topbar as brand-only on phones (it already shrinks to 76px); consider dropping it to
a 56px transparent bar with just the mark.

**1.4 Let the globe take the space that frees up.**

Once the sheet is bottom-anchored, re-centre the camera into the visible band rather than the
viewport. Two changes in [src/main.js:171](../../src/main.js#L171):

- On portrait (`innerHeight > innerWidth`), fit to the **visible band height** rather than to
  `Math.min(verticalFov, horizontalFov)`, using the sheet height exposed as a CSS variable or
  measured rect.
- Reduce the `1.12` padding factor to ~`1.04` on phones.

Expected result at 390x844: globe diameter ~360-380px, centred at roughly y=280 rather than
y=382, globe area ~35-40% of screen with **zero** occlusion — against 9.9% unobstructed today.

**1.5 Collapse `#claimFeed` by default on phones, and hide it when empty.**

`<details open>` should not be open on a phone, and the panel should not render at all when
there are no items. Recovers ~12% of the screen and removes a dead box from the first
impression.

**1.6 Fade the sheet on globe interaction.**

On `pointerdown` on `#world`, drop the sheet to `opacity:.12` and `translateY(60%)`; restore on
pointer-up after a short delay. Cheap, and it makes the globe feel like the subject. The
transition already exists at [src/style.css:27](../../src/style.css#L27).

### Phase 2 — Make the globe worth looking at

These touch rendering, so they belong behind the existing "globe surface studies" gate and
should be judged on a populated globe, not the empty local fixture.

**2.1 Add a limb/atmosphere rim.** A backside-rendered shell with a Fresnel falloff in the
existing lime/cyan family, or an additive sprite behind the sphere. This is the single highest
-value visual change: it converts a flat disc into a lit sphere and lifts the 2.78:1
figure-to-ground ratio without brightening the whole surface.

**2.2 Raise base figure-to-ground to ~4:1.** Either lift `emissive` slightly or deepen the
space background. Keep the globe the brightest object on screen at every altitude.

**2.3 Show the grid at overview altitude, faintly.** Right now the grid only resolves at
extreme zoom, so the "one million spaces" claim is invisible at the exact moment it should
land. A very low-opacity grid, or a coarse proxy grid at overview altitude, makes the promise
visible and gives the eye something to hold.

**2.4 Turn down the floating hexagon particles.** They are currently more legible than the
globe. Reduce opacity/count on phones so the globe is unambiguously the focal point.

**2.5 Make placements read at overview altitude.** With real inventory, a sold cluster should
be visible as a bright mark from the default view. This is what will make the globe worth
returning to as it fills — priority 5 in the product direction.

### Phase 3 — Controls into the thumb zone

**3.1 Move `.globe-controls` to bottom-right on phones**, above the sheet, as a compact
cluster. `body:not(.creating) .globe-controls{right:12px; top:125px}` becomes bottom-anchored
with `bottom: calc(var(--sheet-height) + 12px)`.

**3.2 Reduce the resting control set to three** — zoom in, zoom out, re-centre. Search,
rotation-pause and tour move behind a single overflow control or into the topbar. Six stacked
44px buttons is a desktop rail on a phone.

**3.3 In the studio, move the control cluster to the bottom** of the globe band, just above
the studio sheet, for the same reason. Today it goes to the top-right
([src/studio.css:560](../../src/studio.css#L560)).

### Phase 4 — Never lose the globe when zoomed in

This is the Google Earth rule that matters most for the Location step.

**4.1 Keep a horizon.** Cap the zoom so the limb stays on screen, or add a subtle curvature/
horizon band at high zoom. The current top-down flat field gives no orientation at all.

**4.2 Persistent altitude and location readout.** A small, always-visible "cell #123,456 ·
12 km" style chip. Google Earth's altitude readout is quietly doing a lot of orientation work.

**4.3 An inset locator.** A small globe thumbnail bottom-left showing where the current view
sits. Cheap to render (reuse the overview camera), and it solves "where am I" outright.

**4.4 Zoom-out breadcrumb.** A single tap that pulls back to overview with an animated flight,
so getting lost is never a dead end. `#homeView` exists — it should be prominent at high zoom.

---

## 5. Risks and things to deliberately not do

- **Do not add an Earth texture.** Tempting for "hero" impact, contradicts the product
  direction, and would reframe the product as a map.
- **Do not restructure the studio panels.** They are well developed at `max-width:700px` and
  the direction explicitly defers speculative studio-layout changes to observed user evidence.
  Phases 1-4 above are about the landing, the camera framing and the globe render.
- **Phase 2 has performance cost.** A rim shell is one extra draw call and is cheap; an
  overview grid is not necessarily. Measure against `npm run test:performance` and the
  `drawCalls`/`tiles` figures in the `geodesicQA` state hook before committing.
- **Phase 1.4 changes shared camera geometry.** `globeFitDistance()` is used beyond the
  landing. Gate the new framing on portrait phones only, and re-run
  `npm run test:visual`, `npm run test:globe-startup` and `npm run test:desktop-composition`,
  which assert camera distance behaviour.
- **This evidence is emulated.** Per [VALIDATION.md](../VALIDATION.md), physical iOS/Android
  inspection is still required, and should happen against a globe with real inventory.

---

## 6. Suggested acceptance criteria

Measurable, so they can go straight into a QA script alongside the existing ones:

1. At 390x844 and 320x568, unobstructed globe ≥ **45%** of screen area at rest
   (today: 9.9% and 0.3%).
2. No element overlaps the globe's bounding circle at rest, except controls clipping < 5%.
3. Resting sheet height ≤ 34dvh at 390x844, ≤ 30dvh at 320x568.
4. The primary CTA's centre sits within the bottom 35% of the viewport.
5. Globe median luminance vs background ≥ **4:1** (today 2.78:1).
6. At maximum zoom, either a limb or a horizon band is on screen, and an altitude/location
   readout is visible.
7. No pane scrolling at 320x568, 390x844, 1024x768, 1440x900 — the existing standing rule.
8. `npm run test:visual`, `test:globe-startup`, `test:desktop-composition` and
   `test:performance` still pass.

---

## 7. Open questions for Craig

1. **Is the headline allowed to move?** Phases 1.1-1.2 put `h1` in a bottom sheet and demote
   the supporting copy. Gate 5 refers to an "approved headline" — is its *placement* fixed, or
   only its wording?
2. **How much of the pitch has to survive at rest on a phone?** The strongest version shows
   eyebrow + headline + price + CTA and nothing else. Is that acceptable, or must the
   1,000,000 / YOURS / $1 fact row stay visible without interaction?
3. **Does Phase 2 clear the "globe surface studies" gate?** It is currently listed under
   "After launch / non-blocking". The rim light (2.1) and figure-to-ground (2.2) are small and
   high-impact; 2.3 and 2.5 are larger. Worth pulling 2.1/2.2 forward?
4. **Is there a populated staging globe to judge this against?** Local inventory is empty, so
   every judgement about "does the globe look interesting" is being made on a blank sphere.
5. **Phase order.** Phase 1 alone takes unobstructed globe from 9.9% to roughly 35-40% and is
   almost entirely CSS. Ship Phase 1 and re-measure before committing to 2-4?
