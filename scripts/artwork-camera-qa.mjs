import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[];
fs.mkdirSync('artifacts/artwork-camera',{recursive:true});
const source=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"><rect width="800" height="200" fill="white"/><rect width="55" height="55" fill="red"/><rect x="745" width="55" height="55" fill="lime"/><rect y="145" width="55" height="55" fill="blue"/><rect x="745" y="145" width="55" height="55" fill="magenta"/><text x="400" y="125" text-anchor="middle" font-size="68" font-family="sans-serif" fill="#112233">ORBIT</text></svg>');
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4180/?geodesicQA');await page.waitForFunction(()=>window.geodesicQA);
 await page.locator('#claimButton').click();await page.locator('#designStep').waitFor({state:'visible'});
 await page.locator('#logoUpload').setInputFiles({name:'small.png',mimeType:'image/png',buffer:await sharp({create:{width:32,height:32,channels:4,background:'#d7ff55'}}).png().toBuffer()});await page.locator('#artworkQuality').waitFor({state:'visible'});
 await page.locator('#logoUpload').setInputFiles({name:'orbit.svg',mimeType:'image/svg+xml',buffer:source});await page.locator('#artworkQuality').waitFor({state:'hidden'});
 await page.locator('#hexAmount').fill('50');await page.locator('#brandColor').fill('#112233');await page.locator('#brandColor').dispatchEvent('input');
 for(const angle of [37,90,143]){
  await page.locator('#moveImageMode').click();await page.locator('#logoOrientation').fill(String(angle));await page.locator('#logoScale').fill('100');await page.waitForTimeout(150);
  await page.locator('#toPlacement').click();await page.locator('#toReview').click();
  const counts=await page.locator('#reviewCanvas').evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,counts=[0,0,0,0];for(let i=0;i<data.length;i+=4){const [r,g,b]=data.slice(i,i+3);if(r>190&&g<70&&b<70)counts[0]++;if(g>190&&r<70&&b<70)counts[1]++;if(b>190&&r<70&&g<70)counts[2]++;if(r>190&&b>190&&g<70)counts[3]++;}return counts;});assert.ok(counts.every(n=>n>3),JSON.stringify({mobile,angle,counts}));
  await page.screenshot({path:`artifacts/artwork-camera/${mobile}-${angle}.png`});await page.locator('#reviewEditDesign').click();
 }
 await page.locator('#closeBuy').click();await page.locator('#homeView').click();await page.waitForTimeout(1500);
 await page.locator('#toggleHexSearch').click();await page.locator('#hexSearchInput').fill('Nike');await page.locator('#companyResults button').click();await page.waitForTimeout(200);await page.mouse.click(8,100);const paused=await page.evaluate(()=>window.geodesicQA.state().camera);await page.waitForTimeout(1700);const after=await page.evaluate(()=>window.geodesicQA.state().camera);assert.ok(Math.hypot(...paused.map((v,i)=>v-after[i]))<.005,'Cancelled flight continued');
 await page.locator('#toggleHexSearch').click();await page.locator('#hexSearchInput').fill('Nike');await page.locator('#companyResults button').click();await page.waitForTimeout(1800);await page.locator('#placementInspector').waitFor({state:'visible'});
 if(mobile){const id=Number((await page.locator('#inspectorHex').textContent()).replace(/[^0-9]/g,'')),point=await page.evaluate(id=>window.geodesicQA.screen(id),id),hud=await page.locator('#placementInspector').boundingBox();assert.ok(point.y<hud.y-30&&point.y>230);}
 await page.screenshot({path:`artifacts/artwork-camera/${mobile}-arrival.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#homeView').click();assert.equal(await page.locator('#rotationToggle').getAttribute('aria-pressed'),'false');
 await page.close();
}assert.deepEqual(errors,[]);console.log('Rotated artwork retains all four corners; upload warning, mobile framing, interruption and reduced motion passed.');}finally{await browser.close();}
