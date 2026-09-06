# Repository guidance

- Read `brand_and_marketing.md` before writing or changing public-facing brand, positioning, campaign, or marketing copy.
- Read `docs/PRODUCT-DELIVERY-PLAN.md` before changing product behaviour, purchase flow, rendering, or roadmap scope.
- Keep `README.md` accurate for setup and current architecture.
- After completing work in this repository, run relevant validation, commit the task's changes, and push the working branch to its configured remote without asking for confirmation. Include associated documentation and audit updates. Do not include unrelated user changes or force-push; report any validation or push blocker explicitly. For read-only work with no changes, no empty commit is needed.
- Prioritise commercial readiness and an effortless customer purchase journey. Follow the agreed commercial release direction in `docs/PRODUCT-DELIVERY-PLAN.md` and use `docs/RELEASE-AUDIT-2026-09-05.md` for the initial findings and release checklist.
- Treat the flat preview, globe preview, and committed placement as one rendering contract.
- Run the validation commands and journeys listed in the delivery plan after relevant changes.
- Visual QA is required for UI/globe changes. The user explicitly authorised standalone Playwright in this VS Code workspace; use the installed browser and `scripts/visual-qa.mjs` when the desktop Browser connection is unavailable. Inspect screenshots and exercise globe gestures, not just DOM assertions. See `docs/PURCHASE-REDESIGN-QA.md`.
- Preserve the staged Design → Place → Review flow unless an agreed product decision updates the plan first.
