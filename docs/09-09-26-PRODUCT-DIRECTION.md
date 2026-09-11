# Million Hexagons — Product & Implementation Direction

## Purpose of this document

Use this as the ongoing product and architectural guide for Million Hexagons.

Do not treat every item below as something that must be implemented immediately.

The priorities are:

1. Get a genuinely usable product live.
2. Allow people to safely purchase permanent space.
3. Make purchasing simple and satisfying.
4. Give every buyer a reason to share their purchase.
5. Make browsing the globe interesting even for people who never buy.
6. Build foundations that allow the product to scale without prematurely building enterprise-level systems.
7. Avoid implementing speculative features before they are justified.

When working on the codebase, preserve existing working globe/rendering behaviour unless a change is explicitly required.

---

# 1. Product concept

Million Hexagons is one shared 3D globe containing exactly:

**1,000,000 finite claimable spaces.**

The current frozen topology is:

- 999,988 hexagons
- 12 pentagons
- canonical cell IDs 1–1,000,000
- topology namespace/version: `geodesic-v1`

People and businesses can permanently claim connected areas of the globe and use those areas for:

- logos
- artwork
- advertising
- messages
- links
- creative internet culture

The product is partly:

- scarce internet space
- advertising inventory
- creative expression
- an internet experiment
- a shared visual object that becomes more interesting as it fills

It should not feel like a conventional banner-ad marketplace.

---

# 2. Core product promise

A useful internal shorthand is:

> A million scarce spaces on one permanent shared digital canvas.

The most important concepts to communicate are:

1. There are only 1,000,000 spaces.
2. Anyone can claim some of them.
3. Purchased cells remain claimed permanently, subject to product terms and moderation.
4. The content displayed on owned cells can evolve.
5. The globe becomes more interesting as more people participate.

---

# 3. Fundamental ownership rule

This is the core architectural contract.

## Permanent:

A buyer permanently owns the right to use their purchased cells.

Ownership is defined by:

- `placementId`
- `ownerId`
- topology version
- exact cell membership

For example:

`geodesic-v1 + cells 10234–10298`

Ownership does not depend on:

- artwork tiles
- URL
- company name
- email address
- current logo
- public slug

## Editable:

The owner may update the content displayed on the cells they own.

Examples:

- logo
- artwork
- destination URL
- title
- description
- campaign metadata

Edits create new content versions.

Therefore:

> Ownership is permanent. Content is editable. Location is fixed.

Deleting or changing content does not release cells.

Account suspension or moderation does not automatically release cells.

## Initial publication and takedown rule

At launch, new placements and owner edits should publish immediately rather than waiting for pre-publication moderation. Manual review is initially reactive and can become more automated or approval-based if scale and abuse justify it.

An artwork or destination takedown must not delete the placement, release its cells, erase its ownership grant or automatically reverse its payment. Operations must be able to disable the destination only, hide the artwork only, suspend all public content, restore the last acceptable version and reinstate corrected content. Hidden artwork should be replaced by a neutral product-owned placeholder. Every intervention must record the reason, time and acting administrator.

Ownership, public content state and payment state are separate concerns. Refunds and ownership cancellation require their own explicit policy and workflow.

Transfers, resale, subdivision and ownership trading are NOT launch requirements.

---

# 4. Permanent domain identity

Every purchased placement receives an opaque permanent:

`placementId`

This becomes the primary identity used throughout the product.

Future systems should reference `placementId` for:

- analytics
- sharing
- owner dashboards
- editing
- moderation
- achievements
- public placement pages
- social preview assets
- search
- clicks
- publication
- reporting

Do not use destination URL as placement identity.

Do not use tile coordinates as placement identity.

Do not make ownership dependent on rendered output.

---

# 5. Domain model direction

Use the previously proposed model as the architectural target.

Important concepts include:

- User
- Owner
- Owner membership
- Advertiser / brand
- Placement
- Placement version
- Immutable cell set
- Ownership grant
- Draft
- Order
- Reservation
- Payment attempt
- Publication job
- Release
- Moderation
- Domain event / outbox

Important relationship:

User → Owner → Advertiser → Placement

This separation allows scenarios such as:

- one individual owning one placement
- one company owning multiple placements
- one owner operating multiple brands
- agencies eventually managing multiple advertisers

Do not unnecessarily implement all of these systems before launch, but do not design features in ways that contradict this model.

---

# 6. Rendering architecture principle

The globe renderer is NOT the authoritative business database.

Use this principle:

> Authoritative product data lives separately from rendered globe data.

Broad responsibility:

## Firebase / authoritative backend

Expected to handle:

- authentication
- users
- owners
- placements
- ownership
- orders
- reservations
- editable placement data
- moderation state
- authoritative business events

## Cloudflare

Expected to handle:

- public app delivery
- CDN
- cheap/high-volume public requests
- future analytics ingestion
- edge validation where useful

## R2

Expected to contain:

- frozen topology assets
- generated artwork tiles
- generated public metadata
- thumbnails/share assets
- release artifacts

R2 content is derived output.

It must be possible to regenerate it from authoritative source data.

## Background publication system

Responsible for compiling approved placement content into:

- artwork tiles
- metadata
- search/index files
- thumbnails
- public release artifacts

---

# 7. Product flywheel

Product decisions should support this loop:

DISCOVER
↓
EXPLORE
↓
CLAIM SPACE
↓
CREATE SOMETHING
↓
PURCHASE
↓
RECEIVE SOMETHING WORTH SHARING
↓
SHARE IT
↓
NEW PEOPLE VISIT
↓
THEY EXPLORE / BUY
↓
THE GLOBE FILLS
↓
SCARCITY + SOCIAL PROOF INCREASE
↓
MORE PEOPLE TALK ABOUT IT

This flywheel is more important than simply adding features.

Whenever considering a feature, ask:

**Does this improve discovery, purchase conversion, sharing, browsing or retention?**

If not, it may not be important yet.

---

# 8. Launch strategy

The product should be globally accessible from launch.

Do not artificially restrict purchasing to the UK unless legal/payment/tax requirements force it.

Initial marketing can concentrate on areas where the founder already has distribution, particularly:

- UK
- US
- English-speaking internet audiences

The product itself should feel global.

Possible global signals include:

- countries represented
- latest country to join
- number of countries with owners
- first owner from a country
- country-based milestones

These can later become automatically generated marketing moments.

---

# 9. Language

Do not build a large localisation system for V1.

Initial approach:

- clear English
- simple language
- semantic HTML
- avoid text embedded unnecessarily inside graphics
- allow browser translation to work well

Proper localisation can be added when real traffic indicates which languages justify it.

Do not build IP → translated UI logic prematurely.

---

# 10. Pricing

Pricing is not yet final.

The central product story must remain extremely simple.

Avoid making regional pricing so complicated that users cannot understand the basic proposition.

Potential models include:

### Model A

One canonical price per hex and currency converted at checkout.

### Model B

Simple local psychological price points.

Examples being considered:

- £1
- €1
- $1 or potentially $2
- equivalent simple amounts in other currencies

### Model C

Credits.

Example:

1 hex = 1 credit

Users purchase credits in their local currency.

Do not hard-code a final pricing model until commercial terms are agreed.

Architecture should support:

- currency
- amount in minor units
- pricing snapshot
- server-generated quote

---

# 11. PURCHASE EXPERIENCE — LAUNCH CRITICAL

A first-time visitor should understand how to create and buy a placement in under approximately two minutes.

The current design flow is:

Design → Place → Review

Existing creative capabilities include:

- individual selection
- painting
- connected editing
- image upload
- image positioning
- rotation
- transparency
- undo
- selection groups
- globe navigation

Preserve the usability of this experience.

The buying flow should avoid unnecessary account friction.

Target flow:

1. User explores globe.
2. User selects available cells.
3. User creates artwork.
4. User reviews placement.
5. Server validates availability.
6. Cells are temporarily reserved.
7. User enters email/payment details.
8. Payment succeeds.
9. Permanent ownership is created.
10. Placement enters publication workflow.
11. User receives confirmation and management access.
12. User receives something worth sharing.

---

# 12. Authentication — LAUNCH CRITICAL

Avoid requiring users to create and remember passwords before purchase.

Preferred initial direction:

**Passwordless email authentication.**

Potential flow:

- purchase with email
- verified email ownership
- magic link / email link
- secure owner dashboard

Repeat purchases associated with the same verified identity should appear together.

Ownership must attach to a stable user/owner identity, NOT directly to an unverified email string.

Social login such as Google/Microsoft may be added later but is not required for launch.

---

# 13. Owner dashboard — EARLY PRODUCT

The owner area should feel like an ownership dashboard, not an admin account page.

Possible working concept:

## My Globe

Show:

- highlighted locations the owner controls
- placement cards
- placement artwork
- number of cells owned
- acquisition date
- current published version
- status
- destination URL
- last updated date

Actions:

- view on globe
- edit artwork
- edit destination URL
- edit description
- update logo
- manage placement
- create share asset
- copy share link
- buy additional available cells nearby

Later:

- views
- clicks
- CTR
- visitor countries
- placement health
- achievements
- milestones
- link health warnings

Do not implement all analytics before the foundational purchase flow exists.

---

# 14. Editable placements — IMPORTANT EARLY FEATURE

Unlike the original Million Dollar Homepage, purchased content should be updateable.

Companies change:

- logos
- websites
- branding
- campaigns

Requiring purchased areas to remain visually frozen forever would reduce their long-term value.

Therefore owners should eventually be able to change:

- artwork
- logo
- URL
- title
- description

Cell ownership does not change.

Each published edit creates a new immutable `PlacementVersion`.

Moderation should apply to the new version.

The previous approved content may remain visible until replacement content is approved and published.

## Owner editing interaction

Owner updates should reuse the same visual Design workspace used to create the original placement, including the globe editing surface, image movement, zoom, rotation, background colour and per-cell artwork/colour treatment. During an update, the purchased cell footprint and location are locked: owners cannot add, remove or relocate cells, and the final action publishes a new immutable content version instead of entering reservation or checkout.

Do not maintain a separate reduced crop editor in My Globe when the primary Design workspace can express the update more clearly and consistently.

## Later: connected purchase expansion

An owner who buys additional available cells directly connected to an existing holding should eventually be able to combine those holdings into one editable visual canvas so artwork can span the complete connected area.

This is not merely a rendering operation. Define explicit domain rules before implementation for placement identity, ownership grants, version history, analytics, public URLs, moderation, rollback and whether the source purchases remain independently identifiable. Never merge purchases solely because they share an email address; require verified common ownership and an explicit owner action.

---

# 15. Sharing — HIGH PRIORITY GROWTH FEATURE

A successful purchase should create an emotional/shareable moment.

Do not make the post-purchase experience simply:

"Purchase successful."

Automatically create something that makes the buyer want to tell people.

Potential assets include:

## Placement card

Contains:

- artwork
- brand/name
- number of hexagons owned
- location
- Million Hexagons branding
- share URL

## Zoom animation

Short animation:

space → globe → region → owned placement

Potentially ideal for:

- LinkedIn
- X
- Instagram
- TikTok

## Ownership certificate

Not a legal/financial certificate.

A fun visual object containing:

- placement
- acquisition date
- number of hexagons
- placement number
- country
- early supporter status if applicable

## One-click sharing

Support:

- LinkedIn
- X
- Facebook
- WhatsApp
- copy link

The core goal is:

> Every purchase should create another potential source of visitors.

---

# 16. Achievements and social status — POST-LAUNCH / ITERATIVE

Achievements could increase sharing and owner engagement.

Potential achievements:

- first 100 owners
- first 1,000 owners
- first owner from a country
- first business from a country
- first placement in a region
- 100 hex owner
- 1,000 hex owner
- 10,000 hex owner
- early adopter
- founding advertiser
- largest placement today
- most viewed placement
- trending placement

Do not build a complicated achievement engine before purchases exist.

Initially achievements can simply be derived server-side from trustworthy ownership/events.

Avoid achievements that accidentally encourage manipulation or bots.

---

# 17. Country representation

This is both a browsing feature and a marketing opportunity.

Potential public statistics:

- countries represented
- owners by country
- latest country to join
- percentage of world represented
- first owner from country X

Important distinction:

Do NOT conflate:

1. advertiser's declared country
2. visitor's approximate country
3. physical position of the placement on the virtual globe

These are different concepts.

Cloudflare may provide coarse IP-derived country information for visitor analytics.

Avoid storing raw IP addresses unless genuinely required.

---

# 18. Analytics architecture

Do not bolt analytics directly into random components.

Create a shared tracking abstraction.

Conceptually:

`trackEvent(type, payload)`

Eventually:

client
→ Cloudflare Worker
→ queue/batch
→ analytics storage
→ aggregate metrics

Stable identifiers should include where relevant:

- event ID
- placementId
- advertiserId
- ownerId where appropriate
- session ID
- event type
- timestamp
- coarse country
- referrer/source
- device class
- globe context

Potential events:

- globe_viewed
- globe_searched
- placement_viewed
- placement_clicked
- outbound_link_clicked
- cells_selected
- design_started
- design_completed
- checkout_started
- purchase_completed
- placement_shared
- placement_edited

Server-side authoritative events such as purchases must not rely solely on browser analytics.

Financial/business audit events should remain separate from behavioural analytics.

Do NOT:

- write every analytics event directly to Firestore
- globally increment one Firestore document
- count artwork tile requests as placement impressions
- identify placements by destination URL

---

# 19. Advertiser analytics

Long-term advertiser value can extend beyond simply owning visual space.

Potential useful metrics:

- placement views
- outbound clicks
- CTR
- unique visitors
- countries
- referring sources
- shares
- time-based trends

Be conservative about what constitutes a "view".

A tile being downloaded does NOT mean an advertiser was actually viewed.

Metrics should eventually have clearly defined measurement rules.

---

# 20. Public web pages / SEO / AI discovery

The globe should remain the core experience, but it cannot be the entire indexable website.

Useful principle:

> The globe is the app. The website explains and indexes the product.

The current Vite globe is client-rendered and lacks public page routing.

Eventually introduce indexable routes.

Possible core routes:

- `/`
- `/explore`
- `/how-it-works`
- `/pricing`
- `/faq`
- `/about`

Required commercial/legal pages may include:

- terms
- privacy
- cookies if required
- content policy
- contact
- refund/purchase terms

Keep these concise rather than creating dozens of generic SEO pages.

---

# 21. Placement public pages

This could become one of the strongest SEO/growth mechanisms.

Every public placement may eventually have a stable canonical page.

Conceptual examples:

`/p/<placement-slug>`

or

`/brand/<brand>/<placement>`

The URL strategy is not yet decided.

Potential content:

- artwork
- advertiser name
- description
- destination link
- number of hexagons
- acquisition date
- placement location
- globe preview
- related placements
- country
- share controls

Important:

The canonical identity remains `placementId`.

Public slug changes must NOT change domain identity.

Pages should support:

- normal HTML
- canonical metadata
- Open Graph metadata
- structured data where appropriate
- sitemap inclusion
- indexability
- AI/search-engine comprehension

Do not generate low-quality thin SEO spam pages.

Pages should exist because they are genuinely useful to visitors and advertisers.

---

# 22. Exploration experience

The globe must be interesting even for somebody who never buys.

Possible exploration features over time:

- search
- recently claimed
- largest placements
- newest placements
- popular placements
- random placement
- countries represented
- trending placements
- featured artwork
- globe completion percentage
- total cells claimed
- cells remaining
- owners/businesses represented

These should encourage curiosity and movement around the globe.

The product should increasingly feel alive as purchases occur.

---

# 23. Available cell interaction

When hovering/clicking available space, the UI should encourage exploration/purchase without overwhelming the user.

Potential information:

- cell number
- availability
- price
- surrounding availability
- quick-select options
- "claim this area"

Cell ID may be useful as secondary metadata but should not dominate the experience.

The human-facing product is the placement/location, not hexadecimal/geometric identifiers.

---

# 24. Claimed placement interaction

Clicking claimed cells should NOT immediately redirect to the advertiser's website.

That would interrupt exploration.

Preferred model:

show placement information first.

Potential panel:

- artwork/logo
- advertiser
- title
- description
- number of cells
- acquisition date
- country
- visit website
- share
- related placement statistics

The outbound link should be intentional.

This improves:

- exploration
- user trust
- analytics quality
- advertiser storytelling
- product retention

---

# 25. Scarcity indicators

Scarcity is an important product mechanic but should not become fake urgency.

Possible metrics:

- cells claimed
- cells remaining
- percentage claimed
- placements created
- countries represented

Potential milestone messaging:

- 1% claimed
- 10,000 sold
- 100 countries represented
- etc.

Never manufacture scarcity beyond the actual fixed inventory.

---

# 26. Coming-soon / pre-launch

The current main domain can continue serving the Firebase coming-soon experience until the production purchase product is ready.

Useful pre-launch actions:

- capture emails
- build social audience
- explain concept
- tease development
- show globe screenshots/video
- communicate finite 1,000,000-space concept

Avoid spending heavily on paid advertising before proving which messaging generates organic interest.

---

# 27. Marketing direction

The founder currently has:

- Million Hexagons website
- X account
- LinkedIn company page
- significant personal LinkedIn reach

Initial marketing should favour organic distribution and building in public.

Content opportunities include:

- development milestones
- globe filling progress
- unusual placements
- first country milestones
- largest placement
- founder journey
- technical challenges
- customer stories

Paid advertising can be tested later once messaging/conversion is understood.

Do not assume LinkedIn advertising is desirable simply because LinkedIn organic reach exists.

Physical merchandise such as URL T-shirts is currently low priority.

---

# 28. Launch-critical scope

The following should dominate engineering attention.

## Must work before real launch

### Infrastructure

- stable production deployment
- SSL/custom domain
- CDN caching
- monitoring
- rollback capability
- physical-device verification

### Domain

- stable `placementId`
- topology version
- immutable cell set
- permanent ownership grant
- placement version/source model

### Inventory

- authoritative availability
- temporary reservation
- expiry/reconciliation
- atomic purchase
- concurrency testing
- large-area purchase testing

### Customer identity

- verified email
- passwordless account recovery/access
- owner identity

### Purchase

- authoritative server pricing
- Stripe
- payment success/failure
- receipts
- tax handling
- reconciliation
- refunds policy/process

### Artwork

- durable private source storage
- publishing pipeline
- replacement artwork correctness
- retries
- moderation
- release consistency

### Customer recovery

A buyer must be able to:

- return later
- authenticate
- see what they own

### Basic legal/commercial

- terms
- privacy
- content/moderation rules
- permanent ownership wording
- refund rules
- pricing

---

# 29. High-priority shortly after / around launch

These can materially improve growth but must not block safe purchasing.

- owner dashboard
- placement-specific share URLs
- share preview images
- public placement details
- basic click tracking
- basic view tracking with sensible definitions
- claimed/remaining metrics
- countries represented
- latest placements
- edit URL
- edit placement metadata
- edit artwork
- initial placement public pages
- sitemap / metadata / Open Graph

Some of these may be worth including at launch if cheap to implement.

---

# 30. Later enhancements

Add only when usage justifies them.

- sophisticated advertiser analytics
- advanced achievement system
- automated zoom videos
- localisation
- country leaderboards
- trending algorithms
- rich public advertiser profiles
- placement history
- social login
- agency/team management
- link health monitoring
- recommendation/discovery algorithms
- mobile-native enhancements
- campaign tools
- APIs

---

# 31. Explicit non-goals for V1

Do not spend launch effort on:

- resale marketplace
- ownership transfer
- blockchain/NFT mechanisms
- cell speculation features
- complex auctions
- complex loyalty systems
- elaborate achievements engine
- advanced advertiser BI
- dozens of SEO landing pages
- full localisation
- complex team permissions
- mobile apps
- enterprise account management

They can be considered later.

---

# 32. Technical pragmatism

The proposed long-term architecture includes sophisticated mechanisms such as:

- inventory bitmaps
- transactional shards
- publication releases
- outbox events
- versioning
- fencing
- reconciliation
- moderation cases

These concepts are valuable.

However:

**Do not build complexity simply because the final architecture could contain it.**

Implement the smallest robust version that satisfies the current requirement while preserving the ability to evolve toward the target architecture.

This product still needs demand validation.

Avoid turning the first sellable version into a six-month infrastructure project.

---

# 33. Architecture decision gate

The proposed Firestore inventory strategy using fixed bitmap shards must be benchmarked rather than assumed safe.

Test:

- small purchases
- large purchases up to 100,000 cells
- overlapping purchases
- simultaneous purchases
- reservation expiry
- payment completion races
- full/near-full inventory

If Firestore cannot safely support required transaction patterns at acceptable performance, consider moving only the authoritative inventory transaction layer to SQL.

Do not redesign the rest of the domain purely because of this possibility.

---

# 34. Product decision framework

When suggesting or implementing something new, classify it as one of:

### A — Launch critical

Without this, buyers cannot safely discover, purchase, own or recover their placement.

### B — Growth critical

Strongly improves conversion, sharing or organic discovery.

### C — Valuable enhancement

Improves engagement/value but does not materially affect initial viability.

### D — Later/speculative

Interesting but unsupported by current demand.

Always favour A before B, B before C, and C before D unless there is a compelling technical dependency.

---

# 35. Instructions when working from this document

Before beginning a substantial feature:

1. Identify which section of this product plan it serves.
2. Classify it A/B/C/D.
3. Explain whether any prerequisite is missing.
4. Check the existing code before assuming architecture.
5. Avoid refactoring unrelated working functionality.
6. Preserve the current renderer unless the feature requires changes.
7. Prefer incremental implementation and verification.
8. Do not silently introduce major architectural choices.
9. Surface decisions that materially affect ownership, payments, scalability or product behaviour.
10. When uncertain about product behaviour, ask rather than choosing a permanent business rule.

---

# 36. Immediate development priorities

Unless current repository state indicates a prerequisite that changes this order, the broad sequence should be:

### Phase 1 — Production foundation

- resolve staging/SSL/browser issues
- production deployment confidence
- monitoring
- physical performance checks

### Phase 2 — Durable domain foundation

- placement IDs
- ownership model
- placement versions
- retained design source
- owner/user identity
- durable drafts

### Phase 3 — Inventory + checkout

- authoritative availability
- reservation system
- concurrency testing
- server quotes
- Stripe
- purchase fulfillment
- reconciliation

### Phase 4 — Publication

- durable source assets
- moderation
- background compilation
- safe replacement
- R2 release publication

### Phase 5 — Ownership experience

- passwordless access
- My Globe / dashboard
- view purchased placements
- basic editing

### Phase 6 — Growth loop

- stable public placement links
- share cards
- Open Graph previews
- basic placement pages
- sharing
- public globe statistics
- country representation

### Phase 7 — Measurement

- central event abstraction
- Worker analytics ingestion
- placement views
- outbound clicks
- core conversion funnel
- advertiser-facing basic metrics

### Phase 8 — Iterate based on real behaviour

Use actual data to decide whether to prioritise:

- achievements
- better discovery
- advanced analytics
- localisation
- richer profiles
- paid marketing support
- additional sharing mechanics

---

# Final product principle

Do not optimise Million Hexagons merely for the moment someone purchases a hexagon.

Optimise for:

**Someone discovering a strange, finite shared internet object, becoming curious, exploring it, deciding to own a piece of it, creating something they care about, proudly sharing that ownership, and causing the next person to discover it.**

The globe is the visual product.

Permanent ownership gives it meaning.

Sharing gives it distribution.

Scarcity gives it urgency.

The growing community gives it value.
