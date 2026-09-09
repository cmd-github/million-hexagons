import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from 'vite';
import { listFiles, runtimeFiles, appFiles, sha256, assetOrigin } from './deployment-assets.mjs';

export const settings = () => ({ ...loadEnv('staging', process.cwd(), ''), ...process.env });

export async function checkedRelease({ allowLocal = false } = {}) {
  const release = JSON.parse(await readFile('artifacts/staging/release.json', 'utf8'));
  if (release.version !== 1 || release.environment !== 'staging' || (!allowLocal && release.local)) throw Error('Build a remote staging release first');
  assetOrigin(release.origin, allowLocal);
  if (!/^[a-f0-9]{64}$/.test(release.release) || release.prefix !== `releases/${release.release}` || sha256(JSON.stringify(release.objects)) !== release.release) throw Error('Invalid release identity');
  const expected = await runtimeFiles('public');
  if (JSON.stringify(release.objects.map(o => o.path)) !== JSON.stringify(expected)) throw Error('Runtime allowlist mismatch');
  const appPaths = await listFiles('staging-dist');
  if (JSON.stringify(release.appObjects.map(o => o.path)) !== JSON.stringify(appPaths)) throw Error('App files changed; rebuild staging');
  for (const object of release.appObjects) {
    if (!appFiles.includes(object.path) && !['index.html', '_headers', 'robots.txt'].includes(object.path) && !/^assets\/[A-Za-z0-9_.-]+\.(js|css)$/.test(object.path)) throw Error(`Unexpected app asset: ${object.path}`);
    if (sha256(await readFile(path.join('staging-dist', object.path))) !== object.sha256) throw Error(`App changed: ${object.path}; rebuild staging`);
  }
  for (const object of release.objects) {
    const bytes = await readFile(path.join('staging-runtime', release.prefix, object.path));
    if (bytes.length !== object.bytes || sha256(bytes) !== object.sha256) throw Error(`Runtime changed: ${object.path}; rebuild staging`);
  }
  return release;
}

export async function concurrent(items, task, count = 4) {
  let cursor = 0, done = 0, failed;
  const results = await Promise.allSettled(Array.from({ length: count }, async () => {
    while (cursor < items.length && !failed) {
      const item = items[cursor++];
      try { await task(item); } catch (error) { failed = error; throw error; }
      if (++done % 500 === 0) console.log(`${done}/${items.length} objects complete`);
    }
  }));
  const error = results.find(result => result.status === 'rejected');
  if (error) throw error.reason;
}

export async function verifyPublic(release) {
  await concurrent(release.objects, async object => {
    // Credentials are deliberately never sent to the public delivery endpoint.
    const response = await fetch(`${release.origin}/${release.prefix}/${object.path}`, {
      headers: { Origin: 'https://million-hexagons-staging.example' }, signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw Error(`Public object unavailable (${response.status}): ${object.path}`);
    if (response.headers.get('access-control-allow-origin') !== '*') throw Error(`Apply deploy/r2-staging-cors.json to the public bucket: ${object.path}`);
    if (!(response.headers.get('content-type') || '').startsWith(object.contentType)) throw Error(`Incorrect content type: ${object.path}`);
    if (!(response.headers.get('cache-control') || '').includes('immutable')) throw Error(`Missing immutable cache policy: ${object.path}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (sha256(bytes) !== object.sha256) throw Error(`Public checksum mismatch: ${object.path}`);
  });
  console.log(`Verified every public object (${release.objects.length}), CORS, content types and cache policy.`);
}
