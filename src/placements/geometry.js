// All 2D coordinates are placement-local projections of the real polygons.
export const centre = cell => ({ x: cell.x, y: cell.y });

export function footprintBounds(cells) {
  if (!cells.length) throw new Error('A footprint must contain at least one cell');
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const cell of cells) for (const p of cell.polygon) {
    left = Math.min(left, p.x); right = Math.max(right, p.x);
    top = Math.min(top, p.y); bottom = Math.max(bottom, p.y);
  }
  return { left, top, width: right - left, height: bottom - top };
}
