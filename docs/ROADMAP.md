# Delivery roadmap

## Current position

The visual prototype supports one million exact geodesic cells, sample campaigns, Design -> Place -> Review, logo/colour/paint creation, mobile placement controls, search, an inventory-driven tour, and session-only publication. Automated desktop/mobile journeys and exact geometry tests exist, but user acceptance, physical-device testing, and commercial infrastructure remain incomplete.

## Next: validate demand

- Test the supplied Birdcage logo at 50, 150, and 400 cells when the asset is available.
- Complete observed first-time-user sessions on desktop and mobile; target at least 80% completing without help.
- Confirm that testers understand the one-time regional price and expected placement value.
- Add anonymous draft recovery, funnel instrumentation, and a clearly non-payment purchase-intent or waitlist action.
- Obtain physical iOS/Android and sustained low-end-device evidence.

Proceed to transactional development only if behaviour and purchase intent justify it.

## Transactional MVP

- Durable drafts, owner access, and original/processed artwork storage.
- Authoritative cell inventory with atomic, expiring checkout reservations.
- Idempotent payment fulfillment, tax, receipts, refunds, and reconciliation.
- Destination safety, content moderation, abuse reporting, and takedown controls.
- Persistent confirmation, publication status, support, and recovery.
- Placement pages, globe-focus sharing, basic discovery, and destination-click measurement.
- Operations tooling for inventory, payments, moderation, and failures.

Paid launch is blocked until two buyers cannot acquire the same cell; successful payment creates exactly one durable placement; failed, expired, duplicate, and late payment outcomes reconcile safely; purchased artwork and destinations survive reload; moderation/refund routes work; and customers can recover their receipt and placement without assistance.

## Later

Only after demand evidence: premium zones, verified business profiles, campaign scheduling, transparent analytics, richer sharing, managed creation, and enterprise workflows. Auctions, impression guarantees, and speculative virtual-world/game features remain out of scope.
