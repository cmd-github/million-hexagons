import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
const mode=process.argv[2]||'sample',maxLevel=Number(process.env.ARTWORK_LEVEL||'5'),size=512,gutter=2;
if(!['sample','million'].includes(mode))throw Error('Use sample or million');
const base=`public/artwork/${mode==='sample'?'sample-hq':mode}`,executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
await fs.mkdir(base,{recursive:true});
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--js-flags=--max-old-space-size=6144']});
const write=async(face,level,x,y,buffer)=>{const file=`${base}/${face}/${level}/${x}/${y}.webp`;await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,buffer);};
let files=0;
try {
  const page=await browser.newPage();page.on('pageerror',e=>console.error(e.stack));page.on('requestfailed',r=>console.error(r.url(),r.failure()));
  await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
  await page.goto(`${process.env.SMOKE_URL||'http://127.0.0.1:4180'}/scripts/artwork-baker.html?mode=${mode}`);
  await page.waitForFunction(()=>window.baker,null,{timeout:180000});
  const blockLevel=Math.max(0,maxLevel-2),perBlock=2**(maxLevel-blockLevel),blockSize=size*perBlock;
  for(let face=0;face<6;face++) {
    for(let y=0;y<2**blockLevel;y++)for(let x=0;x<2**blockLevel;x++) {
      if(Array.from({length:perBlock*perBlock},(_,i)=>existsSync(`${base}/${face}/${maxLevel}/${x*perBlock+i%perBlock}/${y*perBlock+Math.floor(i/perBlock)}.webp`)).every(Boolean)){files+=perBlock*perBlock;continue;}
      const data=await page.evaluate(({face,level,x,y,size,gutter})=>baker.capture(face,level,x,y,size,gutter),{face,level:blockLevel,x,y,size:blockSize,gutter});
      const buffer=Buffer.from(data,'base64');
      await Promise.all(Array.from({length:perBlock*perBlock},async(_,i)=>{
        const dx=i%perBlock,dy=Math.floor(i/perBlock),tile=await sharp(buffer).extract({left:dx*size,top:dy*size,width:size+gutter*2,height:size+gutter*2}).webp(mode==='sample'?{lossless:true}:{quality:92,alphaQuality:100}).toBuffer();
        await write(face,maxLevel,x*perBlock+dx,y*perBlock+dy,tile);files++;
      }));
    }
    for(let level=maxLevel-1;level>=0;level--)for(let y=0;y<2**level;y++)for(let x=0;x<2**level;x++) {
      if(existsSync(`${base}/${face}/${level}/${x}/${y}.webp`)){files++;continue;}
      const pieces=await Promise.all([0,1,2,3].map(async i=>({input:await sharp(`${base}/${face}/${level+1}/${x*2+i%2}/${y*2+Math.floor(i/2)}.webp`).extract({left:gutter,top:gutter,width:size,height:size}).toBuffer(),left:(i%2)*size,top:Math.floor(i/2)*size})));
      const combined=await sharp({create:{width:size*2,height:size*2,channels:4,background:'#00000000'}}).composite(pieces).png().toBuffer();
      const tile=await sharp(combined).resize(size,size).extend({top:gutter,bottom:gutter,left:gutter,right:gutter,extendWith:'copy'}).webp(mode==='sample'?{lossless:true}:{quality:92,alphaQuality:100}).toBuffer();
      await write(face,level,x,y,tile);files++;
    }
    console.log(`${mode}: face ${face+1}/6, ${files} tiles`);
  }
  await fs.writeFile(`${base}/manifest.json`,JSON.stringify({version:1,tileSize:size,gutter,maxLevel,inventory:mode==='million'?1000000:344500,fixture:mode==='million'?'one distinct synthetic 20-bit mark per real cell':null,projection:'cube-gnomonic',files},null,2)+'\n');
} finally {await browser.close();}
