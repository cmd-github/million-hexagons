import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { fetchRuntimeGzip, fetchRuntimeJson } from '../src/runtime-assets.js';
import { assetOrigin } from './deployment-assets.mjs';
import { sha256 } from './deployment-assets.mjs';
import { verifyPublic, concurrent } from './staging-release.mjs';

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
