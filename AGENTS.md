# Repository guidance

- Read `docs/PRODUCT-DELIVERY-PLAN.md` for product or purchase-flow changes, `docs/ARCHITECTURE.md` for rendering/data changes, `docs/VALIDATION.md` for relevant checks, and `brand_and_marketing.md` for public-facing copy. Do not load unrelated documents.
- Preserve Design -> Place -> Review, exact count/price/rendering parity, and separate Move globe / Place design controls.
- Prioritise commercial readiness, an effortless purchase journey, visual quality, and bounded performance. Do not introduce real payments until the release gates in `docs/ROADMAP.md` pass.
- For UI or globe changes, run the relevant browser journeys and inspect desktop/mobile screenshots and gestures; passing assertions alone is insufficient.
- Keep `README.md` accurate. Validate completed work, commit only task-related changes, and push the working branch without force-pushing. Report blockers explicitly.
- Read only relevant sections. Batch related changes and validate once after implementation. Broaden checks only for a concrete risk or failure. Keep progress updates concise. Do not append historical completion reports to active docs.
