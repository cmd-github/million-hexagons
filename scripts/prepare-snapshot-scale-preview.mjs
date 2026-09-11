import fs from 'node:fs/promises';
import sharp from 'sharp';

const base=process.env.MH_SCALE_ATLAS||'public/artwork/million',output='artifacts/million-preview';
const manifest=JSON.parse(await fs.readFile(`${base}/manifest.json`,'utf8'));
await fs.mkdir(`${output}/preview`,{recursive:true});
for(let face=0;face<6;face++)await sharp(`${base}/${face}/0/0/0.webp`).extract({left:manifest.gutter,top:manifest.gutter,width:manifest.tileSize,height:manifest.tileSize}).resize(128,128).extend({top:manifest.gutter,bottom:manifest.gutter,left:manifest.gutter,right:manifest.gutter,extendWith:'copy'}).webp({quality:90,alphaQuality:100}).toFile(`${output}/preview/${face}.webp`);
await fs.writeFile(`${output}/manifest.json`,JSON.stringify({...manifest,previewTileSize:128}));
