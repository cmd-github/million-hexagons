import {SphericalTopology, CELL_COUNT} from './topology.js';
import {decodeTopology} from './topology-codec.js';
import {REGION_COUNT, REGION_SIZE, regionForPoint, regionBounds, regionLayout, regionArrays} from './region-format.js';
import {fetchRuntimeJson, fetchRuntimeGzip} from '../runtime-assets.js';

const base = 'topology/regions-v1';
const bounds = Array.from({length: REGION_COUNT}, (_, i) => regionBounds(i));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export class MissingRegion extends Error {
  constructor(region) { super('Exact cell geometry is loading'); this.region = region; }
}

// The synchronous geometry contract is unchanged. Callers prepare a visible
// cap or exact ID set before using it; missing data never becomes an estimate.
export class RegionalTopology extends SphericalTopology {
  constructor(manifest, index, fetchBytes = fetchRuntimeGzip) {
    super(null, manifest);
    if (manifest.version !== 1 || manifest.topology !== 'geodesic-v1' || manifest.size !== REGION_SIZE || manifest.cells !== CELL_COUNT || manifest.tiles.length !== REGION_COUNT || index.length !== CELL_COUNT) throw Error('Unsupported regional topology');
    this.index = index;
    this.offsets = new Uint16Array(CELL_COUNT);
    this.regions = new Map(); this.pending = new Map(); this.fetchBytes = fetchBytes;
    this.active = 0; this.waiters = []; this.readers = 0;
    this.generation = 0;
    this.stats = {requests: 0, loadedCells: 0, decodedBytes: 0, errors: 0};
  }
  regionOf(id) {
    if (!Number.isInteger(id) || id < 1 || id > this.count) throw Error('Cell ID outside inventory');
    return this.index[id - 1];
  }
  data(id) {
    const key = this.regionOf(id), region = this.regions.get(key);
    if (!region) throw new MissingRegion(key);
    region.used = performance.now();
    return [region, this.offsets[id - 1]];
  }
  centre(id) { if (this.manifest.landmarks?.[id]) return this.manifest.landmarks[id]; const [r, i] = this.data(id); return r.centres.subarray(i * 3, i * 3 + 3); }
  degreeOf(id) { return this.manifest.pentagons.includes(id) ? 5 : 6; }
  neighboursOf(id) { const [r, i] = this.data(id); return Array.from(r.neighbours.subarray(i * 6, i * 6 + r.degrees[i]), v => v + 1); }
  ringIds(id) { const [r, i] = this.data(id); return Array.from(r.rings.subarray(i * 6, i * 6 + r.degrees[i]), v => r.vertexIds[v]); }
  polygon(id) { const [r, i] = this.data(id); return Array.from(r.rings.subarray(i * 6, i * 6 + r.degrees[i]), v => r.vertices.subarray(v * 3, v * 3 + 3)); }
  pick(point) {
    const length = Math.hypot(...point), p = Array.from(point, v => v / length), key = regionForPoint(p);
    const region = this.regions.get(key);
    if (!region) throw new MissingRegion(key);
    region.used = performance.now();
    let best = region.ids[0], score = -Infinity;
    for (let i = 0; i < region.ids.length; i++) {
      const value = region.centres[i * 3] * p[0] + region.centres[i * 3 + 1] * p[1] + region.centres[i * 3 + 2] * p[2];
      if (value > score) { best = region.ids[i]; score = value; }
    }
    // Same canonical oriented boundary walk as the monolithic implementation.
    // At cube seams it naturally requests the adjacent region, never snapping.
    for (let step = 0; step < 64; step++) {
      const polygon = this.polygon(best);
      const edge = polygon.findIndex((a, k) => {
        const b = polygon[(k + 1) % polygon.length];
        return (a[1] * b[2] - a[2] * b[1]) * p[0] + (a[2] * b[0] - a[0] * b[2]) * p[1] + (a[0] * b[1] - a[1] * b[0]) * p[2] < -1e-12;
      });
      if (edge < 0) return best;
      best = this.neighboursOf(best)[edge];
    }
    throw Error('Topology picking did not converge');
  }
  async loadRegion(key, priority = 0) {
    if (this.regions.has(key)) { this.regions.get(key).used = performance.now(); return; }
    if (this.pending.has(key)) { const queued=this.waiters.find(item=>item.key===key);if(queued)queued.priority=Math.max(queued.priority,priority);return this.pending.get(key); }
    const promise = (async () => {
      if (this.active >= 4) await new Promise(resolve => this.waiters.push({key,priority,resolve}));
      else this.active++;
      try {
        const meta = this.manifest.tiles[key];
        if (!meta) throw Error('Invalid geometry region');
        const layout = regionLayout(meta.cells, meta.vertices);
        this.stats.requests++;
        const packed = await this.fetchBytes(`${base}/${key}.gz`, {persistent: true, expectedBytes: layout.bytes, expectedSha256: meta.sha256, cacheGroup: 'mh-regions-v1', maxEntries: 192, signal: AbortSignal.timeout(15000)});
        const buffer = decodeTopology(packed, layout), header = new DataView(buffer);
        if (new TextDecoder().decode(new Uint8Array(buffer, 0, 8)) !== 'MHRGN001' || header.getUint32(8, true) !== key || header.getUint32(12, true) !== meta.cells || header.getUint32(16, true) !== meta.vertices) throw Error('Mismatched geometry region');
        const region = regionArrays(buffer, layout);
        for (let i = 0; i < region.ids.length; i++) {
          const id = region.ids[i];
          if (this.regionOf(id) !== key || region.degrees[i] !== this.degreeOf(id) || (i && id <= region.ids[i - 1])) throw Error('Mismatched regional cell identity');
          this.offsets[id - 1] = i;
        }
        region.used = performance.now(); region.bytes = buffer.byteLength;
        this.regions.set(key, region);
        this.stats.loadedCells += region.ids.length; this.stats.decodedBytes += buffer.byteLength;
      } catch (error) { this.stats.errors++; throw error; }
      finally { this.waiters.sort((a,b)=>b.priority-a.priority);const next = this.waiters.shift(); if (next) next.resolve(); else this.active--; }
    })().finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }
  regionsForCap(direction, cap) {
    const length = Math.hypot(...direction), p = Array.from(direction, v => v / length);
    // Padding exceeds the maximum canonical centre-to-corner/neighbor distance.
    return bounds.flatMap(({direction: centre, angle}, i) => dot(p, centre) >= Math.cos(Math.min(Math.PI, cap + angle + .012)) ? [i] : []);
  }
  cellsIntersectCap(ids, direction, cap) {
    const regions=new Set(this.regionsForCap(direction,cap));
    return ids.some(id=>regions.has(this.regionOf(id)));
  }
  hasCap(direction, cap) { return this.regionsForCap(direction, cap).every(i => this.regions.has(i)); }
  async ensureCap(direction, cap, priority = 0) { const regions=this.regionsForCap(direction,cap).sort((a,b)=>dot(direction,bounds[b].direction)-dot(direction,bounds[a].direction));await Promise.all(regions.map(i => this.loadRegion(i,priority))); }
  async ensureCells(ids) { await Promise.all([...new Set(ids.map(id => this.regionOf(typeof id === 'number' ? id : id.id)))].map(i => this.loadRegion(i))); }
  async run(operation) {
    this.readers++;
    try {
      for (;;) {
        try { return operation(); }
        catch (error) { if (!(error instanceof MissingRegion)) throw error; await this.loadRegion(error.region); }
      }
    } finally { this.readers--; }
  }
  trim(pinnedIds = [], limit = 192) {
    if (this.readers || this.pending.size || this.regions.size <= limit) return;
    const pinned = new Set(pinnedIds.map(id => this.regionOf(typeof id === 'number' ? id : id.id)));
    for (const [key, r] of [...this.regions].sort((a, b) => a[1].used - b[1].used)) {
      if (this.regions.size <= limit) break;
      if (pinned.has(key)) continue;
      this.regions.delete(key); this.generation++; this.stats.loadedCells -= r.ids.length; this.stats.decodedBytes -= r.bytes;
    }
  }
}

export async function loadRegionalTopology() {
  const started = performance.now();
  const [manifest, canonical] = await Promise.all([fetchRuntimeJson(`${base}/manifest.json`), fetchRuntimeJson('topology/geodesic-v1.json')]);
  if (manifest.canonicalSha256 !== canonical.sha256) throw Error('Regional topology does not match frozen topology');
  const bytes = await fetchRuntimeGzip(`${base}/index.gz`, {persistent: true, expectedBytes: CELL_COUNT * 2, expectedSha256: manifest.indexSha256, cacheGroup: 'mh-region-index-v1'});
  const topology = new RegionalTopology(manifest, new Uint16Array(bytes.buffer, bytes.byteOffset, CELL_COUNT));
  topology.loadTiming = {loadMs: performance.now() - started};
  return topology;
}
