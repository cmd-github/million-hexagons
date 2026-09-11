import {cubePoint, cubeProject, CUBE_FACES} from './cube.js';

export const REGION_SIZE = 16;
export const REGION_COUNT = 6 * REGION_SIZE ** 2;
export function regionForPoint(point) {
  let face = 0, best = -Infinity;
  for (let i = 0; i < 6; i++) {
    const score = CUBE_FACES[i].n.reduce((sum, v, k) => sum + v * point[k], 0);
    if (score > best) { best = score; face = i; }
  }
  const {x, y} = cubeProject(face, point);
  const cell = v => Math.max(0, Math.min(REGION_SIZE - 1, Math.floor((v + 1) * REGION_SIZE / 2)));
  return face * REGION_SIZE ** 2 + cell(y) * REGION_SIZE + cell(x);
}
export function regionBounds(index) {
  const face = Math.floor(index / REGION_SIZE ** 2), x = index % REGION_SIZE, y = Math.floor(index / REGION_SIZE) % REGION_SIZE;
  const direction = cubePoint(face, (x + .5) * 2 / REGION_SIZE - 1, (y + .5) * 2 / REGION_SIZE - 1);
  // Bound the whole spherical cube quadrilateral, including face seams/poles.
  const angle = Math.max(...[0, 1].flatMap(dx => [0, 1].map(dy => {
    const p = cubePoint(face, (x + dx) * 2 / REGION_SIZE - 1, (y + dy) * 2 / REGION_SIZE - 1);
    return Math.acos(Math.min(1, p.reduce((sum, v, k) => sum + v * direction[k], 0)));
  })));
  return {direction, angle};
}
export function regionLayout(cells, vertices) {
  let offset = 32;
  const sections = {};
  for (const [key, length, type] of [
    ['ids', cells, 'Uint32Array'], ['centres', cells * 3, 'Float32Array'],
    ['vertices', vertices * 3, 'Float32Array'], ['vertexIds', vertices, 'Uint32Array'],
    ['rings', cells * 6, 'Uint32Array'], ['neighbours', cells * 6, 'Uint32Array'],
    ['degrees', cells, 'Uint32Array'], ['areas', cells, 'Float32Array'],
  ]) { sections[key] = {offset, length, type}; offset += length * 4; }
  return {sections, bytes: offset};
}
export function regionArrays(buffer, layout) {
  return Object.fromEntries(Object.entries(layout.sections).map(([key, s]) => [key, new ({Uint32Array, Float32Array}[s.type])(buffer, s.offset, s.length)]));
}
