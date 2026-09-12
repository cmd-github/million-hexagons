import {spawn} from 'node:child_process';
// Trusted worker process; backend leases serialize overlapping/restarted workers.
// Run under the deployment host's service manager for restart-on-failure.
let stopping=false,child=null;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;child?.kill(signal);});
while(!stopping){
  await new Promise(resolve=>{child=spawn(process.execPath,['scripts/publish-artwork-snapshot.mjs'],{stdio:'inherit',env:process.env});child.on('error',error=>{console.error(error.message);resolve();});child.on('exit',resolve);});
  child=null;if(!stopping)await new Promise(resolve=>setTimeout(resolve,30000));
}
