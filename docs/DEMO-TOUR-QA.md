# Demo tour

The persistent Play demo / Stop demo button controls an eight-stop loop. Actual sample polygon centres and boundary extents generate the compact route in `public/artwork/sample-hq/tour.json`; no random empty destinations or full-topology startup dependency are introduced.

Normal stops last 24 seconds. Every other stop, starting with Coca-Cola, adds a seven-second dive to altitude 0.24 and a six-second individual-hexagon view before pulling back. These detail stops last 36 seconds; exact topology preloads during their wide transition. The first individual-cell view arrives about 23 seconds after starting. Camera movement and globe rotation ease continuously; close framing accounts for viewport aspect ratio and placement extent. The demo is opt-in even with reduced-motion preferences. Hidden tabs pause progression; manual pointer/wheel/keyboard interaction and resizing stop the tour.

Focused verification uses the actual port-5173 page: start the tour, reach the Coca-Cola close-pass phase, inspect its screenshot, and stop via wheel input. Evidence is in `artifacts/demo-tour/close-pass.png`. Broader device and full-loop acceptance is left to user testing under the standing request to avoid excessive validation.

The focused run passed without page errors, and wheel input changed the tour's pressed state to false. A follow-up sizing check confirmed a compact 135-pixel desktop button; the mobile control screenshot is `artifacts/demo-tour/mobile-control.png`. Production build passed with the existing bundle-size advisory. No full purchase or geometry suite was repeated for this isolated exploration feature.
