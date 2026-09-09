import { spawn } from 'node:child_process';
import { checkedRelease, settings, verifyPublic } from './staging-release.mjs';

const release = await checkedRelease();
const config = settings();
if (config.MH_ASSET_ORIGIN?.replace(/\/$/, '') !== release.origin) throw Error('Asset origin changed; rebuild staging');
await verifyPublic(release);
// Re-check after network verification, so changed build files cannot bypass it.
const current = await checkedRelease();
if (JSON.stringify(current) !== JSON.stringify(release)) throw Error('Release changed during verification');
const env = { ...process.env };
for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN']) if (config[key]) env[key] = config[key];
const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'wrangler.staging.jsonc'], { stdio: 'inherit', env, shell: false });
  child.on('error', reject); child.on('exit', resolve);
});
if (code !== 0) throw Error(`Staging deployment failed (${code})`);
console.log(`Staging now references immutable release ${release.release}. Record the Wrangler deployment version for rollback.`);
