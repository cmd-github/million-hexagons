import { readFile, cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const topologyFiles = ['bootstrap.json', 'geodesic-v1.json', 'geodesic-v1.packed.gz', 'occupancy-v1.gz', 'sample-owners-v1.gz'].map(name => `topology/${name}`);
export const appFiles = ['favicon.svg', ...Array.from({ length: 12 }, (_, i) => `brands/${i}.svg`)];
export const sha256 = data => createHash('sha256').update(data).digest('hex');
export const contentType = file => file.endsWith('.json') ? 'application/json' : file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';

export async function runtimeFiles(publicDir) {
  const base = 'artwork/sample-hq';
  const manifest = JSON.parse(await readFile(path.join(publicDir, base, 'manifest.json'), 'utf8'));
  if (manifest.maxLevel !== 5 || manifest.tileSize !== 512 || manifest.projection !== 'cube-gnomonic') throw Error('Review the deployment allowlist for this artwork format');
  const files = [...topologyFiles, `${base}/manifest.json`];
  for (let face = 0; face < 6; face++) for (let level = 0; level <= manifest.maxLevel; level++) {
    for (let x = 0; x < 2 ** level; x++) for (let y = 0; y < 2 ** level; y++) files.push(`${base}/${face}/${level}/${x}/${y}.webp`);
  }
  if (files.length - topologyFiles.length - 1 !== manifest.files) throw Error('Artwork catalogue file count mismatch');
  return files.sort();
}

export async function copyFiles(source, destination, files) {
  // Exact filenames only: newly added public notes/source files never ship.
  for (const file of files) {
    await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
    await cp(path.join(source, file), path.join(destination, file));
  }
}

export async function listFiles(root, prefix = '') {
  const files = [];
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw Error(`Symlinks are not deployable: ${name}`);
    if (entry.isDirectory()) files.push(...await listFiles(root, name));
    else files.push(name);
  }
  return files.sort();
}

export function assetOrigin(value, allowLocal = false) {
  if (!value) throw Error('Set MH_ASSET_ORIGIN to the public staging R2 URL (see docs/STAGING.md)');
  const url = new URL(value);
  const local = allowLocal && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('MH_ASSET_ORIGIN must be an HTTPS origin without a path, credentials or query');
  return url.origin;
}
