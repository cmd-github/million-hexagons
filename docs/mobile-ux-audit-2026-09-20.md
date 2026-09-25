# Mobile UI/UX audit — headed Android emulator

Status: findings only, nothing changed. 20 September 2026.

Device: `Pixel_8a_API_35`, Android 15 / API 35, Chrome 153, portrait **411x812 CSS** at DPR 2.625,
against staging Worker `0b808d6e-6eb1-4d61-92b0-4dfc43b4db96`.

Every screen below was opened on the device and measured in place. Screenshots and the probe
are in `artifacts/ux-audit/`. The probe reports touch-target size (including any hit area a
pseudo-element adds), horizontal overflow, overlapping controls, scrollable panes and text under
10px, on whatever surface is open.

Surfaces covered: Browse, search, account panel, activity ticker collapsed and expanded,
placement inspector, Nearby, share card, toast, and the full Location → Shape → Design → Review
journey including the Image and Colour tools, brushes, presets, Fill, the keyboard and the exit
dialog. Not covered: My Globe and admin (need a signed-in owner), live checkout, iOS/Safari,
and any physical handset.

---

## 1. The headline problem: touch targets

**44x44 CSS px is this repo's own acceptance criterion.** Across the app, **52 distinct controls
measure smaller than that**, and about half of those are ones I shrank while compacting the
studio to stop it scrolling. That trade was made without flagging it, and it should not stand.

### Introduced by the recent compaction

| Control | Measured | Where |
|---|---|---|
| `#claimButton` | 122x38 | Browse header |
| `#closeBuy` | 38x38 | Studio, all steps |
| Flow progress steps (x4) | 78x28 | Studio, all steps |
| `#hexAmount` | 254x36 | Shape |
| Stepper `−` / `+` | 48x36 | Shape |
| `+10` / `+25` / `+100` | 117x32 | Shape |
| Selection brushes S/M/L | 52x34 | Shape |
| `#logoScale` slider | 244x**22** | Design |
| `#logoOrientation` slider | 269x**22** | Design |
| `#resetLogo` | 352x28 | Design |
| `.add-image` | 352x40 | Design |
| Image / Colour / Clear all | 110x40, 58x40 | Design |
| `#undoPaint` / `#redoPaint` | 44x40 | Design |

The two **22px sliders** are the worst of these. They are drag targets, not taps, and 22px is
below what a thumb can reliably grab.

### Pre-existing

| Control | Measured | Where |
|---|---|---|
| `#claimFeed summary` | 248x**12** | Browse — expanding the ticker |
| `.recent-colour` | 24x24 | Design, Colour |
| `#customColour` | 28x28 | Design, Colour |
| Colour swatches (x24) | 43x34 | Design, Colour |
| `#fillCells` | 40x44 | Design, Colour |
| Paint brushes S/M/L/XL | 34x44 | Design, Colour |
| `#claimCell` | 150x32 | Location, cell tooltip |
| `#reviewEditDesign` | 378x32 | Review |
| `#pinInspector` | 47x32 | Inspector |
| `#deleteTestPlacement` | 78x33 | Inspector |
| `#closeShareCard` | 38x38 | Share card |
| `#shareCardFormat` | 295x33 | Share card |
| Share destinations (x6) | 173x40 | Share card |
| `.brand` | 99x32 | Browse header |
| `#hexSearchInput` | 150x36 | Search |
| `#accountEmail` / `#sendAccountLink` | 234x38 / 242x30 | Account |

**`#claimFeed summary` at 12px tall is the single worst target in the app.** It is the only way to
expand the activity ticker.

### What to do

The pattern that already works is on the globe controls: a 36px visual circle with a
pseudo-element extending the hit area to 44px. That decouples how big a control *looks* from how
big it is to hit, which is exactly the tension the compaction ran into. Applying it to the
studio's small controls would restore compliance without giving back the vertical space.

Where a control genuinely needs to be bigger — the two sliders, the feed summary — it should
grow, and the height budget should absorb it.

---

## 2. Text size

Twelve distinct text elements render below 10px. The smallest is deliberate and too far.

| Text | Size | Note |
|---|---|---|
| Flow progress labels (Location/Shape/Design/Review) | **7px** | Introduced by the compaction |
| `.intro .eyebrow` "A SMALL SPACE…" | **8px** | Introduced by the compaction |
| `.optional` "Optional · 160 characters" | 8px | Review form hints |
| Share card frame caption | 8px | |
| Ticker kicker, feed title, timestamps | 9px | |
| `#designCount` | 9px | Cell count next to the price |
| Share card kicker and footnote | 9px | |

7px is not a readable label, and on a step indicator it is doing real work. 9–10px should be the
floor, and the eyebrow and step labels should come back up.

---

## 3. Panels that still scroll

| Surface | Overflow | Verdict |
|---|---|---|
| `#reviewStep` | **+21px** | Should be fixed. Review was never brought into the no-scroll work — only Shape and Design were. |
| `#shareCard` | **+20px** | The closing guidance line is clipped off the bottom on this viewport. |
| `#claimFeedItems` | +180px | Intended; it is a feed. |

Shape and Design measure **0px overflow with 1px dead space**, confirming the recent fix on a
real device.

---

## 4. Landscape is broken

At **868x327 CSS** the phone breakpoint does not match (`matchMedia('(max-width:700px)')` is
false), so the desktop side-panel layout runs in a 327px-tall viewport. The Image and Add image
controls overlap, and the step overflows by 31px.

None of the recent phone work applies at that width, so this is pre-existing. It needs a
short-viewport breakpoint rather than a width-only one — something closer to
`@media (max-height: 480px)`.

---

## 5. Smaller observations

- **The design surface can lose the selection.** After `+100` on Shape, the captured Design step
  showed only empty grid in the globe band: the selection was not in view and the camera did not
  re-frame to it. Worth reproducing deliberately; if it holds, Design needs to keep the thing
  being designed on screen.
- **"Delete cells" has no button affordance.** It reads as plain text beside the Fill icon, while
  every other tool in that row is a framed control.
- **First load took about 80 seconds** to interactive under software WebGL, and Chrome discarded
  and fully reloaded the tab after it was backgrounded on this 2GB device. Not real-device
  performance evidence, but the discard behaviour is worth understanding: a user switching apps
  mid-design may lose their place.
- **Chrome's own tooltips sat over the studio controls** in two captures. Not our bug, but it is
  a reminder that the top-right corner is contested on Android.

---

## 6. What is working

Verified on the device, not inferred:

- Browse composition holds: pitch sheet 131px (16%), bottom-anchored, no dead gap; Claim in the
  header; controls lower right; activity ticker correctly hidden until zoomed in and hidden again
  while the inspector is open.
- Studio panels are content-sized: Location 27%, Shape 50%, Design 51%, each with 0px scroll
  overflow and 1px dead space.
- **No overlapping controls anywhere in portrait**, and nothing overflows horizontally.
- **Keyboard behaviour is correct.** Focusing the display-name field shrinks the visual viewport
  from 812 to 748 and the checkout CTA stays visible.
- The dismissed toast no longer intercepts taps.
- Rotation to landscape and back recovers cleanly; Android Back steps Design → Shape.

---

## 7. Suggested order

1. **Touch targets**, starting with `#claimFeed summary` (12px), the two Design sliders (22px),
   and the controls the compaction shrank. Use the hit-area pattern already on the globe controls.
2. **Text floor of 9–10px**, starting with the 7px step labels and the 8px eyebrow.
3. **Review and share card overflow**, and extend the no-scroll guard in
   `mobile-composition-qa` to cover Review.
4. **Landscape breakpoint.**
5. Re-run this audit and compare.

Items 1–3 are largely a reversal of trade-offs made in the last few passes and should be cheap.
Item 4 is new work.

---

## Method note

The overlap detector reported the exit dialog overlapping the Review form beneath it. That is a
modal drawing over its page and not a defect; the detector has no concept of a modal layer. All
other overlap results in this audit were nil.
