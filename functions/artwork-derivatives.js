import sharp from 'sharp';
export async function validateArtworkImage(bytes,expectedMime){
  const image=sharp(bytes,{limitInputPixels:40_000_000,animated:false,failOn:'warning'}),metadata=await image.metadata();
  if(!['png','webp'].includes(metadata.format)||!metadata.width||!metadata.height||(metadata.pages||1)!==1)throw Error('unsupported-artwork-image');
  if(expectedMime&&expectedMime!==`image/${metadata.format}`)throw Error('artwork-format-mismatch');
  await image.stats();return{width:metadata.width,height:metadata.height};
}

// Decode before publication; byte limits alone do not bound image memory.
export async function artworkDerivatives(bytes){
  const image=sharp(bytes,{limitInputPixels:40_000_000,animated:false,failOn:'warning'}),metadata=await image.metadata();
  if(!['png','webp'].includes(metadata.format)||!metadata.width||!metadata.height||(metadata.pages||1)!==1)throw Error('unsupported-artwork-image');
  const canonical=await image.clone().rotate().toColourspace('srgb').webp({lossless:true}).toBuffer();
  const thumbnail=await image.clone().rotate().resize({width:256,height:256,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').webp({quality:90,alphaQuality:100}).toBuffer();
  const overview=await image.clone().rotate().resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').webp({quality:92,alphaQuality:100}).toBuffer();
  return{canonical,thumbnail,overview,width:metadata.width,height:metadata.height};
}
