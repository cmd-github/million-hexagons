import test from 'node:test';
import assert from 'node:assert/strict';
import {cataloguePage,publishedVersion,nextCatalogueCursor} from './public-catalogue.js';

test('catalogue export validates integer limits and document cursors',()=>{
  assert.deepEqual(cataloguePage(),{pageSize:1000,cursor:''});
  for(const pageSize of [0,-1,1.5,1001,'oops'])assert.throws(()=>cataloguePage({pageSize}),/invalid-page-size/);
  assert.throws(()=>cataloguePage({cursor:'../../private'}),/invalid-cursor/);
  assert.equal(cataloguePage({cursor:'12345678-1234-1234-1234-123456789abc'}).pageSize,1000);
});
test('pending edits preserve the published version and moderation rollback takes precedence',()=>{
  assert.equal(publishedVersion({currentVersion:3,currentPublishedVersion:2}),2);
  assert.equal(publishedVersion({currentVersion:3,currentPublishedVersion:2,publicState:{publicVersion:1}}),1);
  assert.equal(publishedVersion({currentVersion:1}),1);
});
test('full deleted pages still advance; a final partial or empty page terminates',()=>{
  assert.equal(nextCatalogueCursor([{id:'a',status:'deleted'},{id:'b',status:'revoked'}],2),'b');
  assert.equal(nextCatalogueCursor([{id:'c'}],2),null);
  assert.equal(nextCatalogueCursor([],2),null);
});
