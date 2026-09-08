# Product and delivery contract

Status: current source of truth
Last updated: 8 September 2026

## Product

Million Hexagons is an advertising product presented as one shared 3D globe with exactly 1,000,000 claimable cells: 999,988 hexagons and 12 pentagons. Customers create artwork across connected cells, add an optional HTTP(S) destination, choose an available location, and eventually buy a lasting placement.

Standard prices are fixed by customer region: £1 per cell in the UK, €1 in the eurozone, and $2 in the USA. Premium-location, auction, and live-conversion pricing are deferred until evidence justifies them.

The current application is a non-payment, session-only prototype. Its immediate purpose is to prove that visitors understand the offer, enjoy exploring it, and can create a placement. See `ROADMAP.md` for the current phase and paid-launch gates.

## Experience contract

Preserve the staged Design -> Place -> Review journey.

### Design

- Open one editor directly, with optional image upload, background colour, per-cell paint and transparency. No artwork-type selection screen.
- Use the globe as the only design surface. Starting at an available cell creates a one-cell anchored footprint; Separate Add and Remove tools edit connected neighbours with an adjustable 1-2,791-cell brush. Paint, clear, restore and image framing work in place. Design in this space adopts the selected location explicitly; ordinary navigation never replaces the original image. Keeping this space preserves the exact cell IDs through Place and Review.
- Use a globe-first editor that fits without pane scrolling. Use the same right-hand studio shell and progress navigation across Design, Place and Review. Keep Add image, exact cell count, background and price visible; expose advanced controls contextually.
- Support 1-100,000 cells with globe zoom and Pan for navigation. Image zoom changes the crop; globe zoom changes only the view.
- Accept PNG, JPG, WebP, and SVG artwork up to 4 MB. Trim empty margins, preserve aspect ratio, and show the real cell-clipped result.
- Default logos to one spread image. Fit the image as large as possible without cropping by default. Expose zoom (50-400%) and drag positioning with cropping at the cell boundary, separately from hexagon editing. Expose continuous rotation (-180 to 180 degrees) alongside image zoom. At 100% with no offset, fit the entire rotated image; deliberate zoom and offset still allow cropping. Warn for raster uploads below 512px on their longest edge, without blocking publication or claiming that larger images guarantee readability. Invalid uploads preserve existing artwork. Keep repeat-per-cell and reset secondary.
- Use a direct count input without a preset dropdown. A fresh placement resets artwork, transforms, tools and history. Editing an existing draft preserves them.
- Paint overrides individual cells above the image. Transparent clears a cell without removing it from the count or price. Restore artwork removes that override. Support paint all, reset cell edits, undo and redo. Add/remove cells is a separate tool and retains a connected footprint.

### Place

- While exploring, clicking an available cell offers a compact Claim this space action. Starting there opens Design first and retains that cell as the intended placement anchor and preserves the current zoom/orientation. Only expose Claim when individual cells are visible.
- Suggest a complete available location automatically and provide Find another spot.
- Keep Move globe as the default. Movement and placement must never share an ambiguous gesture.
- Move globe drag rotates; Place design click or tap positions the complete design. Wheel or pinch zooms in either mode.
- Reject the whole footprint on conflicts or invalid boundaries; never trim cells silently.
- Keep artwork geographically upright and frame the complete footprint.
- On mobile, keep the interactive globe above a compact, scrollable sheet with unobstructed controls.

### Review

- Show the flat preview and live globe result from the same frozen artwork, polygon IDs, and transform used for publication.
- Requested, selected, reviewed, priced, and committed counts must be identical.
- Show artwork type, cell count, regional currency, total, location, and optional destination.
- Provide direct Edit design and Change location routes.
- In the prototype use “Add this preview to the globe”; introduce “Buy for [price]” only with real checkout.

## Visual and performance rules

- Advertiser artwork owns cell fill; outlines and overlays communicate available, hovered, selected, purchased, and conflicting states. Never rely on colour alone.
- Keep exploration grid lines crisp, restrained, aligned, and free of shimmer. Preserve readable dark-side illumination without recolouring artwork.
- Treat flat design, globe preview, review, and committed placement as one rendering contract.
- Preserve artwork aspect ratio and fit it inside the useful bounds of the exact polygon union, including around pentagons.
- Prefer adaptive detail, progressive loading, bounded memory, and safe defaults over feature breadth.
- Preserve the opt-in inventory-driven Tour. It must stop on manual interaction or creation entry and must target occupied placement focus cells rather than scanning all inventory.

## Current scope boundaries

Included now: globe exploration and search, sample campaigns, the unified image and colour editor, exact availability/conflict states, responsive layouts, mock session publication, and destination reopening.

Not yet production-ready: durable drafts or ownership, accounts, authoritative inventory, reservations, checkout, tax/refunds, receipts, production artwork storage, moderation, recovery, support tooling, physical-device certification, or analytics. Do not represent the prototype as a paid or durable service.


## Interaction review (8 September 2026)

The LLM proposal in public/interactions.md describes area selection but did not specify direct globe editing. The implemented path above closes that gap.

Implemented: close-range stationary hover with company, website and stable hex ID; company/hex search; click/tap inspection; separate outbound Visit; green exact hexagon counts; optional company name (60 characters) and description (160 characters) entered at Review; session preview dates and browser-persistent running outbound-link totals (localStorage, not shared analytics). Sample branding remains explicitly labelled and uses explicitly labelled illustrative claim dates. The logo-led HUD uses small inline counts and an accessible icon pin switch. Same-owner clicks preserve the HUD without showing a clicked hex number. The HUD can be pinned, otherwise outside clicks dismiss it; Escape dismisses it even when pinned. Search also closes on outside clicks. Tour arrival shows the targeted placement HUD after framing the complete advert above the mobile card. Home eases to the overview and resumes rotation; reduced motion uses immediate navigation and keeps rotation paused. Random discovery and View placement buttons were removed. The latest activity feed shows up to five actual session previews plus four explicitly labelled illustrative examples, expanded on desktop and collapsed on mobile. Shared #cell= links animate to their destination; session artwork is not durable or shared.

Future premium reference (TODO 16): optional social-profile links alongside the website. Define supported networks, validation, moderation, editing and pricing before enabling the feature.

Outbound links (TODO 17): retain standard secure new-tab links. Browser preferences control focus; a website cannot reliably force a background tab/pop-under. Native modifier-click, middle-click and browser context menus remain available without instructional HUD text.

Deferred until durable inventory and consent-aware event storage exist: purchase dates, permanent placement URLs/artwork, ownership certificates, advertiser dashboards, geographic analytics, popular/newest rankings and historical snapshots. Never substitute fake statistics or ownership claims. A history scrubber is not a launch requirement. A generated social share image remains follow-up; current sharing copies an exact globe location.

Visual simplification: search has one visible prompt and deduplicated company results; icon tools keep accessible names, hover titles and active-mode feedback. Empty-cell claiming is available up to altitude 1.0 (one 1.25x zoom-out step above the previous 0.8 cutoff). Validation/error messages and the Move globe / Place design distinction remain explicit.

## Activity and measurement presentation

The activity feed and rotating global metrics use explicitly labelled illustrative claims, trends and milestones. Sample HUD metrics demonstrate views, visits and visit rate; they are not measured advertiser traffic. Session placements retain browser-local visit counters and creation dates. Descriptions precede grouped metrics and actions; the HUD omits clicked hex IDs. One contextual badge shows exact placement count as a percentage of the globe.

Future production placement views must require at least 50% of the placement visible, a minimum rendered size, and one continuous second of visibility; exclude hidden tabs and UI-occluded areas. Define repeat-view deduplication, bot filtering, time windows and server aggregation before exposing live rankings or rates. No globe-load impression counting is implemented.

Home and the brand link restore initial orientation over 2.2 seconds; left/pause/right controls choose rotation direction. Manual rotation scales down with altitude. The hard atmosphere ring and passive gesture icons are removed. Tile loading prioritises sharp visible requests within unchanged cache/concurrency limits; cold-network fallback blur remains possible.
