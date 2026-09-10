// One build-time origin/release prefix, shared by the app and topology worker.
// Local development keeps the existing same-origin paths.
const base = (import.meta.env?.VITE_RUNTIME_ASSET_BASE || '').replace(/\/$/, '');
export const runtimeAsset = path => `${base}/${path.replace(/^\//, '')}`;

export async function fetchRuntimeJson(path) {
  const response = await fetch(runtimeAsset(path));
  if (!response.ok) throw new Error(`Runtime data unavailable: ${path}`);
  return response.json();
}

export async function fetchRuntimeGzip(path, options = {}) {
  return fetchGzipUrl(runtimeAsset(path), options);
}

// Large topology responses are not reliably retained by the HTTP cache. Only
// immutable release URLs enter this bounded, best-effort application cache.
export async function fetchGzipUrl(url, { persistent = false, expectedBytes } = {}) {
  let cache;
  if(persistent && /\/releases\/[a-f0-9]{64}\//.test(url)) {
    try { cache = await globalThis.caches?.open('mh-topology-v1'); } catch {}
  }
  let cached;
  try { cached = await cache?.match(url); } catch {}
  if(cached) {
    try { return await decodeGzipResponse(cached, expectedBytes); }
    catch { try { await cache.delete(url); } catch {} }
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Runtime data unavailable: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const decoded = await decodeGzipResponse(new Response(bytes), expectedBytes);
  if(cache) {
    try {
      await cache.put(url, new Response(bytes));
      // Keep one topology release, rather than accumulating 17 MB per deploy.
      for(const key of await cache.keys())if(key.url!==url)await cache.delete(key);
    } catch {} // Storage denial/quota must not prevent browsing or editing.
  }
  return decoded;
}

async function decodeGzipResponse(response, expectedBytes) {
  // Browsers decode Content-Encoding themselves. Inspect the actual bytes so
  // cross-origin responses also work when that header is not exposed by CORS.
  const bytes = new Uint8Array(await response.arrayBuffer());
  const decoded = bytes[0] !== 0x1f || bytes[1] !== 0x8b ? bytes : new Uint8Array(await new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
  ).arrayBuffer());
  if(expectedBytes!==undefined&&decoded.length!==expectedBytes)throw new Error('Incomplete topology data');
  return decoded;
}
