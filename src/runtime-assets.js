// One build-time origin/release prefix, shared by the app and topology worker.
// Local development keeps the existing same-origin paths.
const base = (import.meta.env?.VITE_RUNTIME_ASSET_BASE || '').replace(/\/$/, '');
export const runtimeAsset = path => `${base}/${path.replace(/^\//, '')}`;

export async function fetchRuntimeJson(path) {
  const response = await fetch(runtimeAsset(path));
  if (!response.ok) throw new Error(`Runtime data unavailable: ${path}`);
  return response.json();
}

export async function fetchRuntimeGzip(path) {
  const response = await fetch(runtimeAsset(path));
  if (!response.ok) throw new Error(`Runtime data unavailable: ${path}`);
  // Browsers decode Content-Encoding themselves. Inspect the actual bytes so
  // cross-origin responses also work when that header is not exposed by CORS.
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
  return new Uint8Array(await new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
  ).arrayBuffer());
}
