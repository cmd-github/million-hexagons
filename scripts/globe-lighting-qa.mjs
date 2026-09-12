import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const output=`artifacts/globe-lighting/${process.env.MH_LIGHTING_LABEL||'after'}`;
await fs.mkdir(output,{recursive:true});
const server=process.env.MH_LIGHTING_URL?null:await createServer({server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});
if(server)await server.listen();
const url=process.env.MH_LIGHTING_URL||`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-overview.png`});
  const rect=await page.locator('#world').boundingBox();
  await page.mouse.move(rect.width*.5,rect.height*.6);await page.mouse.down();await page.mouse.move(rect.width*.75,rect.height*.45,{steps:20});await page.mouse.up();await page.waitForTimeout(1500);
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-rotated.png`});
  for(let i=0;i<12;i++){await page.locator('#zoomIn').click();await page.waitForTimeout(100);}
  await page.waitForTimeout(2000);await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-zoom.png`});
  assert.deepEqual(errors,[]);await context.close();
  console.log(`${mobile?'Mobile':'Desktop'} overview, rotation and zoom passed: ${url}`);
}}finally{await browser.close();await server?.close();}
