# Million Hexagons

A performance-first prototype of a globe containing exactly 1,000,000 logical hexagonal advertising cells. Half the inventory is mock-sold. Visitors can explore campaigns and run a mock placement flow.

The agreed product direction, staged purchase experience, technical rules, roadmap, and acceptance criteria live in [docs/PRODUCT-DELIVERY-PLAN.md](docs/PRODUCT-DELIVERY-PLAN.md). Treat that document as the source of truth for subsequent product work.

## Run

```bash
npm install
npm run dev
```

## Prototype architecture

The million cells are logical addresses, not one million DOM or Three.js objects. A campaign atlas supplies the advertising artwork while a procedural GPU shader draws resolution-independent hexagon edges. Pointer coordinates map deterministically to cell IDs. Because this is a mapped interactive surface rather than a literal geodesic polyhedron, no visible pentagonal correction faces are needed.

The renderer uses distance-based detail: the micro-grid is suppressed when its cells would be smaller than a screen pixel, eliminating full-globe shimmer, then fades into a connected HD honeycomb while zooming. Individual occupied cells resolve to consistent campaign marks, while purchased territories can carry one logo continuously across many cells.

The seeded marketplace preview uses recognisable brand marks from Simple Icons alongside repeated placements and deterministic connected clusters of 20–50 cells. These brands are visual examples only and do not imply participation or endorsement.

Logo placement accepts PNG, JPG, WebP and SVG files up to 4 MB. Small campaigns use high-resolution hex-clipped meshes rather than the coarse world atlas. Buyers choose Logo, Solid Colour, or Paint; create the artwork in a flat hex-mosaic editor; position the completed design on the globe; and review the exact result before adding it.

Uploaded artwork has unused outer margins trimmed automatically, retains its aspect ratio, and defaults to one logo spread across a compact territory proportioned to the artwork. Buyers can instead repeat the logo inside every hexagon. Purchased territories are merged into one draw call so even hundreds of image-mapped cells remain efficient.

Buying mode moves into a close selection distance and uses an adaptive light/dark high-contrast grid over every campaign colour. Uploaded artwork is aligned to geographic north so its default orientation stays upright around the globe, with manual quarter-turn and upside-down controls when needed.

The purchase flow separates design from location. Detailed editing happens in a flat hex canvas. During placement, Move globe enables rotation and Place design turns the globe surface into an unambiguous location target; wheel or pinch continues to zoom in both modes. A one-million-cell GPU occupancy mask gives available, purchased and selected tiles distinct states regardless of advertiser colour, and pointer selection uses the same nearest-hex calculation as the rendered grid. Selection colours are written directly into exact cell-addressed shader data, eliminating alignment drift.
