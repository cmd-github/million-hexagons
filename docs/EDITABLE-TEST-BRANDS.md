# Editable staging brands

Prepared locally on 11 September 2026; **not deployed or seeded yet**. Awaiting Craig's verified My Globe email.

The default runtime now has an empty artwork base and no baked sample occupancy, catalogue entries or shipped sample logos. Frozen topology and existing durable purchases are unchanged. Historical sample-generation assets remain in the repository for offline fixtures, but are excluded from the staging release.

`scripts/seed-editable-brands.mjs` prepares 12 fictional wordmarks on connected rectangles, strips, diamonds and asymmetric patches, dispersed around the globe. Sizes range from 48 to 12,000 cells, totalling 33,094 cells. It reads live public inventory and avoids existing holdings. These are staging fixtures, not paid orders.

The administrator-only `create-fixture` action resolves an existing verified, enabled Firebase account by email. It creates the normal placement, ownership grant, inventory claim, private artwork/design source and queued immutable version. Publication, public restoration, My Globe and owner updates use the same existing paths as purchases. No authentication emails are sent by the seeder.

## Apply after account identification

1. Deploy the updated `stagingPlacements` function after backend tests.
2. Set `MH_FIXTURE_OWNER_EMAIL` locally to Craig's verified account email. Existing staging QA credentials stay in ignored `.env.staging.local`.
3. Run `node scripts/seed-editable-brands.mjs` to inspect the dry-run report and `artifacts/editable-brands/footprints.png` (each preview is fitted to a common box; sizes are in the report).
4. Run `node scripts/seed-editable-brands.mjs --apply`. Stable fixture IDs prevent duplicates and preserve owner edits on reruns. A deleted/revoked ID is deliberately not resurrected; prepare a new fixture batch explicitly if replacing it.
5. Wait for all 12 public versions, verify My Globe ownership/source recovery, then build/upload/deploy staging normally. Update `deploy/staging-monitor.json` to the new runtime release and set `artworkBase` to `artwork/empty`. Keep the prior immutable release for rollback.
6. Verify cold/repeat desktop/mobile browsing, search, footprint selection, edit/save/reload, and artwork timings across the dispersed set. Record evidence in STATUS.md.

Use My Globe to replace artwork, change colours, move/scale/rotate the image and edit metadata. Purchased footprints stay fixed. Founder moderation can suspend or revoke a test placement using its permanent ID from the report.

## Performance boundary

These brands deliberately use today's durable live-placement renderer. They expose real startup/image/geometry work instead of the old privileged baked logos. They do **not** implement the planned immutable snapshot-plus-delta compiler, nor prove full-globe scale. Measure that separately before claiming launch-scale readiness.

Local verification: 36 backend tests, 9 deployment tests, desktop/mobile owner-editing journeys, desktop/mobile/reduced-motion persistent-checkout journeys, staging build, exact connected non-overlapping fixture dry run, and inspected footprint/editor screenshots passed. The prepared staging runtime contains 1,549 objects (21.3 MB). Live fixture creation, real account editing and performance measurements remain pending.
