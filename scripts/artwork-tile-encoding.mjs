import sharp from 'sharp';

// Prefer smaller transport only when the decoded result passes a strict pixel
// error bound. Alpha remains lossless so exact footprint edges cannot erode.
export async function encodeArtworkTile(input){
  const source=await sharp(input).ensureAlpha().raw().toBuffer();
  const lossless=await sharp(input).webp({lossless:true}).toBuffer();
  const candidate=await sharp(input).webp({quality:95,alphaQuality:100,smartSubsample:true}).toBuffer();
  if(candidate.length>=lossless.length*.85)return lossless;
  const decoded=await sharp(candidate).ensureAlpha().raw().toBuffer();
  let error=0,count=0;
  for(let i=0;i<source.length;i+=4){
    if(source[i+3]!==decoded[i+3])return lossless;
    if(!source[i+3])continue;
    for(let channel=0;channel<3;channel++){const delta=Math.abs(source[i+channel]-decoded[i+channel]);if(delta>8)return lossless;error+=delta*delta;count++;}
  }
  return count&&error/count>4?lossless:candidate;
}
