# Million Hexagons

A performance-first prototype of a globe containing 999,988 hexagonal advertising cells and 12 pentagonal cells. Half the logical inventory is mock-sold. Visitors can explore campaigns and run a mock placement flow.

## Run

```bash
npm install
npm run dev
```

## Prototype architecture

The million cells are logical addresses, not one million DOM or Three.js objects. A single high-resolution campaign atlas and GPU-friendly globe surface provide the visual detail. Pointer coordinates map deterministically to cell IDs. Twelve pentagons are rendered at the vertices of an icosahedron.
