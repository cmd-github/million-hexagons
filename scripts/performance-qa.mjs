import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const reports=[],errors=[],base=process.env.SMOKE_URL||'http://127.0.0.1:4182';
fs.mkdirSync('artifacts/performance-qa',{recursive:true});
try {
 for(const mobile of [false,true])for(const million of [false,true]) {
  if(process.env.PERF_MODE&&process.env.PERF_MODE!==(million?'million':'sample'))continue;
  if(process.env.PERF_DESKTOP&&mobile)continue;
  const name=`${mobile?'mobile':'desktop'}-${million?'million':'sample'}`;
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')errors.push(`${name}: ${m.text()}`);});
  await page.routeWebSocket(/.*/,socket=>{const server=socket.connectToServer();server.onMessage(message=>{if(!String(message).includes('full-reload')&&!String(message).includes('"type":"update"'))socket.send(message);});});
  await page.goto(base+(million?'/?millionLogos':''));
  await page.waitForFunction(()=>window.performanceQA&&performanceQA.tiles.visible>0,null,{timeout:60000});
  const firstArtworkMs=await page.evaluate(()=>performance.now());
  await page.waitForTimeout(1500);
  const cold=await page.evaluate(()=>({state:performanceQA.state(),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:r.transferSize})),heap:performance.memory?.usedJSHeapSize}));
  assert.equal(cold.state.topologyLoaded,false,'Overview should not need full topology');
  assert.ok(!cold.resources.some(r=>r.url.includes('packed.gz')));
  await page.screenshot({path:`artifacts/performance-qa/${name}-overview.png`});
  const levels=[];
  for(const altitude of [6,3,1.5,.8,.4,.22]) {
   await page.evaluate(altitude=>performanceQA.focus([0,0,1],altitude),altitude);
   await page.waitForTimeout(1800);
   const result=await page.evaluate(async()=>{
    const times=[];let last;let maxResident=0,maxVisible=0;
    await new Promise(resolve=>{function frame(now){if(last)times.push(now-last);last=now;maxResident=Math.max(maxResident,performanceQA.tiles.resident);maxVisible=Math.max(maxVisible,performanceQA.tiles.visible);if(times.length<90)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    times.sort((a,b)=>a-b);return{...performanceQA.state(),median:times[45],p95:times[85],maxResident,maxVisible,heap:performance.memory?.usedJSHeapSize};
   });
   assert.ok(result.maxResident<=result.tiles.capacity);assert.equal(result.tiles.fallback,0);assert.equal(result.retainedPlacements,0);
   levels.push({altitude,...result});
  }
  await page.screenshot({path:`artifacts/performance-qa/${name}-close.png`});
  const motion=await page.evaluate(async()=>{
   const times=[];let previous;let resident=0;
   await new Promise(resolve=>{let frame=0;function step(now){if(previous)times.push(now-previous);previous=now;const angle=frame/120*Math.PI*2;performanceQA.focus([Math.sin(angle),.15,Math.cos(angle)],.4);resident=Math.max(resident,performanceQA.tiles.resident);if(++frame<120)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});
   times.sort((a,b)=>a-b);return{median:times[59],p95:times[113],maxResident:resident};
  });
  assert.ok(motion.maxResident<=256);
  for(const [label,direction] of [['north',[0,1,0]],['south',[0,-1,0]],['seam',[1,0,1]]]){
   await page.evaluate(direction=>performanceQA.focus(direction,.4),direction);await page.waitForTimeout(1800);
   await page.screenshot({path:`artifacts/performance-qa/${name}-${label}.png`});
  }
  const box=await page.locator('#world').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.6,{steps:30});await page.mouse.up();
  await page.mouse.wheel(0,500);await page.waitForTimeout(600);
  const after=await page.evaluate(()=>performanceQA.state());assert.ok(after.tiles.resident<=after.tiles.capacity);
  const report={name,firstArtworkMs,coldBytes:cold.resources.reduce((s,r)=>s+r.bytes,0),coldHeap:cold.heap,levels,motion,after};reports.push(report);console.log(JSON.stringify(report));
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{fs.writeFileSync('artifacts/performance-qa/report.json',JSON.stringify({reports,errors},null,2));await browser.close();}
