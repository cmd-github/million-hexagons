import assert from'node:assert/strict';
import{existsSync}from'node:fs';
import{mkdir}from'node:fs/promises';
import{chromium}from'playwright';

const url=process.env.SMOKE_URL||'http://127.0.0.1:4174/';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
const cases=[['GB','gbp','£',false],['FR','eur','€',true],['BG','eur','€',false],['US','usd','$',false]];
await mkdir('artifacts/regional-pricing',{recursive:true});
try{
  for(const[country,region,symbol,mobile]of cases){
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
    await page.route('**/api/location',route=>route.fulfill({json:{country}}));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(expected=>document.querySelector('#regionalUnitPrice')?.textContent.startsWith(expected),symbol);
    assert.match(await page.locator('#regionalUnitPrice').textContent(),new RegExp(`^${symbol.replace('$','\\$')}1 per hexagon`));
    if(country==='GB'||country==='FR'){await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});await page.screenshot({path:`artifacts/regional-pricing/${country.toLowerCase()}-${mobile?'mobile':'desktop'}.png`,animations:'disabled'});}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
    assert.equal(await page.locator('#pricingRegion').count(),0,'the pricing region selector is no longer offered');
    await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify({countries:cases.map(([country,region])=>({country,region})),manualCorrection:false},null,2));
