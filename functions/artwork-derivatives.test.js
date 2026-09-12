import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {artworkDerivatives,validateArtworkImage} from './artwork-derivatives.js';
test('publication decodes input and keeps full source resolution with bounded derivatives',async()=>{
  const source=await sharp({create:{width:1600,height:800,channels:4,background:'#12345680'}}).png().toBuffer(),result=await artworkDerivatives(source);
  assert.equal((await sharp(result.canonical).metadata()).width,1600);
  assert.equal((await sharp(result.thumbnail).metadata()).width,256);
  assert.equal((await sharp(result.overview).metadata()).width,1024);
  const raw=await sharp(result.canonical).raw().toBuffer();assert.equal(raw[3],128);
  await assert.rejects(artworkDerivatives(Buffer.from('not a PNG')));
  await assert.rejects(validateArtworkImage(source,'image/webp'),/format-mismatch/);
  await validateArtworkImage(source,'image/png');
});
