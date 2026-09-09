import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const config = JSON.parse(await readFile('deploy/staging-monitor.json', 'utf8'));
const report = { checkedAt: new Date().toISOString(), ...config, checks: [], ok: false };
async function get(url, type, runtime = false) {
  const start = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: runtime ? { Origin: config.appOrigin } : {} });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  assert.ok((response.headers.get('content-type') || '').includes(type), `${url}: incorrect content type`);
  if (runtime) {
    assert.equal(response.headers.get('access-control-allow-origin'), '*', 'Runtime CORS');
    assert.match(response.headers.get('cache-control') || '', /immutable/, 'Runtime cache policy');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  report.checks.push({ url, bytes: bytes.length, ms: Math.round(performance.now() - start), cache: response.headers.get('cf-cache-status') });
  return { response, bytes };
}
try {
  const { response, bytes } = await get(config.appOrigin, 'text/html');
  assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
  const html = bytes.toString();
  assert.match(html, /id="world"/);
  // Follow bundled entry points and chunks, including the topology worker.
  const pending = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map(m => m[1]);
  const seen = new Set(); let runtimeReferenced = false;
  while (pending.length) {
    const file = pending.shift(); if (seen.has(file)) continue;
    assert.ok(seen.size < 20, 'Unexpectedly large app bundle graph'); seen.add(file);
    const { bytes } = await get(new URL(file, config.appOrigin), file.endsWith('.css') ? 'text/css' : 'javascript');
    if (file.endsWith('.js')) {
      const text = bytes.toString();
      if (text.includes(`${config.assetOrigin}/releases/${config.release}`)) runtimeReferenced = true;
      for (const match of text.matchAll(/["']((?:\/?assets\/|\.\/)?[A-Za-z0-9_.-]+\.(?:js|css))["']/g)) {
        const next = new URL(match[1].startsWith('assets/') ? `/${match[1]}` : match[1], new URL(file, config.appOrigin));
        if (next.pathname.startsWith('/assets/')) pending.push(next.pathname);
      }
    }
  }
  assert.ok(runtimeReferenced, 'App no longer references the expected runtime release; review monitor configuration');
  const base = `${config.assetOrigin}/releases/${config.release}`;
  const bootstrap = JSON.parse((await get(`${base}/topology/bootstrap.json`, 'application/json', true)).bytes);
  assert.equal(bootstrap.cells, 1000000);
  const manifest = JSON.parse((await get(`${base}/artwork/sample-hq/manifest.json`, 'application/json', true)).bytes);
  assert.equal(manifest.files, 8190);
  for (const name of ['occupancy-v1.gz', 'sample-owners-v1.gz']) {
    let { bytes } = await get(`${base}/topology/${name}`, 'application/octet-stream', true);
    if (bytes[0] === 31 && bytes[1] === 139) bytes = gunzipSync(bytes);
    assert.equal(bytes.length, 1000000, `${name}: incomplete data`);
  }
  for (let face = 0; face < 6; face++) {
    const { bytes } = await get(`${base}/artwork/sample-hq/${face}/0/0/0.webp`, 'image/webp', true);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
  report.ok = true;
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  await mkdir('artifacts/staging', { recursive: true });
  await writeFile('artifacts/staging/health.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
