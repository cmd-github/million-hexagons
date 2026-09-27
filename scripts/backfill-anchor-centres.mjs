import assert from 'node:assert/strict';
import fs from 'node:fs';
import { open } from 'node:fs/promises';

// Placements created before anchor positions were stored have none, so the HUD
// still downloads a regional topology partition to place them. Only something
// holding the canonical topology can work the positions out, so this reads them
// locally and hands them to the admin backfill. It never overwrites a position
// that is already stored, so re-running it is harmless.
const env = Object.fromEntries(fs.readFileSync('.env.staging.local', 'utf8').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#'))
  .map(line => { const at = line.indexOf('='); return [line.slice(0, at).trim(), line.slice(at + 1).trim()]; }));
const api = process.env.MH_STAGING_API || 'https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
const qaKey = env.MH_STAGING_QA_KEY || env.MH_R2_SECRET_ACCESS_KEY;
assert.ok(qaKey, 'Set MH_STAGING_QA_KEY in ignored .env.staging.local');
const qaOwner = `staging-qa-${crypto.randomUUID()}`;
const apply = process.argv.includes('--apply');

const manifest = JSON.parse(fs.readFileSync('public/topology/geodesic-v1.json', 'utf8'));
const centres = manifest.sections.centres;
assert.equal(centres.type, 'Float32Array', 'Unexpected topology layout');

const request = async body => {
  const response = await fetch(api, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mh-qa-key': qaKey, 'x-mh-qa-owner': qaOwner }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  assert.ok(response.ok, `${body.action} failed: ${response.status} ${JSON.stringify(result)}`);
  return result;
};

const { placements } = await (await fetch(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'public-list' }) })).json();
const missing = placements.filter(placement => !placement.anchorCentre);
console.log(`${placements.length} placements, ${missing.length} without a stored position`);
if (!missing.length) { console.log('Nothing to backfill.'); process.exit(0); }

// Read only the three floats each anchor needs rather than the 92MB file.
const file = await open('public/topology/geodesic-v1.bin', 'r');
const entries = [];
try {
  for (const placement of missing) {
    const anchor = Number(placement.anchor);
    assert.ok(Number.isSafeInteger(anchor) && anchor >= 1 && anchor <= manifest.cells, `Anchor ${anchor} outside the inventory`);
    const buffer = Buffer.alloc(12);
    await file.read(buffer, 0, 12, centres.offset + (anchor - 1) * 12);
    const centre = [...new Float32Array(buffer.buffer, buffer.byteOffset, 3)];
    const length = Math.hypot(...centre);
    assert.ok(length > 0.9 && length < 1.1, `Anchor ${anchor} produced a non-unit vector`);
    entries.push({ placementId: placement.placementId, anchorCentre: centre.map(part => Number((part / length).toFixed(6))) });
  }
} finally { await file.close(); }

console.log(entries.slice(0, 3).map(entry => `${entry.placementId} -> [${entry.anchorCentre.join(', ')}]`).join('\n'));
if (!apply) { console.log(`\nDry run. ${entries.length} positions ready; pass --apply to write them.`); process.exit(0); }

const { result } = await request({ action: 'backfill-anchor-centres', placements: entries });
console.log('Backfill:', JSON.stringify(result));
const after = await (await fetch(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'public-list' }) })).json();
const remaining = after.placements.filter(placement => !placement.anchorCentre).length;
console.log(`${after.placements.length - remaining} of ${after.placements.length} placements now carry a position`);
assert.equal(remaining, 0, 'Some placements still have no stored position');
