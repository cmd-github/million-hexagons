# Compact studio validation - 8 September 2026

The Design pane opens directly, fits without scrolling, and shares the same right-hand desktop panel as Place and Review, with the globe on the left. Image upload is a single Add image action. Image, Paint, Cells and Pan expose contextual controls; image zoom and canvas zoom are independent.

## Verification

- 18 desktop/mobile journeys passed: image sizes 1/50/150/400/500, colour-only and mixed designs, drag/touch framing, paint/clear/restore, undo/redo, shape editing, repeated Place/Review -> Edit pixel equality, URL validation and exact publication counts/prices.
- No pane scrolling at 320x568, 390x844, 1024x768 and 1440x900.
- Geometry checks passed, including 50,000/100,000 connected cells and early conflict rejection.
- Smoke and desktop/mobile globe gestures passed, including occupied-location rejection.
- Ten equator/pole/pentagon/near-pentagon placement and publication journeys passed with no browser errors; screenshots were inspected.
- Large-design tests use an empty occupancy fixture; sample artwork tiles remain illustrative. This verifies capacity, not real inventory availability.

## Local large-design timings

| Device emulation | Cells | Generate | Image zoom input | Paint input | Find and change location |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 50,000 | 460 ms | 18 ms | 37 ms | 2,544 ms |
| Desktop | 100,000 | 688 ms | 20 ms | 34 ms | 4,213 ms |
| Mobile | 50,000 | 271 ms | 8 ms | 37 ms | 1,625 ms |
| Mobile | 100,000 | 487 ms | 6 ms | 47 ms | 3,837 ms |

The 100,000-cell publication completed with exact count parity in 133 seconds. Publication remains a comparatively expensive local operation. These measurements are local Chrome/emulated results, not physical-device certification. Canvas artwork uses a bounded raster, so extreme close-up can reveal image-resolution limits.

Screenshots and machine-readable timings are under ignored `artifacts/visual-qa/`, `artifacts/geodesic-qa/` and `artifacts/studio-scale/`.
