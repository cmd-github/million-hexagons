import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../deploy/staging-worker.js';
test('public state is shared briefly at the edge and failures are never cached',async()=>{
  const originalFetch=globalThis.fetch,originalCaches=globalThis.caches;let cached=null,calls=0,fail=false;
  globalThis.caches={default:{match:async()=>cached?.clone(),put:async(key,value)=>{cached=value;}}};
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(options.headers.authorization,undefined);assert.deepEqual(JSON.parse(options.body),{action:'artwork-state'});return new Response(fail?'failure':'{"revision":1}',{status:fail?503:200});};
  const context={waitUntil:promise=>promise};
  try{
    const first=await worker.fetch(new Request('https://example.com/api/artwork/state'),{},context);assert.equal(first.headers.get('cache-control'),'public,max-age=2,must-revalidate');
    const second=await worker.fetch(new Request('https://example.com/api/artwork/state?random=2'),{},context);assert.equal(second.status,200);assert.equal(calls,1);
    cached=null;fail=true;const failed=await worker.fetch(new Request('https://example.com/api/artwork/state'),{},context);assert.equal(failed.status,503);assert.equal(cached,null);
    const asset=await worker.fetch(new Request('https://example.com/index.html'),{ASSETS:{fetch:async()=>new Response('asset')}},context);assert.equal(await asset.text(),'asset');
  }finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
});
