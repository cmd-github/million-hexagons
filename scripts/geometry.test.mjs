import test from 'node:test';
import assert from 'node:assert/strict';
import { compactFootprint, translateFootprint, centre } from '../src/placements/geometry.js';

for (const count of [1,50,150,400,10000]) {
  test(`preserves ${count} unique cells through odd/even translation`, () => {
    const cells=compactFootprint(count,2.7);
    assert.equal(cells.length,count);
    for(const row of [200,201]) {
      const placed=translateFootprint(cells,{col:600,row});
      assert.equal(new Set(placed.map(c=>c.id)).size,count);
      const offsetX=centre(placed[0]).x-centre(cells[0]).x;
      const offsetY=centre(placed[0]).y-centre(cells[0]).y;
      placed.forEach((cell,i)=>{
        assert.ok(Math.abs(centre(cell).x-centre(cells[i]).x-offsetX)<1e-8);
        assert.ok(Math.abs(centre(cell).y-centre(cells[i]).y-offsetY)<1e-8);
      });
    }
  });
}
