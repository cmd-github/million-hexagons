import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const baseline=process.env.MH_GRID_LABEL==='baseline',output=`artifacts/grid-coverage/${baseline?'baseline':'after'}`;
await fs.mkdir(output,{recursive:true});
const old=baseline?execFileSync('git',['show','74900c6f:src/globe/detail.js'],{encoding:'utf8'}).replace('    mesh,','    mesh, material, get stats(){return {vertices:mesh.geometry.attributes.position?.count||0};},'):null;
const server=await createServer({plugins:baseline?[{name:'baseline-grid',enforce:'pre',load(id){if(id.replaceAll('\\','/').endsWith('/src/globe/detail.js'))return old;}}]:[],server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[];
try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1250000,uploadThroughput:250000});if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>{window.framesQA=[];let last=performance.now();function frame(now){framesQA.push(now-last);last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);});
  for(const [name,direction,altitude]of [['mid',[0,0,1],1.5],['close',[0,0,1],.5],['seam',[1,0,1],.7],['return',[0,0,1],.5]]){
    await page.evaluate(({direction,altitude})=>{performanceQA.focus(direction,altitude);window.coverageStart=performance.now();window.fullGridMs=null;window.firstGridMs=null;framesQA.length=0;
      function sample(){const s=performanceQA.state();if(firstGridMs===null&&s.detailVertices>0&&s.detailOpacity>.1)firstGridMs=performance.now()-coverageStart;if(performance.now()-coverageStart>120&&s.grid?.wanted>0&&s.grid.ready===s.grid.wanted){fullGridMs=performance.now()-coverageStart;return;}requestAnimationFrame(sample);}requestAnimationFrame(sample);
    },{direction,altitude});
    await page.waitForTimeout(120);
    if(!baseline)await page.waitForFunction(()=>fullGridMs!==null,null,{timeout:60000});else await page.waitForTimeout(8000);
    await page.waitForTimeout(500);await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${name}.png`});
    const result=await page.evaluate(()=>{const f=framesQA.slice().sort((a,b)=>a-b);return {...performanceQA.state(),firstGridMs,fullGridMs,loadingFrameP95:f[Math.floor(f.length*.95)]};});
    await page.evaluate(()=>framesQA.length=0);await page.waitForTimeout(2000);
    result.settledFrameP95=await page.evaluate(()=>{const f=framesQA.slice().sort((a,b)=>a-b);return f[Math.floor(f.length*.95)];});
    if(!baseline){assert.equal(result.grid.ready,result.grid.wanted);assert.ok(result.grid.bytes<80*1024*1024);}
    report.push({mobile,name,...result});console.log(JSON.stringify(report.at(-1)));
  }
  assert.deepEqual(errors,[]);await context.close();
}}finally{await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
