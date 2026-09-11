// Remove baked demo inventory without touching the frozen topology or purchases.
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';

const bootstrap = JSON.parse(await fs.readFile('public/topology/bootstrap.json', 'utf8'));
bootstrap.sampleCampaigns = [];
bootstrap.sampleAreas = [];
await fs.writeFile('public/topology/bootstrap.json', JSON.stringify(bootstrap) + '\n');
for (const name of ['occupancy-v1.gz', 'sample-owners-v1.gz']) {
  await fs.writeFile(`public/topology/${name}`, gzipSync(new Uint8Array(1_000_000)));
}
const base = 'public/artwork/empty';
const tile = await sharp({ create: { width: 516, height: 516, channels: 4, background: '#00000000' } }).webp({ lossless: true }).toBuffer();
for (let face = 0; face < 6; face++) {
  await fs.mkdir(`${base}/${face}/0/0`, { recursive: true });
  await fs.writeFile(`${base}/${face}/0/0/0.webp`, tile);
}
await fs.writeFile(`${base}/manifest.json`, JSON.stringify({ version: 1, tileSize: 512, gutter: 2, maxLevel: 0, inventory: 0, projection: 'cube-gnomonic', files: 6 }) + '\n');
console.log('Empty base ready; all visible brands must come from placement records.');
