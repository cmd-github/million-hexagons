import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';

const index = execFileSync('git', ['ls-files', '-s', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).map(record => {
  const match = record.match(/^\d+ ([0-9a-f]+) \d+\t(.+)$/s);
  if (!match) throw new Error(`Unexpected Git index entry: ${record}`);
  return { hash: match[1], path: match[2] };
});
const tracked = index.map(entry => entry.path);
const forbidden = [
  ['artifacts/', path => path.startsWith('artifacts/')],
  ['Playwright reports', path => path.startsWith('playwright-report/') || path.startsWith('test-results/')],
  ['generated sample artwork', path => path.startsWith('public/artwork/sample/') || path.startsWith('public/artwork/sample-hq/') || path.startsWith('public/artwork/million/')],
  ['generated monolithic topology', path => path === 'public/topology/geodesic-v1.bin.gz' || path === 'public/topology/geodesic-v1.packed.gz'],
];

const violations = [];
for (const [label, matches] of forbidden) {
  for (const path of tracked.filter(matches)) violations.push(`${label}: ${path}`);
}

const maxBytes = 5 * 1024 * 1024;
const canonical = {
  path: 'public/topology/geodesic-v1.bin',
  bytes: 91999984,
  sha256: '9a5107c6ff56c89ba88f42760aeb472e63a70686ed4654ac77d011d4b8595a41',
};
const sizes = spawnSync('git', ['cat-file', '--batch-check=%(objectsize)'], { encoding: 'utf8', input: index.map(entry => entry.hash).join('\n') + '\n' });
if (sizes.error) throw sizes.error;
if (sizes.status !== 0) throw new Error(sizes.stderr || 'Unable to inspect Git objects');
const objectSizes = sizes.stdout.trim().split(/\r?\n/).map(Number);
for (const [position, path] of tracked.entries()) {
  const bytes = objectSizes[position];
  if (bytes > maxBytes && path !== canonical.path) violations.push(`tracked file exceeds 5 MiB: ${path} (${bytes} bytes)`);
}

if (tracked.includes(canonical.path)) {
  const data = await readFile(canonical.path);
  const hash = createHash('sha256').update(data).digest('hex');
  if (data.length !== canonical.bytes || hash !== canonical.sha256) violations.push(`canonical topology does not match its reviewed size and SHA-256: ${canonical.path}`);
}

if (violations.length) throw new Error(`Repository hygiene failed:\n${violations.map(value => `- ${value}`).join('\n')}`);
console.log(`Repository hygiene passed (${tracked.length} tracked files; no forbidden generated output; large-file allowlist verified).`);
