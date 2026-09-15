import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(label, args, options = {}) {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const unitTests = readdirSync('scripts').filter(name => name.endsWith('.test.mjs')).sort().map(name => `scripts/${name}`);
run('repository hygiene', ['scripts/repo-hygiene.mjs']);
run('deterministic repository tests', ['--test', '--test-concurrency=1', ...unitTests]);
run('backend tests', ['--test'], { cwd: 'functions' });
run('staging build', ['scripts/build-staging.mjs'], { env: { ...process.env, MH_ASSET_ORIGIN: process.env.MH_ASSET_ORIGIN || 'https://assets.invalid' } });
run('staging release integrity', ['--input-type=module', '-e', "import {checkedRelease} from './scripts/staging-release.mjs'; await checkedRelease();"]);
run('Worker dry run', ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'wrangler.staging.jsonc', '--dry-run']);
console.log('\nLaunch checks passed. Live services, real payments, load tests and physical-device journeys remain separate release gates.');
