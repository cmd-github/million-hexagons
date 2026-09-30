import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null},define:{'import.meta.env.VITE_STAGING_SANDBOX':'true','import.meta.env.VITE_STAGING_API_URL':JSON.stringify('/__qa/placements')}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});let events=0;
try{
  await page.route('**/__qa/placements',route=>{const {action}=route.request().postDataJSON();if(action==='record-event')events++;return route.fulfill({json:action==='public-list'?{placements:[]}:action==='public-stats'?{stats:{claimedCells:0,remainingCells:1000000,placements:0,views:0,clicks:0},latest:[]}:{ok:true,metrics:{views:0,clicks:0}}});});
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`;await page.goto(origin);await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});assert.equal(events,0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('mh-analytics-session')),null);
  await page.locator('#declineAnalytics').click();await page.reload();await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});assert.equal(events,0);assert.equal(await page.locator('#analyticsChoice').isHidden(),true);
  await page.waitForFunction(()=>typeof document.querySelector('#toggleAccount')?.onclick==='function',null,{timeout:90000});
  await page.locator('#toggleAccount').click();await page.locator('#accountPanel').waitFor({state:'visible'});
  await page.locator('#privacyChoices').click();await page.locator('#allowAnalytics').click();await page.reload();await page.locator('#appLoading').waitFor({state:'hidden',timeout:90000});await page.waitForFunction(()=>Boolean(sessionStorage.getItem('mh-analytics-session')));assert.ok(events>0);
  console.log(JSON.stringify({defaultOff:true,declinePersists:true,allowEnables:true}));
}finally{await page.close();await browser.close();await server.close();}
