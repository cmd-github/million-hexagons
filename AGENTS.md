# Repository guidance

- Read `docs/09-09-26-PRODUCT-DIRECTION.md` for product direction.
- Read `docs/STATUS.md` for current progress and next work.
- Read `docs/ARCHITECTURE.md` or `docs/VALIDATION.md` only when relevant.
- Use branding docs only for public-facing copy/design.
- Do not load unrelated planning docs.

## Priorities

- Preserve the exact 1,000,000-cell globe and Design -> Place -> Review flow unless explicitly changing them.
- Prioritise launch-critical work before later features.
- Avoid unrelated refactors or changes to working behaviour.
- Keep authoritative ownership/domain data separate from rendered R2 output.
- Use permanent `placementId` identity for purchased placements.

## Progress

- `docs/STATUS.md` is the operational source of truth.
- Normally keep one active task under `Now`.
- After meaningful work, update `STATUS.md` with Done / Now / Next / Blockers.
- Do not mark work done until reasonably verified.

## Validation

- For UI/globe changes, run relevant browser journeys and inspect desktop/mobile behaviour.
- For backend/data changes, run targeted tests and verify important failure/race cases.
- Report anything not verified.

## Hygiene

- Keep `README.md` accurate when setup or behaviour materially changes.
- Make only task-related changes.
- Do not follow older planning docs if they conflict with `09-09-26-PRODUCT-DIRECTION.md`.
- Report blockers explicitly.