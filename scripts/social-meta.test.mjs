import test from 'node:test';
import assert from 'node:assert/strict';
import {injectPlacementMetadata,placementIdFromPath,placementMetadata} from '../deploy/social-meta.js';

const id='12345678-1234-1234-1234-123456789abc',origin='https://millionhexagons.com';
test('recognises only permanent placement paths',()=>{
  assert.equal(placementIdFromPath(`/placement/${id}`),id);
  assert.equal(placementIdFromPath(`/placement/${id}/`),id);
  assert.equal(placementIdFromPath('/placement/not-an-id'),'');
});
test('builds bounded placement-specific metadata with an image fallback',()=>{
  const meta=placementMetadata({placementId:id,title:'North & South',description:'A permanent place.',cellCount:12,anchor:42,openGraphImageUrl:'https://assets.example/og.webp'},origin);
  assert.equal(meta.canonical,`${origin}/placement/${id}`);
  assert.equal(meta.image,'https://assets.example/og.webp');
  const html=injectPlacementMetadata('<html><head><title>Old</title><meta name="description" content="old" /><meta property="og:title" content="old" /><meta property="og:description" content="old" /><meta property="og:type" content="website" /><meta property="og:image" content="/fallback" /><meta name="twitter:card" content="summary_large_image" /></head></html>',{placementId:id,title:'North & South',description:'A permanent place.',cellCount:12,anchor:42,openGraphImageUrl:'https://assets.example/og.webp'},origin);
  assert.match(html,/<title>North &amp; South on Million Hexagons<\/title>/);
  assert.match(html,new RegExp(`rel="canonical" href="${origin}/placement/${id}"`));
  assert.match(html,/property="og:image" content="https:\/\/assets\.example\/og\.webp"/);
  assert.match(html,/property="og:image:width" content="1200"/);
  assert.match(html,/name="twitter:title" content="North &amp; South on Million Hexagons"/);
});
