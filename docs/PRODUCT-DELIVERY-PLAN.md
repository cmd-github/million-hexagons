# Product and delivery contract

Status: current source of truth
Last updated: 7 September 2026

## Product

Million Hexagons is an advertising product presented as one shared 3D globe with exactly 1,000,000 claimable cells: 999,988 hexagons and 12 pentagons. Customers create artwork across connected cells, add an optional HTTP(S) destination, choose an available location, and eventually buy a lasting placement.

Standard prices are fixed by customer region: £1 per cell in the UK, €1 in the eurozone, and $2 in the USA. Premium-location, auction, and live-conversion pricing are deferred until evidence justifies them.

The current application is a non-payment, session-only prototype. Its immediate purpose is to prove that visitors understand the offer, enjoy exploring it, and can create a placement. See `ROADMAP.md` for the current phase and paid-launch gates.

## Experience contract

Preserve the staged Design -> Place -> Review journey.

### Design

- Start with three choices: Logo or image, Solid colour, and Paint hexagons. Prioritise Logo for business buyers.
- Use a face-on hex mosaic for editing. Keep price and cell count visible whenever either can change.
- Accept PNG, JPG, WebP, and SVG artwork up to 4 MB. Trim empty margins, preserve aspect ratio, and show the real cell-clipped result.
- Default logos to one spread image. Fit the image as large as possible without cropping by default. Expose zoom (50?400%) and drag/slider positioning with cropping at the cell boundary, separately from hexagon editing. Keep repeat-per-cell, quarter-turn rotation, reset, and Custom sizing secondary.
- Use Small, Medium, and Large presets based initially on 50, 150, and 400 cells. Presets are not readability guarantees.
- Paint supports colour changes, erase, clear, undo, and redo while retaining a connected footprint.

### Place

- While exploring, clicking an available cell offers a compact Claim this space action. Starting there opens Design first and retains that cell as the intended placement anchor.
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

Included now: globe exploration and search, sample campaigns, all three creation paths, exact availability/conflict states, responsive layouts, mock session publication, and destination reopening.

Not yet production-ready: durable drafts or ownership, accounts, authoritative inventory, reservations, checkout, tax/refunds, receipts, production artwork storage, moderation, recovery, support tooling, physical-device certification, or analytics. Do not represent the prototype as a paid or durable service.
