import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const label=process.env.MH_GRID_LABEL||'after',output=`artifacts/zoom-grid/${label}`;await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[];
try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1250000,uploadThroughput:250000});if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>{performanceQA.focus([0,0,1],2);window.gridStarted=performance.now();window.gridFirst=null;function sample(){const state=performanceQA.state();if(window.gridFirst===null&&state.detailVertices>0&&state.detailOpacity>.35)window.gridFirst=performance.now()-window.gridStarted;requestAnimationFrame(sample);}sample();});
  const rect=await page.locator('#world').boundingBox();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.6);
  for(let i=0;i<7;i++){await page.mouse.wheel(0,-250);await page.waitForTimeout(100);}
  await page.waitForFunction(()=>window.gridFirst!==null,{timeout:30000});
  const firstMs=await page.evaluate(()=>window.gridFirst);await page.waitForTimeout(800);await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-zoom.png`});
  const state=await page.evaluate(()=>performanceQA.state());assert.ok(state.detailVertices>0);assert.ok(state.regions.loadedCells<100000);assert.deepEqual(errors,[]);
  if(label!=='baseline')assert.equal(await page.locator('#artworkLoadingStatus').isVisible(),false);
  report.push({mobile,firstMs,...state});await context.close();
}}finally{await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
