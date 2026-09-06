import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import crypto from 'node:crypto';
import { SphericalTopology } from '../src/globe/topology.js';
const bytes = fs.readFileSync('public/topology/geodesic-v1.bin');
const manifest = JSON.parse(fs.readFileSync('public/topology/geodesic-v1.json'));
const grid = new SphericalTopology(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), manifest);
test('exact inventory, closed oriented shared polygons, reciprocal edges and sphere coverage', () => {
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
  assert.equal(grid.count, 1000000);
  let pentagons = 0, edges = 0, area = 0;
  for (let id = 1; id <= grid.count; id++) {
    const degree = grid.degrees[id - 1];
    assert.ok(degree === 5 || degree === 6);
    pentagons += degree === 5 ? 1 : 0;
    const neighbours = grid.neighboursOf(id);
    assert.equal(new Set(neighbours).size, degree);
    const polygon = grid.polygon(id);
    assert.equal(polygon.length, degree);
    assert.ok(grid.contains(id, grid.centre(id)), `centre outside ${id}`);
    assert.ok(grid.areas[id - 1] > 0);
    area += grid.areas[id - 1];
    for (let k = 0; k < degree; k++) {
      const other = neighbours[k];
      assert.ok(other >= 1 && other <= grid.count && other !== id);
      const reciprocal = grid.neighboursOf(other).indexOf(id);
      assert.ok(reciprocal >= 0);
      // Opposite cells use the identical shared endpoints in reverse order.
      const ringA = grid.rings.subarray((id - 1) * 6, (id - 1) * 6 + degree);
      const ringB = grid.rings.subarray((other - 1) * 6, (other - 1) * 6 + grid.degrees[other - 1]);
      assert.equal(ringA[k], ringB[(reciprocal + 1) % ringB.length]);
      assert.equal(ringA[(k + 1) % degree], ringB[reciprocal]);
      if(other > id) edges++;
    }
  }
  assert.equal(pentagons, 12); assert.equal(edges, 2999994);
  assert.ok(Math.abs(area - 4 * Math.PI) < 1e-6);
  assert.ok(manifest.cellArea.coefficientOfVariation < .05);
  assert.ok(manifest.cellArea.maxMinRatio < 1.65);
  assert.ok(manifest.edgeLength.coefficientOfVariation < .085);
  assert.ok(manifest.edgeLength.maxMinRatio < 1.7);
});
test('picking uses actual polygons at poles, pentagons and deterministic samples', () => {
  for(const p of [[0,1,0],[0,-1,0],[0,0,1],[1,0,0]]) assert.ok(grid.contains(grid.pick(p),p));
  for(let i=0;i<4000;i++) {
    const id=i<12?manifest.pentagons[i]:1+(i*104729)%grid.count;
    assert.equal(grid.pick(grid.centre(id)),id);
    const polygon=grid.polygon(id),c=grid.centre(id);
    for(const corner of polygon) {
      const p=Array.from(c,(v,k)=>v*.1+corner[k]*.9);
      assert.equal(grid.pick(p),id);
    }
  }
});
test('connected footprints preserve exact counts across all special locations', () => {
  for(const anchor of [grid.pick([0,1,0]),grid.pick([0,-1,0]),grid.pick([0,0,1]),...manifest.pentagons]) {
    for(const count of [1,50,150,400,10000]) {
      const cells=grid.connected(anchor,count,2);
      assert.equal(cells.length,count); assert.equal(new Set(cells.map(c=>c.id)).size,count);
      assert.ok(grid.isConnected(cells));
      assert.ok(cells.every(c=>c.polygon.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))));
    }
  }
});
