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
