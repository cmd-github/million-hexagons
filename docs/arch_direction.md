Million Hexagons is currently a Vite/Three.js app with a deliberately backend-light rendering model. The repo already uses a strong architecture for scale: a fixed 1,000,000-cell topology, lazy topology loading, a six-face/six-level cube artwork tile pyramid, viewport-driven tile streaming, bounded tile caches, and no “one image/object per advertiser” rendering model.

The main hosting recommendation is:

Keep the app architecture.
Use Cloudflare for the public/high-bandwidth path.
Keep Firebase initially for transactional/auth/backend data.
Do not rewrite everything at once.

Recommended production split:

millionhexagons.com
    |
    +-- Cloudflare Workers Static Assets
    |      - Vite/Three.js app
    |
    +-- Cloudflare R2
    |      - topology files
    |      - public placement artwork tiles
    |      - thumbnails
    |      - uploaded source artwork
    |      - immutable manifests / generated assets
    |
    +-- Firebase Auth
    |      - user authentication
    |
    +-- Firestore
    |      - users
    |      - placements
    |      - purchases
    |      - inventory/reservations
    |      - moderation/account state
    |
    +-- Firebase Functions / backend API
    |      - transactional purchase logic
    |      - ownership checks
    |      - Stripe integration
    |      - publication workflow
    |
    +-- Stripe
           - payments

The key principle is that normal public globe browsing should not require Firestore reads.

Public browsing should work from compact CDN/static data:

occupancy snapshot
+ placement metadata manifest
+ visible artwork tiles
+ topology when needed

Firestore should only be involved in things such as:

logged-in account operations
purchase/reservation
authoritative ownership checks
editing owned placements
moderation
customer dashboard data

This avoids the bad model of one Firestore document/read per hex or per visitor.

The current repo already supports this direction. Relevant existing architecture:

public/topology/geodesic-v1.packed.gz is around 17.2 MB and lazy-loaded when exact topology is needed.
The expanded canonical topology is around 92 MB.
Artwork uses a cube tile pyramid with 512px tiles.
The renderer requests only the tiles needed for the current visible surface/detail level.
Cache size is bounded by viewport demand rather than advertiser count.
Production plans already mention immutable manifests, CDN delivery, validated source storage and background tile generation.

One immediate deployment issue to account for:

The repo currently has large topology files in public/topology/, including roughly:

geodesic-v1.bin — 92 MB
geodesic-v1.bin.gz — 52.6 MB
geodesic-v1.packed.gz — 17.2 MB

Workers Static Assets has a per-file size limit, so large topology/runtime files should not simply be deployed as part of the static app bundle.

Recommended separation:

Workers Static Assets
    - HTML
    - JS
    - CSS
    - small app assets

R2
    - packed topology
    - other large immutable runtime files
    - artwork tiles
    - thumbnails
    - uploaded artwork

The large canonical 92 MB topology may not need to be deployed publicly at all if production only consumes the packed runtime format.

Why Cloudflare is attractive for this project:

Static asset delivery is very cheap.
R2 storage is cheap.
R2 does not charge normal internet egress bandwidth.
This project is likely to become bandwidth-heavy rather than database-heavy.
One million visitors repeatedly loading topology and artwork tiles could become expensive on Firebase Hosting because Firebase charges for data transfer.
The existing viewport-tile design maps extremely well to CDN/R2 delivery.

Artwork publication should roughly work like this:

1. Customer uploads image
2. Original stored in private/source R2 area
3. Payment and ownership transaction succeeds
4. Backend commits authoritative owned hex IDs
5. Background job generates/rebuilds only affected cube tiles
6. New immutable tile files written to R2
7. Placement/artwork manifest version changes
8. Browsers request the new tiles from Cloudflare

Do not serve every customer's original uploaded image directly during globe browsing. The globe should primarily render the generated tile pyramid.

Firebase should not necessarily be removed. Firestore can remain cheap if it is not used as the public rendering API. It is a good initial fit for the critical inventory transaction because Million Hexagons must guarantee that two buyers cannot successfully purchase overlapping cells.

Do not migrate transactional ownership to another database just to save small amounts of money before there is evidence Firestore is actually expensive.

Analytics also needs a different path from transactional data.

Do not implement:

placement becomes visible
→ Firestore write

for every impression/view.

High-volume analytics such as:

placement views
website visits
pass-bys
detail opens

should instead use a lightweight event ingestion path, likely:

browser
→ Cloudflare Worker endpoint
→ batching/aggregation
→ analytics store
→ periodic aggregate totals

Only aggregated advertiser-facing results need to reach the main app/backend.

Important architecture boundary to establish now:

PUBLIC / CDN DATA
- topology
- occupancy snapshot
- public placement metadata
- generated artwork tiles
- public thumbnail
- public aggregate stats

versus:

PRIVATE / TRANSACTIONAL DATA
- account details
- email
- Stripe IDs
- payment attempts
- reservations
- authoritative ownership
- source uploads
- moderation
- invoices
- detailed/private advertiser analytics

The target scaling property should be:

Hundreds of thousands or millions of anonymous globe visits should be able to happen without ordinary browsing generating Firestore traffic.

Suggested implementation order:

Keep the current Three.js/tile architecture.
Make the production Vite globe build the real deployable app.
Separate large runtime assets from the Vite static bundle.
Put large topology files and artwork tiles behind R2.
Serve the app through Cloudflare Workers Static Assets.
Introduce versioned public manifests/occupancy snapshots.
Keep Firebase Auth + Firestore + Functions for accounts and transactional ownership.
Add Stripe.
Build a background publication/tile-generation process.
Add event-based analytics separately rather than writing impressions directly into Firestore.
Reassess Firestore only after real traffic/cost data exists.

The existing Firebase coming-soon site does not urgently need migrating. It can stay where it is until the actual product globe becomes the production site.