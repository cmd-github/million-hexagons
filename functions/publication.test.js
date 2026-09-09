import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeArtworkSource, publicationObjects, sourceObjectPath } from './publication.js';

test('accepts bounded PNG and WebP sources and rejects public-unsafe input', () => {
  const source=decodeArtworkSource(`data:image/webp;base64,${Buffer.from('artwork').toString('base64')}`);
  assert.equal(source.mimeType,'image/webp');
  assert.equal(source.bytes.toString(),'artwork');
  assert.equal(source.sha256.length,64);
  assert.equal(decodeArtworkSource('data:image/svg+xml;base64,PHN2Zz4='),null);
  assert.equal(decodeArtworkSource('https://example.com/artwork.webp'),null);
  assert.equal(decodeArtworkSource(`data:image/png;base64,${Buffer.alloc(12*1024*1024+1).toString('base64')}`),null);
});

test('uses immutable placement/version object paths without owner data', () => {
  const source={extension:'webp',sha256:'abc'};
  assert.equal(sourceObjectPath('placement-1',2,'webp'),'staging-placement-sources/placement-1/v2/artwork.webp');
  const output=publicationObjects({placementId:'placement-1',version:2,topologyVersion:'geodesic-v1',anchor:42,cellCount:50,title:'Example',description:'Description',destinationUrl:'https://example.com/',source});
  assert.equal(output.artworkKey,'releases/placements/placement-1/versions/2/artwork.webp');
  assert.equal(output.metadataKey,'releases/placements/placement-1/versions/2/placement.json');
  assert.equal(JSON.stringify(output.metadata).includes('owner'),false);
  assert.equal(output.metadata.title,'Example');
});
