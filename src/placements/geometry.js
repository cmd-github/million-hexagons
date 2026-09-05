export const parity = (row) => ((row % 2) + 2) % 2;
export const centre = (cell) => ({ x: (cell.col + parity(cell.row) / 2) * Math.sqrt(3), y: cell.row * 1.5 });

export function compactFootprint(count, aspect = 1.25) {
  const ratio = Math.max(.25, Math.min(4, aspect));
  const reach = Math.ceil(Math.sqrt(count) * 2) + 2;
  const cells = [];
  for (let row = -reach; row <= reach; row++) {
    for (let col = -reach; col <= reach; col++) {
      const cell = { col, row };
      const p = centre(cell);
      cells.push({ ...cell, distance: Math.hypot(p.x / Math.sqrt(ratio), p.y * Math.sqrt(ratio)) });
    }
  }
  return cells.sort((a, b) => a.distance - b.distance || a.row - b.row || a.col - b.col).slice(0, count);
}

// Translate through axial coordinates so odd/even rows keep identical topology.
export function translateFootprint(cells, origin) {
  const originQ = origin.col - (origin.row - parity(origin.row)) / 2;
  return cells.map((cell) => {
    const row = origin.row + cell.row;
    const q = cell.col - (cell.row - parity(cell.row)) / 2 + originQ;
    const col = q + (row - parity(row)) / 2;
    return { ...cell, row, col, id: row * 1250 + col + 1 };
  });
}

export function footprintBounds(cells) {
  const points = cells.map(centre);
  const left = Math.min(...points.map((p) => p.x)) - Math.sqrt(3) / 2;
  const right = Math.max(...points.map((p) => p.x)) + Math.sqrt(3) / 2;
  const top = Math.min(...points.map((p) => p.y)) - 1;
  const bottom = Math.max(...points.map((p) => p.y)) + 1;
  return { left, top, width: right - left, height: bottom - top };
}
