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
export async function fetchGzipUrl(url, { persistent = false, expectedBytes, expectedSha256, cacheGroup = 'mh-topology-v1', maxEntries = 1, signal } = {}) {
  const decode = async response => {
    const bytes = await decodeGzipResponse(response, expectedBytes);
    if (expectedSha256) {
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== expectedSha256) throw Error('Topology checksum mismatch');
    }
    return bytes;
  };
  let cache;
  if(persistent && /\/releases\/[a-f0-9]{64}\//.test(url)) {
    try { cache = await globalThis.caches?.open(cacheGroup); } catch {}
  }
  let cached;
  try { cached = await cache?.match(url); } catch {}
  if(cached) {
    try { return await decode(cached); }
    catch { try { await cache.delete(url); } catch {} }
  }
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error(`Runtime data unavailable: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const decoded = await decode(new Response(bytes));
  if(cache) {
    try {
      await cache.put(url, new Response(bytes));
      // Retain a bounded working set in one immutable release. Regional files
      // use a separate cache so they neither evict each other nor the legacy asset.
      const prefix = url.match(/^.*\/releases\/[a-f0-9]{64}\//)?.[0];
      const keys = await cache.keys(), current = keys.filter(key => key.url.startsWith(prefix));
      for (const key of keys) if (!key.url.startsWith(prefix)) await cache.delete(key);
      for (const key of current.slice(0, Math.max(0, current.length - maxEntries))) await cache.delete(key);
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
