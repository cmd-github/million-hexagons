# Million Hexagons

A performance-first prototype of a globe containing exactly 1,000,000 logical hexagonal advertising cells. Half the inventory is mock-sold. Visitors can explore campaigns and run a mock placement flow.

## Run

```bash
npm install
npm run dev
```

## Prototype architecture

The million cells are logical addresses, not one million DOM or Three.js objects. A campaign atlas supplies the advertising artwork while a procedural GPU shader draws resolution-independent hexagon edges. Pointer coordinates map deterministically to cell IDs. Because this is a mapped interactive surface rather than a literal geodesic polyhedron, no visible pentagonal correction faces are needed.

The renderer uses distance-based detail: the micro-grid is suppressed when its cells would be smaller than a screen pixel, eliminating full-globe shimmer, then fades into a connected HD honeycomb while zooming. Individual occupied cells resolve to consistent campaign marks, while purchased territories can carry one logo continuously across many cells.

The seeded marketplace preview uses recognisable brand marks from Simple Icons alongside repeated placements and deterministic connected clusters of 20–50 cells. These brands are visual examples only and do not imply participation or endorsement.

Logo placement accepts PNG, JPG, WebP and SVG files up to 4 MB. Small campaigns use high-resolution hex-clipped meshes rather than the coarse world atlas, allowing a logo to fit inside one cell without texture bloom. Buyers can create compact clusters, horizontal rows, vertical columns or click-built custom patterns, then span one logo across the territory or repeat it in every cell.

Uploaded artwork defaults to filling the complete purchased territory. Buyers can switch to a contain mode to preserve the entire logo, or use the logo-proportioned selection mode to generate a connected territory matching the artwork's aspect ratio. Purchased territories are merged into one draw call so even hundreds of image-mapped cells remain efficient.
