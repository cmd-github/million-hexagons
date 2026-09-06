import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.SMOKE_URL||'http://127.0.0.1:4184';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const errors=[],reports=[];
fs.mkdirSync('artifacts/artwork-quality',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 if(!process.env.QUALITY_SAMPLE_ONLY){
 await page.goto(base+'/?millionLogos');await page.waitForFunction(()=>window.performanceQA);
 for(const [label,direction,altitude] of [['seam',[1,.2,-1],2],['close',[1,.2,-1],.4]]){
  await page.evaluate(({direction,altitude})=>performanceQA.focus(direction,altitude),{direction,altitude});
  await page.waitForTimeout(300);
  await page.waitForFunction(()=>performanceQA.tiles.fallback===0&&performanceQA.tiles.pending===0,null,{timeout:30000});
  const state=await page.evaluate(()=>performanceQA.state());assert.ok(state.tiles.resident<=128);reports.push({label,...state});
  await page.screenshot({path:`artifacts/artwork-quality/million-${label}.png`});
 }
 }
 if(!process.env.QUALITY_MILLION_ONLY){
  await page.goto(base+'/?geodesicQA');await page.waitForFunction(()=>window.geodesicQA,null,{timeout:60000});
  const catalogue=JSON.parse(fs.readFileSync('public/topology/samples-v1.json','utf8'));
  await page.evaluate(id=>geodesicQA.focus(id,2),catalogue.samples[2].anchor);
  await page.waitForTimeout(500);await page.waitForFunction(()=>performanceQA.tiles.fallback===0&&performanceQA.tiles.pending===0,null,{timeout:30000});
  await page.screenshot({path:'artifacts/artwork-quality/sample-logo.png'});reports.push({label:'sample',...await page.evaluate(()=>performanceQA.state())});
 }
 assert.deepEqual(errors,[]);
}finally{fs.writeFileSync('artifacts/artwork-quality/report.json',JSON.stringify({reports,errors},null,2));await browser.close();}
console.log(JSON.stringify(reports));
