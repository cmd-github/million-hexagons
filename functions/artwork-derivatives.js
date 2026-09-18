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

function xml(value){return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));}
export async function openGraphCard(bytes,record={}){
  const title=String(record.title||'A new place').replace(/\s+/g,' ').trim().slice(0,42),count=Math.max(1,Number(record.cellCount)||1),anchor=Math.max(1,Number(record.anchor)||1);
  const artwork=await sharp(bytes,{limitInputPixels:40_000_000,animated:false,failOn:'warning'}).rotate().resize(330,286,{fit:'cover'}).composite([{input:Buffer.from('<svg width="330" height="286"><polygon points="82,1 248,1 329,143 248,285 82,285 1,143" fill="white"/></svg>'),blend:'dest-in'}]).webp({quality:92,alphaQuality:100}).toBuffer();
  const background=Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g"><stop stop-color="#143944"/><stop offset="1" stop-color="#07151e"/></radialGradient><pattern id="h" width="58" height="50" patternUnits="userSpaceOnUse"><path d="M14 1h29l14 24-14 24H14L1 25z" fill="none" stroke="#d5fa77" stroke-opacity=".18" stroke-width="2"/></pattern></defs><rect width="1200" height="630" fill="#050b14"/><circle cx="945" cy="315" r="250" fill="url(#g)"/><circle cx="945" cy="315" r="245" fill="url(#h)"/><text x="62" y="72" fill="#d5fa77" font-family="monospace" font-size="20" font-weight="600" letter-spacing="3">MILLION HEXAGONS</text><text x="62" y="205" fill="#d5dde7" font-family="Arial,sans-serif" font-size="52" font-weight="800">${xml(title)}</text><text x="62" y="270" fill="#d5dde7" font-family="Arial,sans-serif" font-size="52" font-weight="800">is on the globe.</text><text x="62" y="352" fill="#98adae" font-family="Arial,sans-serif" font-size="27">${count.toLocaleString('en-GB')} of 1,000,000 hexagons claimed.</text><text x="62" y="515" fill="#d5fa77" font-family="Arial,sans-serif" font-size="29" font-weight="700">See it on the globe →</text><text x="62" y="570" fill="#98adae" font-family="monospace" font-size="20">millionhexagons.com · #${anchor}</text></svg>`);
  return sharp(background).composite([{input:artwork,left:780,top:172},{input:Buffer.from('<svg width="342" height="298"><polygon points="85,3 257,3 339,149 257,295 85,295 3,149" fill="none" stroke="#d5fa77" stroke-width="7"/></svg>'),left:774,top:166}]).webp({quality:92}).toBuffer();
}
