import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { checkedRelease, settings, concurrent, verifyPublic } from './staging-release.mjs';

const config = settings();
const release = await checkedRelease();
for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'MH_R2_BUCKET', 'MH_R2_ACCESS_KEY_ID', 'MH_R2_SECRET_ACCESS_KEY']) if (!config[key]) throw Error(`Set ${key} in .env.staging.local`);
// This first slice is staging only. Do not accidentally target a source or live bucket.
if (config.MH_R2_BUCKET !== 'million-hexagons-staging-public') throw Error('Expected bucket million-hexagons-staging-public');
if (!/^[a-f0-9]{32}$/.test(config.CLOUDFLARE_ACCOUNT_ID)) throw Error('Invalid Cloudflare account ID');
if (config.MH_ASSET_ORIGIN?.replace(/\/$/, '') !== release.origin) throw Error('Asset origin changed; rebuild staging');
const client = new S3Client({ region: 'auto', endpoint: `https://${config.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: config.MH_R2_ACCESS_KEY_ID, secretAccessKey: config.MH_R2_SECRET_ACCESS_KEY }, maxAttempts: 5,
  requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
let uploaded = 0, existing = 0;
try {
  await concurrent(release.objects, async object => {
    const Key = `${release.prefix}/${object.path}`, Bucket = config.MH_R2_BUCKET;
    let head;
    try { head = await client.send(new HeadObjectCommand({ Bucket, Key })); }
    catch (error) { if (error.$metadata?.httpStatusCode !== 404) throw error; }
    if (head) {
      if (head.Metadata?.sha256 !== object.sha256 || head.ContentLength !== object.bytes) throw Error(`Immutable key collision: ${Key}`);
      existing++; return;
    }
    const Body = await readFile(path.join('staging-runtime', Key));
    await client.send(new PutObjectCommand({ Bucket, Key, Body, ContentType: object.contentType,
      ContentMD5: createHash('md5').update(Body).digest('base64'), IfNoneMatch: '*',
      CacheControl: 'public, max-age=31536000, immutable, no-transform', Metadata: { sha256: object.sha256 } }));
    uploaded++;
  });
} finally { client.destroy(); }
console.log(`Uploaded ${uploaded}; already present ${existing}. Verifying public delivery before this release can deploy.`);
await verifyPublic(release);
