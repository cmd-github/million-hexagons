# Placement studio redesign and verification

The original redesign observations below are historical. The 6 September geometry replacement supersedes the axial translation, UV grid and global-atlas descriptions: see [GEODESIC-MIGRATION-QA.md](GEODESIC-MIGRATION-QA.md) for the current topology, actual polygon previews and focused verification.

## Delivered behaviour

- Cleaner landing composition, visible mobile pricing, explicit sample/non-payment disclosure, and quieter exploration controls.
- The right-side globe toolbar now groups ambient play/pause, the guided demo (sparkle), search, zoom, and home. A close-range globe click pauses ambient rotation and the play control restarts it.
- Separate desktop studio and globe regions. Mobile exploration leaves the globe below the introduction; Place reserves a dedicated interactive globe region above a compact sheet. Review has a separate scrollable sheet and a visible total/action footer.
- Logo-first recommendation while retaining Logo, Solid Colour, and Paint. Custom sizes and fine adjustments use expandable controls. Live pricing, clear upload status, direct editing from review, paint undo/redo, and persistent dismissible session confirmation.
- Automatic valid location suggestion and Find another spot. Move remains the default. Manual placement validates the entire footprint and invalidates Review on overlap or a boundary conflict; it never trims purchased cells silently.
- Canonical compact footprints and axial translation maintain topology across odd/even rows. Artwork is clipped and fitted through a shared raster routine for flat and globe rendering. All three artwork types use an unlit, non-tone-mapped territory surface so lighting does not recolour the purchased artwork. Repeat rotates each logo within its own cell. Globe mapping reflects the editor's downward row direction into geographic north.
- Spread logos are fitted to the largest safe centred rectangle inside the selected hex mask rather than its outer rectangular texture bounds. The logo editor exposes the neighbouring perimeter directly: clicking adds a hexagon, while removable edge cells can be deleted without allowing the footprint to split into disconnected islands. Each edit updates the authoritative count and price.
- Place and Review retain one frozen artwork canvas for the draft, so the flat review and globe material cannot recompute different logo transforms. Exact corner-based camera framing keeps the complete globe footprint in view. Exploration now has a compact hex-number search (`#1` and plain numeric forms) which centres the addressed cell; it is hidden throughout the placement studio and can later expand to named discovery.
- Available inventory now has a unified near-black midnight surface with only extremely subtle deterministic macro-hex tonal variation. At perceptible cell sizes, stronger dark seams and a restrained face-centre lift give the underlying sellable hexagons a dimensional plated finish without returning to a patchwork pattern. The treatment fades at extreme distance to avoid shimmer. A restrained camera-fixed highlight, modest south-pole lift, and surface-attached Fresnel edge preserve the sphere treatment at every zoom. Available cells are restored after filtered artwork sampling, preventing campaign colours from bleeding into neighbouring inventory. Sample/purchased artwork, selection colours, topology and the continent-free product direction are otherwise unchanged.
- SVG rasterization before cropping fixes the fixture's missing text/mark. Uploads bound processed dimensions, reject oversized decoded images, release object URLs, and ignore superseded image loads. A failed new upload cannot leave the old logo purchasable.
- HTTP(S) destination validation, session placement-to-link lookup, and a deliberate website action from confirmation or a clicked session placement. No payments, cross-session placement persistence, or production ownership claims have been introduced.
- Keyboard focus on step headings, inert closed panel, Escape to close, status announcements, focus outlines, and a keyboard-operable suggested-location path. These changes are not a full accessibility conformance claim.

## Verification

The user authorised standalone Playwright because the built-in Browser is unavailable in their VS Code environment. Browser testing used installed Chrome in headless mode, screenshots, real Playwright pointer actions, and Chromium touch input emulation. No desktop-app browser connection is required for the checked-in test runner.

- Production build: passes; Vite still reports a JS chunk above 500 kB. Bundle size alone is not a mobile performance assessment.
- Existing smoke: SVG upload, 180-degree control, 150-cell review/commit and two-colour painting.
- Geometry tests: 1, 50, 150, 400 and 10,000 unique cells preserve offsets and counts across even/odd origins.
- `test:visual`: 18 completed journeys at 1440×1000 and 390×844. Logo covers 1, 50, 150, 400 and 500 cells, including an interactive add/remove footprint check; colour covers 50, 150 and 400 cells; Paint covers creation, Clear and Undo recovery. Checks include `#1` navigation, search visibility, suggested location, default Move mode, another location, review price, invalid URL rejection, valid URL confirmation, and exact committed inventory increment. It asserts that the mobile canvas ends before the panel begins and its central point is reachable.
- Screenshot matrix records design, placement, review and committed state. Inspected the landing compositions, upright and quarter-turn spread, upside-down repeat, colour and two-colour paint. Flat previews and globe previews/commits were inspected as rendered images, not inferred from the CSS rotation value alone.
- The refreshed desktop/mobile exploration and close placement screenshots were inspected for blue saturation, rim separation, artwork colour preservation, readable controls and retained hex-grid clarity.
- Additional interactive checks: mobile touch drag visibly changes the globe, tap places the design, and two-finger pinch changes zoom while in Place mode. Occupied-cell click after a valid location disables Review; another suggestion restores it. 320×568 and portrait-tablet 768×1024 viewports were visually inspected to check the compact sheet. Clicking a committed session placement reopened its correct website action.

Screenshots are generated under `artifacts/visual-qa/` and are intentionally excluded from Git. Run the documented commands to recreate them. The README records server and test setup.

## Remaining release work

- The supplied Birdcage logo is not in this checkout. Its named acceptance journey remains pending; the checked-in SVG fixture was used instead.
- No observed first-time-buyer study, physical iOS/Android device test, screen-reader audit, or sustained low-end-device performance measurement has been completed. Touch emulation is not physical-device certification.
- Superseded on 6 September: the mapped grid was replaced by an audited exact-count geodesic dual. It has measured area/edge tolerances rather than exact equal area. Physical-device and delivery-budget checks remain; see the geodesic audit.
- Session previews reset on refresh. Durable drafts, inventory reservations, payment/webhook reconciliation, production artwork storage, moderation and customer ownership remain transactional-MVP work in the delivery plan.
- Full silhouette tracing, commercial audience measurement and proven willingness to pay remain outside this redesign. The dated release audit continues to document the original findings; this document records the subsequent changes rather than rewriting that historical evidence.
