import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {createHash} from 'node:crypto';
import { fetchRuntimeGzip, fetchRuntimeJson, fetchGzipUrl } from '../src/runtime-assets.js';
import { assetOrigin } from './deployment-assets.mjs';
import { sha256 } from './deployment-assets.mjs';
import { verifyPublic, concurrent } from './staging-release.mjs';

function mockCacheStorage(t,value){
  const previous=Object.getOwnPropertyDescriptor(globalThis,'caches');
  Object.defineProperty(globalThis,'caches',{value,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'caches',previous);else delete globalThis.caches;});
}

test('gzip assets decode with raw, browser-decoded and CORS-hidden encoding headers', async t => {
  const source = new Uint8Array([0, 1, 255, 10, 24]);
  for (const [bytes, headers] of [[gzipSync(source), {}], [source, { 'Content-Encoding': 'gzip' }], [source, {}]]) {
    t.mock.method(globalThis, 'fetch', async () => new Response(bytes, { headers }));
    assert.deepEqual(await fetchRuntimeGzip('fixture.gz'), source);
    t.mock.restoreAll();
  }
});
test('missing JSON and binary assets reject instead of accepting an HTML fallback', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('missing', { status: 404 }));
  await assert.rejects(fetchRuntimeGzip('missing.gz'), /unavailable/);
  await assert.rejects(fetchRuntimeJson('missing.json'), /unavailable/);
});

test('immutable topology is cached across loads and old releases are removed', async t => {
  const source=new Uint8Array([1,2,3,4]),stored=new Map();let requests=0;
  const cache={match:async url=>stored.get(url)?.clone(),put:async(url,response)=>stored.set(url,response),keys:async()=>[...stored.keys()].map(url=>({url})),delete:async key=>stored.delete(typeof key==='string'?key:key.url)};
  mockCacheStorage(t,{open:async()=>cache});
  t.mock.method(globalThis,'fetch',async()=>{requests++;return new Response(gzipSync(source));});
  const first=`https://assets.example/releases/${'a'.repeat(64)}/topology.gz`,second=first.replace('a'.repeat(64),'b'.repeat(64));
  for(let i=0;i<2;i++)assert.deepEqual(await fetchGzipUrl(first,{persistent:true,expectedBytes:4}),source);
  assert.equal(requests,1);
  await fetchGzipUrl(second,{persistent:true,expectedBytes:4});assert.deepEqual([...stored.keys()],[second]);
  stored.set(second,new Response(gzipSync(new Uint8Array([1]))));
  assert.deepEqual(await fetchGzipUrl(second,{persistent:true,expectedBytes:4}),source);assert.equal(requests,3);
});

test('storage denial falls back to the network and mutable URLs are never persisted', async t => {
  let opens=0;mockCacheStorage(t,{open:async()=>{opens++;throw Error('Storage denied');}});
  t.mock.method(globalThis,'fetch',async()=>new Response(gzipSync(new Uint8Array([7]))));
  assert.deepEqual(await fetchGzipUrl(`https://assets.example/releases/${'a'.repeat(64)}/topology.gz`,{persistent:true,expectedBytes:1}),new Uint8Array([7]));
  await fetchGzipUrl('https://assets.example/topology.gz',{persistent:true});assert.equal(opens,1);
  await assert.rejects(fetchGzipUrl('https://assets.example/topology.gz',{expectedBytes:2}),/Incomplete topology/);
});

test('regional cache retains multiple regions, bounds the release and refetches same-length corruption', async t => {
  const source=new Uint8Array([1,2,3,4]),stored=new Map();let requests=0;
  const cache={match:async url=>stored.get(url)?.clone(),put:async(url,response)=>stored.set(url,response),keys:async()=>[...stored.keys()].map(url=>({url})),delete:async key=>stored.delete(typeof key==='string'?key:key.url)};
  mockCacheStorage(t,{open:async()=>cache});
  t.mock.method(globalThis,'fetch',async()=>{requests++;return new Response(gzipSync(source));});
  const prefix=`https://assets.example/releases/${'a'.repeat(64)}/regions/`;
  const options={persistent:true,expectedBytes:4,expectedSha256:createHash('sha256').update(source).digest('hex'),cacheGroup:'mh-regions-v1',maxEntries:2};
  for(const id of [1,2,1,3])await fetchGzipUrl(prefix+id,options);
  assert.equal(requests,3);assert.equal(stored.size,2);assert.ok(stored.has(prefix+3));
  stored.set(prefix+3,new Response(gzipSync(new Uint8Array([4,3,2,1]))));
  assert.deepEqual(await fetchGzipUrl(prefix+3,options),source);assert.equal(requests,4);
  await fetchGzipUrl(prefix.replace('a'.repeat(64),'b'.repeat(64))+1,options);assert.equal(stored.size,1);
});
test('remote asset settings reject credential URLs, insecure origins and ambiguous prefixes', () => {
  for (const value of ['', 'http://example.com', 'https://user:secret@example.com', 'https://example.com/folder', 'https://example.com/?x=1']) assert.throws(() => assetOrigin(value));
  assert.equal(assetOrigin('https://assets.example.com/'), 'https://assets.example.com');
  assert.throws(() => assetOrigin('http://127.0.0.1:4182'));
  assert.equal(assetOrigin('http://127.0.0.1:4182', true), 'http://127.0.0.1:4182');
});

test('public verification blocks corrupt objects and missing CORS before deployment', async t => {
  const bytes = Buffer.from('{"ok":true}');
  const release = { origin: 'https://assets.example.com', prefix: 'releases/test', objects: [{ path: 'test.json', sha256: sha256(bytes), contentType: 'application/json' }] };
  const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json', 'cache-control': 'public, max-age=31536000, immutable' };
  t.mock.method(globalThis, 'fetch', async () => new Response(bytes, { headers }));
  await verifyPublic(release);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => new Response('corrupt', { headers }));
  await assert.rejects(verifyPublic(release), /checksum mismatch/);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => new Response(bytes, { headers: { ...headers, 'access-control-allow-origin': '' } }));
  await assert.rejects(verifyPublic(release), /CORS|cors/);
});

test('a failed batch waits for in-flight work and does not start remaining uploads', async () => {
  const started = [], finished = [];
  await assert.rejects(concurrent([1, 2, 3, 4, 5], async value => {
    started.push(value);
    if (value === 1) throw Error('upload failed');
    await new Promise(resolve => setTimeout(resolve, 20));
    finished.push(value);
  }, 2), /upload failed/);
  assert.ok(started.length <= 2);
  assert.deepEqual(finished, started.filter(value => value !== 1));
});
