# Menu and panel UI review — 3 October 2026

Review only: no code was changed for this. Every menu and panel state was captured at desktop (1440x900), phone (390x844) and small phone (320x568) against the current build with live staging placements, and measured for tap-target size, text size, clipping and overflow. Screenshots are in `artifacts/menu-review-2026-10-03/` (`<size>-<state>.png`) with the measurements in `audit.json` there. The share card and phone Review were not captured in this run; the share card was reviewed from `artifacts/public-placement/desktop.png` and phone Review from the 3 October emulator pass.

Priorities: **P1** broken or misleading, fix before user testing. **P2** inconsistent or hard to use. **P3** polish.

## Summary

The menus work and the overall look is coherent, but they have grown one fix at a time and no longer share a system. Three things stand out:

1. **Two genuine phone bugs**: the search panel's button and result render empty, and at 320px the Shape brush row pushes Move off the card.
2. **Too small to read or hit on phones**: 85 controls are under the 44px touch minimum and about 45 pieces of text are under 11px, down to 7px for the step labels. The worst are in the studio, which is where a buyer spends longest.
3. **Inconsistent controls**: the same idea is drawn differently from panel to panel (Move globe, Delete, primary buttons, section headings, toggles), so each step has to be learned afresh.

The single most useful change would be a small shared set of control styles (primary action, secondary action, icon button, tool toggle, section label, field) applied across every panel, with a 44px minimum and an 11-12px text floor on phones.

## Global: header, control rail, counter

- **P2 — Rail order and grouping.** Seven identical icon buttons in one column: rotate, tour, search, account key, zoom in, zoom out, home. The account key sits between search and zoom, so navigation is split by an unrelated item. Group them: *view* (zoom in, zoom out, home, rotate), *explore* (search, tour), then *you* (account) set apart at the end or in the header.
- **P2 — The rotate button is the only lime icon** while rotation runs, so it reads as "selected" or primary rather than as a state. Use the same treatment as the other buttons and show state by the icon alone (as the pause/play glyph already does).
- **P2 — Phone rail is heavy.** Seven 36px circles take most of the right edge and sit over the globe. Consider a collapsed rail on phones (zoom in/out and home visible, the rest behind one "more" button), and raise each to 44px.
- **P3 — Top counter** alternates between "39,556 / 1,000,000 claimed", "960,444 remaining" and visit totals. At 10px on phones it is easy to miss, and the alternation makes it read as decoration. Pick one message, or slow the rotation and give it a label.
- **P3 — Small-phone header**: at 320px "Claim Your Space" nearly touches the logo. Shorten to "Claim a space" below 360px, or drop the wordmark beside "MH".

## Search panel

- **P1 — Broken on phones** (`phone-03-search.png`): the submit button renders as an empty dark oval with no arrow, and the result row is an empty bordered box. The measurement shows the result text at 0px. Desktop renders both correctly, so a phone rule is overriding them.
- **P2 — Results are styled as headings** on desktop (large lime "Fable"). Make them a list of rows (name, small artwork, "go" arrow) like the Nearby list, so search and Nearby feel like the same thing.
- **P3 — No empty state**: a query with no match shows nothing. Say "No placements start with …" and suggest searching by hexagon number.

## Account panel

- **P2 — Heading hierarchy is inverted** (`*-04-account.png`): "LEGAL & PRIVACY" is in heavy mono capitals and reads louder than the panel's real title "Access your placements". Make it a quiet section label, or move Terms and Privacy to a single footer line.
- **P2 — Terms and Privacy are 10px links about 29x24px.** Too small to tap on a phone. Give them full-height rows or 44px pills.
- **P2 — "Email me a sign-in link" is 10px bold text** in a 22px-tall button on phones. It is the panel's main action and should look like the primary button used elsewhere.
- **P3 — Supporting copy at 10px** ("We'll email you a secure link…"). Raise to 12px.

## Activity feed

- **P2 — Never visible on the phone home screen** (`phone-06-activity.png`): it only appears once zoomed in, so phone visitors never learn there is live activity. Show a single collapsed line ("Latest: Mr Momo claimed 284 hexagons") above the hero, expandable.
- **P2 — Desktop summary row is 13px tall** and is the only way to collapse the feed. Make the whole header row the toggle at 44px.
- **P3 — The fourth item is cut off** at the panel edge with its timestamp hidden. Either fit three items or fade the bottom to show it scrolls.

## Placement details panel (HUD)

- **P2 — Unlabelled toggle** top right (`*-07-hud.png`). It keeps the panel open, but nothing says so, and it looks like a settings switch. Use a pin icon with a tooltip or a "Keep open" label, or drop it and keep the panel open until dismissed.
- **P2 — Empty row between the stats and the buttons** now that "New arrival" is shown only on recent placements. Collapse the gap when there is no label.
- **P2 — Nearby button doesn't match its neighbours**: different font weight from "Visit website", slightly different height on phones, and its label sits below the arrow's centre line. Use the secondary button style for all three actions.
- **P3 — Stat labels at 9-10px** ("Views", "Visits", "Hexagons"). 11px minimum.
- **P3 — No close button.** The panel closes by tapping elsewhere, which phone users do not discover. Add a close X matching the dialogs'.
- **P3 — Next hexagon** sits on the panel's top border on phones and the right border on desktop. It works, but it could be mistaken for decoration. Add a "Next" label or tooltip on first view.

## Nearby view

- **P3 — "Back" is 38px tall** and the "NEARBY PLACEMENTS" label is 10px mono capitals; fine on desktop, small on phones.
- **P3 — Rows use the artwork as a thumbnail**, so placements whose names were changed show mismatched pictures (Blue Hour Studio shows the green slug). A staging data issue, not a UI one; see STATUS.

## Report and legal dialogs

- **P3 — Duplicate title in the Terms overlay**: "Terms" in the header and "Terms and Conditions" as the first line. Drop one.
- **P3 — Report dialog has both Cancel and the corner X.** That is fine; but the select text is 11px against 16px field labels on desktop. Match the field text size.
- Both dialogs otherwise read well on all three sizes.

## Purchase studio (Location → Shape → Design → Review)

### Shared

- **P1 — Step labels are 7px on phones** (`phone-11-location.png`): "Location / Shape / Design / Review" and the step numbers are unreadable, and the step buttons are 27px tall. Either make the progress bar a single readable line ("Step 2 of 4 · Shape") on phones or raise it to 11px with 44px targets.
- **P2 — Three different footer layouts.** Shape: full-width "Design this space" with price above. Design: price left, compact "Claim this space" right. Review: full-width "Continue to secure checkout". Use one footer everywhere: count and price on the left, primary action on the right, the same height.
- **P2 — "Move globe" lives in a different place in each step**: in Shape it is a tool in the brush row; in Design it is the first button in the globe rail; Location has neither and relies on dragging. Put it in the same place in every step. The globe rail is the natural home.
- **P2 — Large empty areas on desktop.** Location uses about 15% of a full-height panel and Shape about 60%, leaving a large void above the footer. Let the panel size to its content on desktop as it already does on phones, or use the space for a short "what happens next" line and the price.

### Location

- **P2 — The proposed hexagon is barely visible** (`desktop-12-location-proposed.png`) while the popup is prominent. Give the chosen cell a strong lime fill and outline so the eye goes to the cell, not the popup.
- **P3 — "Start here" is 10px text in a 32px button.** It is the step's only action.

### Shape

- **P1 — Brush row overflows at 320px** (`small-13-shape.png`): Move is cut off at the right edge of the card. Wrap the two mode buttons onto a second line, or drop the "Selection brush" label on narrow screens.
- **P2 — The colour key looks like checkboxes** ("Available / Purchased / Your Selection" use small square outlines), so people will try to tap them. Use filled hexagon swatches with no border.
- **P2 — +10 / +25 / +100 are 32px tall** on phones and the brush buttons 34px.
- **P3 — Brush size letters S/M/L at 9px.** Use the hexagon size itself to show the size (they already differ) and raise the letters to 11px, or drop them.

### Design

- **P2 — The Colour tools row mixes three styles** (`*-16-design-colour.png`): "Custom" is a bordered chip with a label, Fill is an icon-only bordered button, Delete is an unbordered icon above a label. Use one tool-button style with an icon and a short label for all three ("Custom", "Fill all", "Erase").
- **P2 — A stray "1" after the XL brush** is the brush hexagon count with no label. Either label it ("1 hexagon") or remove it.
- **P2 — Image tab shows zoom, rotate and Reset before any image is added.** Hide them until there is an image (already noted in STATUS).
- **P2 — The "Across area / Repeat per hexagon" radios** put the dot at the far left and centre the label, so the dot and label look unrelated. Left-align both, or make them a two-option segmented control without dots.
- **P3 — Undo/redo are very faint when disabled** and 32px wide; label them on hover and raise to 44px.
- **P3 — Delete in Design vs the eraser icon in Shape** do the same thing under different names and icons. Pick one ("Erase" with the eraser icon).

### Review

- **P2 — Field text sizes differ on phones**: name, description and website at 10px, email at 16px. 16px everywhere avoids iOS zoom on focus; check the 320px fit when changing it (STATUS).
- **P3 — The agreement line is 10px.** It is a legal acceptance and should be at least 11-12px.
- Desktop Review now reads well: the fields are the clearest elements, as requested.

## Exit dialog

- Reads well on all sizes. **P3**: "Discard & quit" uses a red outline while every other secondary action is grey; that is the right signal, keep it.

## Measured totals

| | Desktop | Phone (390) | Small (320) |
|---|---|---|---|
| Controls under 44px (all states) | 82 | 85 | about 90 |
| Text under 11px | 51 | 45 | similar |
| Horizontal overflow | none | none | Shape brush row clipped |

The desktop small-target count is mostly the 43px rail buttons and small text links, which matter less with a mouse; on phones they are the main usability gap.

## Suggested order

1. P1s: phone search panel, 320px Shape brush row, phone step labels.
2. One shared set of control styles (primary, secondary, icon, tool toggle, section label, field) with a 44px minimum and an 11-12px text floor on phones, then apply it panel by panel, starting with the studio.
3. One studio footer and one place for Move globe.
4. The phone activity line, HUD close button and labelled keep-open toggle.
5. The remaining P3 polish.
