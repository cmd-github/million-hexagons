import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {closestPlacements} from '../src/placements/discovery.js';

const origin='https://million-hexagons-staging.million-hexagons.workers.dev';
const api='https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
const request=async body=>{
  const response=await fetch(api,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal(response.status,200,`${body.action} unavailable`);
  return response.json();
};
const state=await request({action:'artwork-state'});
assert.ok(state.active?.base,'An active staging snapshot is required');
const manifest=await fetch(`${state.active.base}/manifest.json`).then(response=>response.json());
const selected=(await request({action:'public-placement',placementId:manifest.latest[0].placementId})).placement;
const catalogue=[];let cursor=null;
do{
  const page=await request({action:'public-list',pageSize:1000,...(cursor?{cursor}:{})});
  catalogue.push(...page.placements);cursor=page.nextCursor||null;
}while(cursor);
const centres=new Map(catalogue.map(record=>[record.anchor,record.anchorCentre]));
assert.ok(catalogue.every(record=>Array.isArray(record.anchorCentre)&&record.anchorCentre.length===3),'Every test placement needs an anchor position');
const expected=closestPlacements(catalogue,selected,id=>centres.get(id)).map(record=>record.title);
await fs.mkdir('artifacts/snapshot-live',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[];
try{
  for(const mobile of [false,true]){
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile}),errors=[];
    let catalogueRequests=0;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/stagingPlacements',async route=>{if(route.request().postDataJSON()?.action==='public-list')catalogueRequests++;await route.continue();});
    await page.goto(`${origin}/placement/${selected.placementId}`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#world[data-artwork-ready=true]',{timeout:90000});
    await page.waitForFunction(title=>document.querySelector('#inspectorName')?.textContent===title,selected.title,{timeout:90000});
    assert.equal(catalogueRequests,0,'Direct placement link must not load the catalogue');
    await page.locator('#showNearby').click();
    await page.waitForFunction(()=>document.querySelectorAll('#nearbyPlacements button').length===3,null,{timeout:30000});
    const names=await page.locator('#nearbyPlacements button span:nth-child(2)').allTextContents();
    assert.deepEqual(names,expected,'Nearby must include older placements in true distance order');
    assert.ok(catalogueRequests>0,'Nearby must fetch the complete paged catalogue on demand');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`artifacts/snapshot-live/${mobile?'mobile':'desktop'}-nearby.png`});
    report.push({mobile,placementId:selected.placementId,nearby:names,catalogueRequests,pageErrors:errors});
    await page.close();
  }
}finally{await fs.writeFile('artifacts/snapshot-live/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
