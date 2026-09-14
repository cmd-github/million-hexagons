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

## Product alignment

- When Craig introduces, explores or materially reshapes a product idea, do not jump straight to implementation.
- First reflect back the intended outcome and ask concise clarifying questions about ambiguous behaviour, scope, presentation and important tradeoffs.
- Establish agreed acceptance criteria before editing code when multiple reasonable interpretations could produce materially different results.
- Treat shorthand such as “one more thing”, “capture this” or a list of ideas as direction to discuss or document unless implementation is explicitly requested.
- Do not delay straightforward fixes or already-defined work with unnecessary questions; clarify only what could materially change the result.

## Progress

- `docs/STATUS.md` is the operational source of truth.
- Normally keep one active task under `Now`.
- After meaningful work, update `STATUS.md` with Done / Now / Next / Blockers.
- Do not mark work done until reasonably verified.

## Validation

- For UI/globe changes, run relevant browser journeys and inspect desktop/mobile behaviour.
- The Codex in-app Browser connection and this repository's Playwright browser QA are separate. An in-app message such as `No browser is available` does not mean Playwright or a local browser is missing.
- Before reporting browser QA as unavailable, check `npm.cmd exec -- playwright --version` and the expected Chrome/Edge executable, then use the repository-owned journeys documented in `docs/VALIDATION.md` when the active tool policy permits command-line browser automation.
- If an active tool policy requires the in-app Browser and prohibits command-line Playwright, report that exact constraint. Do not say that Playwright or the required browser is uninstalled.
- For backend/data changes, run targeted tests and verify important failure/race cases.
- Report anything not verified.

## Hygiene

- Keep `README.md` accurate when setup or behaviour materially changes.
- Make only task-related changes.
- Do not follow older planning docs if they conflict with `09-09-26-PRODUCT-DIRECTION.md`.
- Report blockers explicitly.
