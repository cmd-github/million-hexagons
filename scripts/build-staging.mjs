import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { build, loadEnv } from 'vite';
import { runtimeFiles, copyFiles, sha256, contentType, listFiles, assetOrigin } from './deployment-assets.mjs';

const root = process.cwd();
const settings = { ...loadEnv('staging', root, 'MH_'), ...process.env };
const local = process.argv.includes('--local');
const origin = assetOrigin(settings.MH_ASSET_ORIGIN, local);
const files = await runtimeFiles(path.join(root, 'public'));
const objects = [];
for (const file of files) {
  const data = await readFile(path.join(root, 'public', file));
  objects.push({ path: file, bytes: data.length, sha256: sha256(data), contentType: contentType(file) });
}
const release = sha256(JSON.stringify(objects));
const prefix = `releases/${release}`;
const runtimeDir = path.join(root, 'staging-runtime', prefix);
await copyFiles(path.join(root, 'public'), runtimeDir, files);
// Detect a source mutation during preparation rather than publishing mixed bytes.
for (const object of objects) if (sha256(await readFile(path.join(runtimeDir, object.path))) !== object.sha256) throw Error(`Asset changed during build: ${object.path}`);
const base = `${origin}/${prefix}`;
await build({ mode: 'staging', build: { outDir: 'staging-dist', emptyOutDir: true }, define: { 'import.meta.env.VITE_RUNTIME_ASSET_BASE': JSON.stringify(base) } });

// The page contains dynamic styles and an inline retry handler. Restrict scripts
// to self plus that exact handler; Vite emits the module bootstrap as a file.
const retryHash = (await import('node:crypto')).createHash('sha256').update('location.reload()').digest('base64');
const csp = `default-src 'self'; script-src 'self' 'unsafe-hashes' 'sha256-${retryHash}'; worker-src 'self' blob:; connect-src 'self' ${origin}; img-src 'self' data: blob: ${origin}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
await writeFile('staging-dist/_headers', `/*\n  Cache-Control: no-cache\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Robots-Tag: noindex, nofollow\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
await writeFile('staging-dist/robots.txt', 'User-agent: *\nDisallow: /\n');
const appObjects = [];
for (const file of await listFiles('staging-dist')) {
  const data = await readFile(path.join('staging-dist', file));
  if (data.length > 25 * 1024 * 1024) throw Error(`Static asset exceeds Workers limit: ${file}`);
  appObjects.push({ path: file, sha256: sha256(data) });
}
await mkdir('artifacts/staging', { recursive: true });
await writeFile('artifacts/staging/release.json', JSON.stringify({ version: 1, environment: 'staging', local, origin, release, prefix, objects, appObjects }, null, 2));
console.log(`Prepared staging release ${release}\nRuntime: ${objects.length} files, ${(objects.reduce((sum, o) => sum + o.bytes, 0) / 1e6).toFixed(1)} MB\nApp: ${appObjects.length} files; ${(await stat('staging-dist/index.html')).size} byte HTML\nNo cloud resources changed.`);
