export const CELL_COUNT = 1000000;
export const CELL_UNIT = Math.sqrt(4 * Math.PI / CELL_COUNT / (3 * Math.sqrt(3) / 2));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = a => { const l = Math.hypot(...a); return a.map(v => v / l); };

export class SphericalTopology {
  constructor(buffer, manifest) {
    if (new TextDecoder().decode(new Uint8Array(buffer, 0, 8)) !== 'MHGEO001') throw Error('Unsupported topology asset');
    const header = new DataView(buffer);
    if (manifest.version !== 1 || buffer.byteLength !== manifest.bytes || header.getUint32(8, true) !== manifest.cells || header.getUint32(12, true) !== manifest.vertices) throw Error('Incomplete or mismatched topology asset');
    this.manifest = manifest;
    for (const [key, section] of Object.entries(manifest.sections)) {
      this[key] = new ({ Float32Array, Uint32Array }[section.type])(buffer, section.offset, section.length);
    }
    this.count = manifest.cells;
    this.last = 0;
  }
  centre(id) {
    if (!Number.isInteger(id) || id < 1 || id > this.count) throw Error('Cell ID outside inventory');
    return this.centres.subarray((id - 1) * 3, id * 3);
  }
  neighboursOf(id) { return Array.from(this.neighbours.subarray((id - 1) * 6, (id - 1) * 6 + this.degrees[id - 1]), v => v + 1); }
  polygon(id) {
    const start = (id - 1) * 6;
    return Array.from(this.rings.subarray(start, start + this.degrees[id - 1]), v => this.vertices.subarray(v * 3, v * 3 + 3));
  }
  contains(id, point) {
    const polygon = this.polygon(id);
    return polygon.every((v, k) => dot(cross(v, polygon[(k + 1) % polygon.length]), point) >= -1e-12);
  }
  pick(point) {
    const p = normalize(Array.from(point));
    // The 64 frozen seed vertices are a coarse spatial hierarchy. Greedy graph
    // descent reaches a local cell in O(sqrt(N)), without object raycasts.
    let best = this.last, score = dot(this.centre(best + 1), p);
    for (let i = 0; i < 64; i++) { const s = dot(this.centre(i + 1), p); if (s > score) { best = i; score = s; } }
    for (let step = 0; step < 2048; step++) {
      let next = best;
      for (const id of this.neighboursOf(best + 1)) { const s = dot(this.centre(id), p); if (s > score + 1e-15) { next = id - 1; score = s; } }
      if (next === best) break;
      best = next;
    }
    // Barycentric-dual boundaries are not Voronoi bisectors: test the real
    // polygon, then walk across its violated boundary to its actual neighbour.
    for (let step = 0; step < 64; step++) {
      const polygon = this.polygon(best + 1);
      const edge = polygon.findIndex((v, k) => dot(cross(v, polygon[(k + 1) % polygon.length]), p) < -1e-12);
      if (edge < 0) { this.last = best; return best + 1; }
      best = this.neighbours[best * 6 + edge];
    }
    throw Error('Topology picking did not converge');
  }
  frame(id) {
    const normal = Array.from(this.centre(id));
    const east = normalize(cross(Math.abs(normal[1]) < .999999 ? [0, 1, 0] : [0, 0, -1], normal));
    return { normal, east, north: cross(normal, east) };
  }
  project(point, frame) {
    const depth = dot(point, frame.normal);
    if (depth <= 0) throw Error('Placement exceeds tangent hemisphere');
    return { x: dot(point, frame.east) / depth / CELL_UNIT, y: -dot(point, frame.north) / depth / CELL_UNIT };
  }
  cells(ids, anchor) {
    const frame = this.frame(anchor);
    return ids.map(value => {
      const id = typeof value === 'number' ? value : value.id;
      return { ...(typeof value === 'object' ? value : {}), id, ...this.project(this.centre(id), frame),
        polygon: this.polygon(id).map(p => this.project(p, frame)), pentagon: this.degrees[id - 1] === 5 };
    });
  }
  connected(anchor, count, aspect = 1.25) {
    const frame = this.frame(anchor), visited = new Set([anchor]), heap = [];
    const score = id => { const p = this.project(this.centre(id), frame); return p.x * p.x / aspect + p.y * p.y * aspect; };
    const push = id => {
      const entry = { id, score: score(id) }; let i = heap.length; heap.push(entry);
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p].score <= entry.score) break; heap[i] = heap[p]; i = p; } heap[i] = entry;
    };
    const pop = () => {
      const first = heap[0], last = heap.pop();
      if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].score < heap[c].score) c++; if (last.score <= heap[c].score) break; heap[i] = heap[c]; i = c; } heap[i] = last; }
      return first.id;
    };
    push(anchor);
    const ids = [];
    while (ids.length < count) {
      const id = pop(); ids.push(id);
      for (const neighbour of this.neighboursOf(id)) if (!visited.has(neighbour)) { visited.add(neighbour); push(neighbour); }
    }
    return this.cells(ids, anchor);
  }
  isConnected(cells) {
    const ids = new Set(cells.map(c => typeof c === 'number' ? c : c.id));
    if (!ids.size) return false;
    const pending = [ids.values().next().value], seen = new Set(pending);
    for (let i = 0; i < pending.length; i++) for (const id of this.neighboursOf(pending[i])) if (ids.has(id) && !seen.has(id)) { seen.add(id); pending.push(id); }
    return seen.size === ids.size;
  }
}

export async function loadTopology() {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./topology-loader.worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{worker.terminate();if(data.error)reject(Error(data.error));else resolve(new SphericalTopology(data.buffer,data.manifest));};
    worker.onerror=error=>{worker.terminate();reject(Error(error.message||'Could not load exact cell data'));};
    worker.postMessage({});
  });
}
