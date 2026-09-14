import { chromium } from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

const base=process.env.SMOKE_URL||'http://127.0.0.1:4184';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
const report=[];
await mkdir('artifacts/globe-study-qa',{recursive:true});
try{
  for(const mobile of [false,true]){
    const name=mobile?'phone':'desktop';
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/?geodesicQA`);
    await page.waitForSelector('#world[data-ready=true][data-artwork-ready=true]',{timeout:90000});
    await page.waitForFunction(()=>window.globeStudy&&window.geodesicQA,{timeout:30000});
    const initial=await page.evaluate(()=>geodesicQA.state());
    const crop=mobile?{left:70,top:280,width:250,height:290}:{left:470,top:160,width:500,height:580};
    const blank=[];let artDifference=0;
    for(const [preset,label] of [['current','Current'],['drift','Drift'],['drape','Strata Drape'],['crisp','Strata Crisp']]){
      await page.getByRole('button',{name:label,exact:true}).click();
      assert.deepEqual(await page.evaluate(()=>globeStudy.state()),{preset,artwork:true});
      const artFile=`artifacts/globe-study-qa/${name}-${preset}-art.png`;
      await page.screenshot({path:artFile});
      await page.locator('.study-artwork').uncheck();
      assert.deepEqual(await page.evaluate(()=>globeStudy.state()),{preset,artwork:false});
      const blankFile=`artifacts/globe-study-qa/${name}-${preset}-blank.png`;
      await page.screenshot({path:blankFile});
      const [withArt,withoutArt]=await Promise.all([artFile,blankFile].map(file=>sharp(file).extract(crop).raw().toBuffer()));
      const difference=meanDifference(withArt,withoutArt);
      assert.ok(difference>.15,`${name} ${preset} did not hide visible staging artwork (${difference})`);
      artDifference=Math.max(artDifference,difference);blank.push(withoutArt);
      await page.locator('.study-artwork').check();
    }
    const differences=blank.slice(1).map(buffer=>meanDifference(blank[0],buffer));
    assert.ok(differences.every(value=>value>.5),`${name} presets are visually indistinct: ${differences}`);
    const final=await page.evaluate(()=>geodesicQA.state());
    assert.ok(Math.hypot(...initial.camera.map((value,index)=>value-final.camera[index]))<.001,'Preset switching moved the camera');
    assert.ok(Math.hypot(...initial.orientation.map((value,index)=>value-final.orientation[index]))<.001,'Preset switching rotated the globe');
    assert.equal(initial.sold,final.sold,'Visual-only artwork toggle changed inventory');
    assert.deepEqual(errors,[]);
    report.push({name,artDifference,presetDifferences:differences,claimedCells:final.sold,errors});
    await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(report,null,2));

function meanDifference(a,b){
  assert.equal(a.length,b.length);
  let total=0;for(let i=0;i<a.length;i++)total+=Math.abs(a[i]-b[i]);
  return total/a.length;
}
