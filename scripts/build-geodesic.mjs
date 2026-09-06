import fs from 'node:fs';
import crypto from 'node:crypto';

// A frequency-f subdivision preserves old vertex degrees and gives every new
// vertex degree six. With 64 seed vertices, f=127 gives exactly 1,000,000.
const seed = JSON.parse(fs.readFileSync('scripts/data/geodesic-seed-64.json', 'utf8'));
const f = Number(process.env.GEODESIC_FREQUENCY || 127);
const n = 62 * f * f + 2, faceCount = 124 * f * f;
const centres = new Float32Array(n * 3);
const triangles = new Uint32Array(faceCount * 3);
let next = 0, face = 0;
const normal = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const add = (p) => { const id = next++; centres.set(normal(...p), id * 3); return id; };
seed.centres.forEach(add);
const shared = new Map();
for (const [a, b, c] of seed.triangles) {
  const rows = [];
  for (let i = 0; i <= f; i++) {
    rows[i] = [];
    for (let j = 0; j <= f - i; j++) {
      const weights = [f - i - j, i, j], ids = [a, b, c];
      const active = ids.map((id, k) => [id, weights[k]]).filter(([, w]) => w).sort((u, v) => u[0] - v[0]);
      let id;
      if (active.length === 1) id = active[0][0];
      else {
        const key = active.length === 2 ? active.flat().join(':') : null;
        id = key ? shared.get(key) : undefined;
        if (id === undefined) {
          id = add([0, 1, 2].map(axis => ids.reduce((sum, v, k) => sum + seed.centres[v][axis] * weights[k] / f, 0)));
          if (key) shared.set(key, id);
        }
      }
      rows[i][j] = id;
    }
  }
  for (let i = 0; i < f; i++) for (let j = 0; j < f - i; j++) {
    triangles.set([rows[i][j], rows[i + 1][j], rows[i][j + 1]], face++ * 3);
    if (j < f - i - 1) triangles.set([rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]], face++ * 3);
  }
}
if (next !== n || face !== faceCount) throw Error(`Subdivision count ${next}/${face}`);
console.log(`Subdivided ${n.toLocaleString()} cells`);

// Fixed-topology spherical spring relaxation. It smooths subdivision joins
// without changing adjacency, IDs, polygon degrees, or introducing seams.
const relaxationSteps = 48;
const adjacent = new Uint32Array(n * 6).fill(0xffffffff), adjacentDegree = new Uint8Array(n);
for (let t = 0; t < faceCount; t++) for (let k = 0; k < 3; k++) {
  const a = triangles[t * 3 + k], b = triangles[t * 3 + (k + 1) % 3];
  for (const [u, v] of [[a, b], [b, a]]) {
    const start = u * 6;
    let found = false;
    for (let j = 0; j < adjacentDegree[u]; j++) if (adjacent[start + j] === v) found = true;
    if (!found) { if (adjacentDegree[u] === 6) throw Error('Invalid relaxation degree'); adjacent[start + adjacentDegree[u]++] = v; }
  }
}
const relaxed = new Float32Array(centres.length);
const targetEdge = Math.sqrt(8 * Math.PI / (Math.sqrt(3) * n));
for (let iteration = 0; iteration < relaxationSteps; iteration++) {
  for (let id = 0; id < n; id++) {
    const cx=centres[id*3],cy=centres[id*3+1],cz=centres[id*3+2];
    let x = cx, y = cy, z = cz;
    for (let k = 0; k < adjacentDegree[id]; k++) {
      const j = adjacent[id * 6 + k] * 3, dx=centres[j]-cx,dy=centres[j+1]-cy,dz=centres[j+2]-cz;
      // A pentagonal dual needs a larger primal circumradius for comparable
      // area; otherwise unconstrained spring smoothing shrinks the 12 spaces.
      const pentagonEdge=adjacentDegree[id]===5 || adjacentDegree[adjacent[id*6+k]]===5;
      const restLength=targetEdge*(pentagonEdge?1.35:1);
      const force=(1-restLength/Math.hypot(dx,dy,dz))*.4/adjacentDegree[id];
      x+=dx*force;y+=dy*force;z+=dz*force;
    }
    const length = Math.hypot(x, y, z);
    relaxed[id * 3] = x / length; relaxed[id * 3 + 1] = y / length; relaxed[id * 3 + 2] = z / length;
  }
  centres.set(relaxed);
}
console.log(`Relaxed ${relaxationSteps} iterations without changing topology`);

const degrees = new Uint32Array(n);
const rings = new Uint32Array(n * 6).fill(0xffffffff);
const neighbours = new Uint32Array(n * 6).fill(0xffffffff);
const vertices = new Float32Array(faceCount * 3);
for (let t = 0; t < faceCount; t++) {
  const ids = triangles.subarray(t * 3, t * 3 + 3);
  vertices.set(normal(...[0, 1, 2].map(axis => ids.reduce((sum, id) => sum + centres[id * 3 + axis], 0))), t * 3);
  for (const id of ids) {
    if (degrees[id] >= 6) throw Error(`Invalid degree at ${id + 1}`);
    rings[id * 6 + degrees[id]++] = t;
  }
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const point = (buffer, id) => buffer.subarray(id * 3, id * 3 + 3);
const areas = new Float32Array(n);
const pentagons = [];
let areaSum = 0, areaSq = 0, areaMin = Infinity, areaMax = 0;
let edgeSum = 0, edgeSq = 0, edgeMin = Infinity, edgeMax = 0, edgeCount = 0;
for (let id = 0; id < n; id++) {
  const d = degrees[id], p = point(centres, id);
  if (d === 5) pentagons.push(id + 1);
  else if (d !== 6) throw Error(`Degree ${d} at ${id + 1}`);
  const east = normal(...cross(Math.abs(p[1]) < .9 ? [0, 1, 0] : [0, 0, 1], p));
  const north = cross(p, east);
  const ring = [...rings.subarray(id * 6, id * 6 + d)].sort((a, b) => {
    const u = point(vertices, a), v = point(vertices, b);
    return Math.atan2(dot(u, north), dot(u, east)) - Math.atan2(dot(v, north), dot(v, east));
  });
  rings.set(ring, id * 6);
  let area = 0;
  for (let k = 0; k < d; k++) {
    const t = ring[k], s = ring[(k + 1) % d];
    const neighbour = [...triangles.subarray(t * 3, t * 3 + 3)].find(v => v !== id && triangles.subarray(s * 3, s * 3 + 3).includes(v));
    if (neighbour === undefined) throw Error(`Open polygon ${id + 1}`);
    neighbours[id * 6 + k] = neighbour;
    const u = point(vertices, t), v = point(vertices, s);
    const determinant = dot(p, cross(u, v));
    if (!(determinant > 0)) throw Error(`Folded polygon ${id + 1}`);
    area += 2 * Math.atan2(determinant, 1 + dot(p, u) + dot(u, v) + dot(v, p));
    if (neighbour > id) {
      const length = Math.atan2(Math.hypot(...cross(u, v)), dot(u, v));
      edgeSum += length; edgeSq += length * length; edgeCount++;
      edgeMin = Math.min(edgeMin, length); edgeMax = Math.max(edgeMax, length);
    }
  }
  areas[id] = area;
  areaSum += area; areaSq += area * area; areaMin = Math.min(areaMin, area); areaMax = Math.max(areaMax, area);
}
if (pentagons.length !== 12) throw Error('Pentagon count');
if (Math.abs(areaSum - 4 * Math.PI) > 1e-4) throw Error(`Surface area ${areaSum}`);
for (let id = 0; id < n; id++) for (let k = 0; k < degrees[id]; k++) {
  const other = neighbours[id * 6 + k];
  if (!neighbours.subarray(other * 6, other * 6 + degrees[other]).includes(id)) throw Error('Nonreciprocal edge');
}
const statistics = (sum, sq, count, min, max) => ({ min, max, mean: sum / count, coefficientOfVariation: Math.sqrt(Math.max(0, sq / count - (sum / count) ** 2)) / (sum / count), maxMinRatio: max / min });
const arrays = { centres, vertices, rings, neighbours, degrees, areas };
let offset = 32;
const sections = {};
for (const [name, array] of Object.entries(arrays)) { sections[name] = { offset, length: array.length, type: array.constructor.name }; offset += array.byteLength; }
const binary = Buffer.alloc(offset);
binary.write('MHGEO001'); binary.writeUInt32LE(n, 8); binary.writeUInt32LE(faceCount, 12);
for (const [name, array] of Object.entries(arrays)) Buffer.from(array.buffer).copy(binary, sections[name].offset);
const report = { version: 1, frequency: f, relaxationSteps, cells: n, hexagons: n - 12, pentagons, vertices: faceCount, edges: edgeCount,
  euler: faceCount - edgeCount + n, surfaceArea: areaSum,
  cellArea: statistics(areaSum, areaSq, n, areaMin, areaMax), edgeLength: statistics(edgeSum, edgeSq, edgeCount, edgeMin, edgeMax),
  bytes: binary.length, sha256: crypto.createHash('sha256').update(binary).digest('hex'), sections };
const directory = f === 127 ? 'public/topology' : 'artifacts/topology-test';
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(`${directory}/geodesic-v1.bin`, binary);
fs.writeFileSync(`${directory}/geodesic-v1.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
