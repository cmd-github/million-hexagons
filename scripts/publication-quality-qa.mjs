import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const errors=[],reports=[];
async function edgeWidth(path){const {data,info}=await sharp(path).removeAlpha().raw().toBuffer({resolveWithObject:true});const widths=[];for(let y=410;y<485;y++){let start=-1;for(let x=420;x<790;x++){const i=(y*info.width+x)*3,v=Math.min(data[i],data[i+1],data[i+2]);if(v<40)start=x;else if(v>230&&start>=0){if(x-start<20)widths.push(x-start);start=-1;}}}assert.ok(widths.length>200,'Text edge fixture was not visible');widths.sort((a,b)=>a-b);return widths[Math.floor(widths.length/2)];}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
fs.mkdirSync('artifacts/publication-quality',{recursive:true});
const label=process.env.QUALITY_LABEL||'after';
try{for(const mobile of [false,true])for(const count of (process.env.QUALITY_COUNTS||'1,50,500').split(',').map(Number)){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4180/?geodesicQA');await page.waitForFunction(()=>window.geodesicQA);
 await page.locator('#claimButton').click();await page.locator('#designStep').waitFor();
 await page.locator('#hexAmount').fill(String(count));await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Change image');
 await page.locator('#toPlacement').click();await page.locator('#toReview').click();
 const ids=await page.evaluate(()=>window.geodesicQA.state().selected),id=ids[0];assert.equal(ids.length,count);
 await page.evaluate(id=>window.geodesicQA.focus(id,.22),id);await page.waitForTimeout(1500);
 const box=await page.locator('#world').boundingBox();
 await page.locator('#world').screenshot({path:`artifacts/publication-quality/${label}-${mobile}-${count}-review.png`});
 const start=Date.now();await page.locator('#previewPurchase').click();await page.waitForFunction(()=>document.querySelector('#buyPanel').getAttribute('aria-hidden')==='true',null,{timeout:120000});
 const publicationMs=Date.now()-start;assert.deepEqual(await page.evaluate(()=>window.geodesicQA.state().committed),ids);
 await page.setViewportSize({width:Math.round(box.width),height:Math.round(box.height)+(mobile?300:0)});
 await page.evaluate(id=>window.geodesicQA.focus(id,.22),id);await page.waitForTimeout(3000);
 await page.locator('#world').screenshot({path:`artifacts/publication-quality/${label}-${mobile}-${count}-published.png`});
 const state=await page.evaluate(()=>window.geodesicQA.state());assert.equal(state.retainedPlacements,0);assert.equal(state.tiles.errors,0);assert.equal(state.tiles.fallback,0);assert.ok(state.tiles.resident<=state.tiles.capacity);const report={mobile,count,publicationMs,tiles:state.tiles};if(!mobile&&count===50){report.reviewEdge=await edgeWidth(`artifacts/publication-quality/${label}-${mobile}-${count}-review.png`);report.publishedEdge=await edgeWidth(`artifacts/publication-quality/${label}-${mobile}-${count}-published.png`);assert.ok(report.publishedEdge<=report.reviewEdge+1,JSON.stringify(report));}
 const frameTimes=await page.evaluate(async()=>{const times=[];let last;await new Promise(resolve=>{function tick(now){if(last)times.push(now-last);last=now;if(times.length<90)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});return times.sort((a,b)=>a-b);});report.medianFrameMs=frameTimes[45];report.p95FrameMs=frameTimes[85];
 const world=await page.locator('#world').boundingBox();await page.mouse.move(world.x+world.width*.5,world.y+world.height*.3);await page.mouse.down();await page.mouse.move(world.x+world.width*.7,world.y+world.height*.4,{steps:15});await page.mouse.up();await page.mouse.wheel(0,450);await page.waitForTimeout(1000);const navigated=await page.evaluate(()=>window.geodesicQA.state());assert.ok(navigated.tiles.resident<=navigated.tiles.capacity);assert.equal(navigated.retainedPlacements,0);reports.push(report);console.log(JSON.stringify(report));await page.close();
}assert.deepEqual(errors,[]);}finally{fs.writeFileSync(`artifacts/publication-quality/${label}-report.json`,JSON.stringify({reports,errors},null,2));await browser.close();}
