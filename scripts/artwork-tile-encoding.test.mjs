import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {encodeArtworkTile} from './artwork-tile-encoding.mjs';
test('adaptive transport preserves alpha and bounds visible pixel error',async()=>{
  const width=128,pixels=Buffer.alloc(width*width*4);
  for(let y=0;y<width;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;pixels[i]=x*2;pixels[i+1]=y*2;pixels[i+2]=(x+y)%256;pixels[i+3]=x>10&&y>10?255:0;}
  const input=await sharp(pixels,{raw:{width,height:width,channels:4}}).png().toBuffer(),encoded=await encodeArtworkTile(input),decoded=await sharp(encoded).ensureAlpha().raw().toBuffer();
  for(let i=0;i<pixels.length;i+=4){assert.equal(decoded[i+3],pixels[i+3]);if(pixels[i+3])for(let c=0;c<3;c++)assert.ok(Math.abs(decoded[i+c]-pixels[i+c])<=8);}
});
