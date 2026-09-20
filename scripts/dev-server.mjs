// Report or stop whatever is holding this project's dev port.
//
//   node scripts/dev-server.mjs          # what is listening
//   node scripts/dev-server.mjs --stop   # free the port
//
// Uses netstat rather than Get-NetTCPConnection or Get-CimInstance, both of
// which fail with "Invalid class" on this machine when the WMI repository is
// unhealthy. A stop built on those reports success while killing nothing.
import { execFileSync } from 'node:child_process';

const port = Number(process.argv.find(a => /^\d+$/.test(a)) || process.env.DEV_PORT || 4180);
const stop = process.argv.includes('--stop');

const listeners = () => {
  const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
  const pids = new Set();
  for (const line of out.split('\n')) {
    if (!line.includes('LISTENING')) continue;
    const match = line.match(/:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
    if (match && Number(match[1]) === port) pids.add(match[2]);
  }
  return [...pids];
};

const found = listeners();
if (!found.length) { console.log(`Port ${port} is free.`); process.exit(0); }
if (!stop) {
  console.log(`Port ${port} is held by PID ${found.join(', ')}. Run with --stop to free it.`);
  process.exit(0);
}
// taskkill refuses these on this machine, so go through Stop-Process, which
// does work here. Kill the children first: npm's wrapper respawns otherwise.
for (const pid of found) {
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `$ErrorActionPreference='Stop';` +
      `$ids=@(${pid});` +
      `try{$ids+=(Get-Process -Id ${pid}).Id}catch{};` +
      `foreach($i in $ids){try{Stop-Process -Id $i -Force}catch{}}`], { stdio: 'ignore' });
    console.log(`Stopped ${pid}.`);
  } catch { console.log(`Could not stop ${pid}.`); }
}
const left = listeners();
if (left.length) { console.error(`Port ${port} still held by ${left.join(', ')}.`); process.exit(1); }
console.log(`Port ${port} is free.`);
