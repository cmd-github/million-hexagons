# Million Hexagons Product and Delivery Plan

Status: agreed direction  
Last updated: 5 September 2026

## Product thesis

Million Hexagons is an advertising product first and a 3D globe second. The globe contains exactly 1,000,000 individually addressable advertising hexagons sold at $1 each. A buyer can create a coloured placement or display artwork across a connected group, attach a destination URL, and buy the placement permanently.

The first objective is to prove that visitors understand the proposition, enjoy exploring the world, and are willing to create a placement. Account systems, real payments, auctions, campaign analytics, and enterprise sales tooling come only after that behaviour is validated.

## Agreed commercial release direction — 5 September 2026

The objective is a polished product that earns revenue by delivering a useful, trustworthy advertising placement with an exceptionally easy purchase journey. The [release audit](RELEASE-AUDIT-2026-09-05.md) records the starting evidence, implementation gaps, and detailed acceptance checks. Its recommendations below are now part of the agreed direction; the audit remains a dated assessment, not a claim that fixes have shipped.

- Preserve Design → Place → Review. The main business-buyer path is upload logo, choose a priced size, accept a suggested available location, review artwork and destination, pay, then receive a durable placement and management/share link. Retain Solid Colour, Paint, and manual location choice; make advanced artwork controls secondary.
- Keep the offer and one-time price visible on mobile. During Place, use a compact panel that leaves the globe accessible. Provide a suggested valid location and an easy way to find another without manual trial and error.
- Make one canonical footprint and artwork transform authoritative for the flat preview, globe preview, and committed placement. Requested, selected, reviewed, billed, and committed quantities must match; never silently trim a design at boundaries.
- Label sample brands and inventory clearly in the prototype. Production inventory and sales claims must come from real records. A paid placement must retain its artwork and working advertiser destination after reload.
- Add draft recovery, paint undo/redo, accessible navigation, clear conflict recovery, and a direct Edit design route from review. Avoid an unnecessary account-creation detour; choose a secure, low-friction ownership/recovery mechanism during transactional design.
- Include basic placement pages, globe-focus sharing links, visitor discovery, and destination-click measurement in the transactional MVP. Full campaign dashboards and richer social launch assets remain later work.
- After payment, provide a persistent confirmation, receipt, publication status, placement link, secure management access, and support route. Clearly distinguish payment received from published when moderation applies.
- Validate the offer with a focused buyer community, measured funnel events, and observed usability sessions before expanding the commercial scope. Keep the $1-per-cell validation price. Treat audience value and willingness to pay as hypotheses to prove, not consequences of attractive graphics.
- Treat the fixed inventory as a finite gross revenue opportunity with ongoing operating costs. Define the service commitment behind “permanent”, customer terms, and operating responsibilities before charging buyers; do not promise unmeasured traffic.
- Do not launch paid purchases until the audit's P0 blockers are resolved and transactional release gates pass: durable ownership, authoritative inventory, atomic reservations, idempotent payment fulfillment, safe destinations, moderation, receipts, and recoverable failure/refund handling.

Execution order: resolve rendering/count integrity, mobile placement, review state, and demo disclosure; complete artwork and accessibility QA with draft/undo recovery; instrument and validate demand; then implement and verify the transactional MVP. A passing build or smoke test alone does not establish release readiness.

## Governing experience principles

1. Design artwork on a flat hex canvas; use the globe to choose location.
2. Show only the controls required for the current decision.
3. Movement and placement must never share an ambiguous gesture.
4. The review must use the same renderer and geometry as the published result.
5. Advertiser artwork owns tile fill; the product communicates state through outlines and overlays.
6. Preserve logo aspect ratio and never silently distort uploaded artwork.
7. Keep price and hexagon count visible whenever the buyer can change either.
8. Prefer a small number of safe defaults over a collection of advanced tools.

## Agreed purchase flow

### 1. Choose what to create

Present three large choices and no editing controls:

- Logo or image: upload artwork and spread it across a compact area.
- Solid colour: create a connected block in one colour.
- Paint hexagons: create a multicolour design on a flat hex canvas.

### 2. Design the placement

All detailed editing happens in a face-on hex-mosaic preview.

Logo or image:

- Accept PNG, JPG, WebP, and SVG files up to 4 MB.
- Remove empty transparent or uniform-colour margins automatically.
- Detect the artwork aspect ratio and generate a compact matching area.
- Preserve aspect ratio at all times.
- Default to one logo spread across the area.
- Offer repeat-in-each-hex as the only alternative treatment.
- Expose only scale, quarter-turn rotation, and reset.
- Offer Small, Medium, Large, and Custom sizes with prices attached.
- Show the actual hex-clipped result, not a smooth source-image substitute.

Solid colour:

- Choose one colour.
- Offer Small, Medium, Large, and Custom compact areas.
- Show the exact connected hex shape and live price.

Paint hexagons:

- Use a flat editor with a visible active colour.
- Click or drag to paint.
- Allow colour changes without altering already-painted cells.
- Erase removes cells from the purchased shape.
- Clear removes the whole design after an explicit action.
- Add undo and redo after the core editor interaction is stable.

### 3. Choose the location

The finished placement becomes a preview that the buyer positions on the globe.

- Default mode is Move globe.
- In Move globe mode, drag rotates and wheel or pinch zooms.
- In Place design mode, click or tap positions the complete design and wheel or pinch still zooms.
- Use a prominent Move globe / Place design segmented control.
- On desktop, holding Space may temporarily activate Move globe as a power-user shortcut.
- Suggest a complete available footprint on entering Place. Keep Move globe as the default and offer Find another spot before requiring manual positioning.
- On mobile, reserve separate vertical regions for the globe and the placement/review sheet. Resize the camera and picking coordinates to the visible canvas; controls must not cover the central placement surface.
- Automatically keep uploaded artwork geographically upright; retain manual rotation controls in the design step.
- Reject locations that overlap purchased inventory and explain why.
- Show the full proposed footprint before review.

### 4. Review and buy

Review is read-only except for the destination URL.

- Show a flat hex preview and the live globe rendering.
- State: "This is exactly how your placement will appear on the globe."
- Show artwork type, hexagon count, and total price.
- Show advisory readability warnings without blocking purchase.
- Provide Edit design and Change location routes.
- Collect the optional destination URL.
- Use "Buy for $X" when payments are introduced; the prototype uses "Add this preview to the globe."

## Visual state system

Never use fill colour alone to communicate ownership or editing state.

| State | Treatment |
| --- | --- |
| Available | Subtle neutral/teal outline with restrained availability tint in placement mode |
| Hovered | Bright, high-contrast outline |
| Selected | Electric blue/purple outline and clear preview fill or artwork |
| Purchased | Full advertiser artwork with a subtle permanent seam/bevel |
| Invalid conflict | Red crosshatch or high-contrast red outline over the blocking cells |

Grid lines should be crisp but faint during exploration and deliberately clearer during placement. They must remain aligned with the rendered hexagons at every zoom level.

## Artwork quality rules

- Map editor cells and globe cells using one canonical cell address and geometry calculation.
- Clip artwork to the exact purchased cells.
- Preserve aspect ratio; do not stretch artwork to fill irregular selections.
- Fit artwork inside the useful bounds of its selected shape.
- Automatically trim unused source-image margins while retaining a small safety margin.
- Use a true rendered preview as the final authority.
- Base readability guidance on artwork complexity, selected geometry, and rendered size rather than a single hard minimum.
- Use 50, 150, and 400 hexagons as initial purchasing presets, not quality guarantees.

## MVP scope

Included:

- Million-cell logical addressing and high-resolution adaptive grid.
- Branded mock-populated world.
- Globe exploration with bounded zoom and centred orbit.
- Staged Logo, Solid Colour, and Paint creation paths.
- Flat hex-mosaic editor and live pricing.
- Exact availability, hover, selection, conflict, and purchased states.
- Logo upload, automatic margin trimming, scale, rotation, spread, and repeat.
- Mock placement and mock purchase persistence for the current session.
- Responsive desktop and mobile layouts.

Explicitly deferred:

- Accounts, authentication, and saved drafts.
- Real checkout, tax, refunds, and invoicing.
- Auctions or location-based variable pricing.
- Analytics dashboards and impression guarantees.
- Self-service campaign management after purchase.
- True logo-silhouette tracing.
- Rows, columns, arbitrary geometric generators, crop tools, perspective correction, and free artwork dragging.
- Enterprise reservation and approval workflows.

## Technical direction

### Rendering

- Keep the million cells as logical addresses rather than one million Three.js objects.
- Continue using GPU textures for occupancy, selected colours, and purchased colours.
- Use the same spherical cell-coordinate function for picking, preview, and final logo meshes.
- Suppress sub-pixel grid detail at globe scale to prevent shimmer.
- Merge each purchased territory into as few draw calls as practical.
- Keep uploaded textures bounded and dispose preview geometry and textures when leaving review.

### Application structure

The current prototype remains deliberately small, but further feature work should not continue accumulating in one large module. Before introducing checkout or persistence, split `src/main.js` into these responsibilities:

- `globe/renderer.js`: scene, lighting, camera, controls, and render loop.
- `globe/grid.js`: canonical cell addressing, picking, occupancy, and exact geometry.
- `placements/artwork.js`: upload analysis, crop bounds, textures, and logo fitting.
- `placements/editor.js`: flat editor state and canvas rendering.
- `purchase/flow.js`: staged workflow and validation.
- `state/store.js`: creation draft and session placements.

Do this as a behaviour-preserving refactor, not alongside a major feature.

### Future persistence model

A placement will eventually require:

- Stable placement ID and owner ID.
- Purchased cell IDs with a unique database constraint.
- Artwork source, processed rendition, treatment, scale, and rotation.
- Background and per-cell colours.
- Destination URL and moderation state.
- Price paid, currency, payment reference, and timestamps.
- A temporary cell reservation with a short expiry during checkout.

## Delivery roadmap

### Phase 0 — Prototype integrity

Goal: make the current concept trustworthy enough for hands-on evaluation.

- [x] Render one million addressable cells without one million objects.
- [x] Populate roughly half the globe with representative mock advertising.
- [x] Provide exact multi-cell logo geometry and per-cell colour data.
- [x] Introduce the staged Design → Place → Review flow.
- [x] Add the flat logo/colour/paint preview.
- [x] Separate Move globe and Place design modes.
- [ ] Complete human visual QA of every step at desktop and mobile sizes.
- [ ] Test the supplied Birdcage logo at 50, 150, and 400 hexagons.
- [ ] Fix any remaining discrepancy between flat preview, placement preview, and committed result.
- [x] Add lightweight undo/redo to the paint editor.

Exit criteria:

- A first-time tester can create and place each artwork type without instruction.
- The Birdcage logo is recognisable and correctly oriented at its recommended size.
- No visible logo fragmentation, grid offset, flicker, or accidental globe movement occurs.
- The test suite and production build pass.

### Phase 1 — Demand-validation prototype

Goal: learn whether people want to create and reserve placements.

- Add a short first-visit explainer and clearer value proposition.
- Add anonymous draft saving in local storage.
- Add event tracking for flow entry, upload, design completion, location attempts, review, and purchase intent.
- Add a non-payment reservation or waitlist action with email capture.
- Test price comprehension and the 50/150/400 presets.
- Run five observed usability sessions before expanding features.

Exit criteria:

- At least 80% of observed testers finish a placement without help.
- Funnel data identifies where visitors abandon the flow.
- Testers understand that price is one-time and per hexagon.
- There is credible purchase intent beyond novelty browsing.

### Phase 2 — Transactional MVP

Goal: safely sell real inventory.

- Add accounts and server-side placement drafts.
- Add authoritative cell inventory with atomic reservation and purchase operations.
- Hold selected cells for 5–10 minutes during checkout.
- Integrate payment, receipts, tax handling, and refund rules.
- Store original and processed artwork in managed object storage.
- Add URL validation, content moderation, abuse reporting, and takedown controls.
- Add an operations view for placements, payments, moderation, and inventory.
- Add durable placement pages, globe-focus sharing links, basic visitor discovery, and destination-click measurement.
- Provide persistent confirmation, publication status, receipts, secure owner access, destination correction, and support.

Exit criteria:

- Two buyers cannot purchase the same cell.
- A successful payment always creates exactly one placement.
- Failed or expired checkout reliably releases inventory.
- Moderators can prevent unsafe artwork or links from publishing.

### Phase 3 — Commercial product

Goal: make the world attractive to larger brands and repeat buyers.

- Introduce curated landmark zones and premium pricing only after demand data supports it.
- Add verified business profiles and campaign scheduling.
- Add impression/click analytics with transparent methodology.
- Extend basic placement sharing with richer social previews and campaign launch assets.
- Add managed-service creation for large buyers.
- Add brand-safety, legal, invoicing, and enterprise approval capabilities.

## Immediate execution order

1. Visually test the current staged implementation with the Birdcage logo.
2. Resolve preview-versus-globe rendering differences.
3. Polish responsive layout and placement gestures.
4. Add paint-editor undo/redo.
5. Run observed first-time-user tests.
6. Add instrumentation and a purchase-intent capture.
7. Decide whether evidence justifies the transactional MVP.

## Validation checklist

The studio redesign and its recorded browser checks are described in [PURCHASE-REDESIGN-QA.md](PURCHASE-REDESIGN-QA.md). These agent-driven checks do not replace observed first-time-user sessions or the outstanding Birdcage artwork review.

For every meaningful purchase-flow change:

- Run `npm run build`.
- Run the browser smoke journey in `scripts/smoke.mjs` against the active local server.
- Run `npm run test:geometry` for footprint changes and `npm run test:visual` for the desktop/mobile journey and screenshot matrix. Set `SMOKE_URL` to the active server URL.
- Check Logo, Solid Colour, and Paint paths separately.
- Check 50, 150, and 400-cell placements.
- Check an occupied-area conflict and a valid placement.
- Check upright, quarter-turn, and upside-down artwork.
- Check desktop and narrow/mobile viewport layouts.
- Compare the flat preview, globe preview, and committed placement visually.
- Confirm exploration mode remains performant and free of grid shimmer.

## Decision log

- Use one million logical mapped hexagons rather than a literal geodesic polyhedron with twelve pentagons.
- Treat the product as permanent advertising inventory, not a game or virtual-world building simulator.
- Use one globe rather than islands or multiple landmasses.
- Populate the prototype heavily enough to communicate marketplace potential.
- Use a flat editor before globe placement.
- Use an explicit Move globe / Place design toggle rather than a small movement joystick.
- Keep the initial artwork choices to Logo, Solid Colour, and Paint.
- Keep pricing at $1 per hexagon for the validation prototype.
- Defer premium-location pricing until buyer behaviour supplies evidence for it.
