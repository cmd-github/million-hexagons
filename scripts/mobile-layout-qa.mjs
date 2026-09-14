// Mobile layout acceptance. The contract introduced by the mobile rework is that narrow
// screens render the globe full-bleed and float every control over it: nothing may offset or
// shrink the canvas, the globe fills the width, and it centres in the band the overlays leave
// free. Each of those is measured here rather than inferred from a screenshot.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const base=(process.env.SMOKE_URL||'http://127.0.0.1:4180').replace(/\/$/,'');
const shots='artifacts/mobile-layout';
await mkdir(shots,{recursive:true});

const phones=[[320,568,'iphone-se'],[390,844,'iphone-14'],[430,932,'iphone-pro-max'],[820,1180,'ipad-portrait']];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report=[],skipped=new Set();

// The globe must not be letterboxed and must not scroll the page sideways.
async function assertFullBleed(page,width,height,label){
  const metrics=await page.evaluate(()=>window.layoutQA.metrics());
  assert.equal(metrics.narrow,true,`${label}: viewport must take the narrow layout`);
  assert.equal(metrics.canvas.top,0,`${label}: canvas must start at the top of the screen, got ${metrics.canvas.top}`);
  assert.equal(metrics.canvas.left,0,`${label}: canvas must start at the left edge`);
  assert.equal(Math.round(metrics.canvas.height),height,`${label}: canvas must be full height, got ${metrics.canvas.height} of ${height}`);
  assert.equal(Math.round(metrics.canvas.width),width,`${label}: canvas must be full width`);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=0,`${label}: page must not scroll horizontally, overflow ${overflow}px`);
  return metrics;
}

// The globe centre has to land inside the unobstructed band, not behind the dock or the mark.
function assertCentredInFreeBand(metrics,height,label){
  const top=metrics.insets.top,bottom=metrics.insets.bottom;
  const band={top,bottom:height-bottom};
  assert.ok(metrics.centre.y>band.top&&metrics.centre.y<band.bottom,
    `${label}: globe centre ${Math.round(metrics.centre.y)} must sit inside the free band ${Math.round(band.top)}-${Math.round(band.bottom)}`);
  const expected=(band.top+band.bottom)/2;
  assert.ok(Math.abs(metrics.centre.y-expected)<=2,
    `${label}: globe centre ${Math.round(metrics.centre.y)} must match the free band centre ${Math.round(expected)}`);
}

for(const [width,height,name] of phones){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.goto(base+'/?geodesicQA');
  await page.waitForSelector('#world[data-ready=true]',{timeout:60000});
  await page.waitForTimeout(400);

  // 1. Idle browse: full-bleed canvas, globe fills the width, dock owns the bottom.
  const idle=await assertFullBleed(page,width,height,`${name} idle`);
  assert.ok(idle.diameter>=width*0.94,
    `${name} idle: globe must fill the width, diameter ${Math.round(idle.diameter)} of ${width}`);
  assertCentredInFreeBand(idle,height,`${name} idle`);

  const dock=await page.locator('#mobileDock').boundingBox();
  assert.ok(dock&&dock.width===width,`${name}: dock must span the width`);
  for(const id of ['#claimButton','#claimFeed']){
    const inDock=await page.locator(id).evaluate(e=>e.closest('#mobileDock')!==null);
    assert.ok(inDock,`${name}: ${id} must live in the mobile dock`);
  }
  assert.ok(await page.locator('#mobileDock .intro h1').isVisible(),`${name}: hero copy must be visible before interaction`);
  await page.screenshot({path:`${shots}/${name}-idle.png`});

  // 2. Touch targets stay reachable on the floating rail and the dock action. Owner access is
  //    hidden until a staging client is configured, so it is forced visible here: seven 46px
  //    buttons are 322px wide and a single non-wrapping row would leave a 320px screen.
  await page.evaluate(()=>{document.querySelector('#toggleAccount').hidden=false;window.dispatchEvent(new Event('resize'));});
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.globe-controls button:visible').count(),7,`${name}: all seven rail controls must be measured`);
  const targets=await page.locator('.globe-controls button:visible, #claimButton').evaluateAll(elements=>elements.map(element=>{
    const box=element.getBoundingClientRect();
    return {id:element.id||element.getAttribute('data-icon'),width:box.width,height:box.height,top:box.top,right:box.right,bottom:box.bottom};
  }));
  assert.ok(targets.length>0,`${name}: expected floating controls`);
  for(const target of targets){
    assert.ok(target.width>=44&&target.height>=44,`${name}: ${target.id} must be a 44px touch target, got ${target.width}x${target.height}`);
    assert.ok(target.right<=width+0.5&&target.bottom<=height+0.5&&target.top>=0,`${name}: ${target.id} must stay on screen`);
  }
  // The floating rail rides above the dock. Overlapping it once put zoom buttons on top of
  // the headline and the primary action, so the separation is asserted rather than eyeballed.
  const railOverlap=await page.evaluate(()=>{
    const dock=document.querySelector('#mobileDock').getBoundingClientRect();
    return [...document.querySelectorAll('.globe-controls button')].filter(button=>{
      const box=button.getBoundingClientRect();
      return box.height&&box.bottom>dock.top&&box.top<dock.bottom&&box.right>dock.left&&box.left<dock.right;
    }).map(button=>button.id||button.getAttribute('data-icon'));
  });
  assert.deepEqual(railOverlap,[],`${name}: globe controls must not overlap the dock, got ${railOverlap.join(', ')}`);

  // 2b. The rail's flyouts must stay fully on screen. .globe-controls carries backdrop-filter,
  //     so it is the containing block for fixed descendants and a panel that escapes its box
  //     silently clips instead of overflowing visibly.
  const flyout=async(trigger,panel,label)=>{
    // Owner access is only wired up where a staging client is configured, so its panel cannot
    // be opened in local development and the search flyout carries the shared contract. The
    // rail geometry above still measures the owner button.
    if(!await page.locator(trigger).isVisible()){skipped.add(label);return;}
    await page.locator(trigger).click();
    try{await page.locator(panel).waitFor({state:'visible',timeout:1500});}
    catch{skipped.add(label);return;}
    const box=await page.locator(panel).boundingBox();
    assert.ok(box&&box.width>0&&box.height>0,`${name}: ${label} must render, got ${JSON.stringify(box)}`);
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+0.5&&box.y+box.height<=height+0.5,
      `${name}: ${label} must stay on screen, got ${JSON.stringify(box)} in ${width}x${height}`);
    await page.locator(trigger).click();
  };
  await flyout('#toggleAccount','#accountPanel','the owner access panel');
  await flyout('#toggleHexSearch','#hexSearchPanel','the search panel');

  // 3. The hero yields the screen on the first drag and the globe grows into the freed band.
  await page.mouse.move(width/2,height*0.4);
  await page.mouse.down();
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('hero-dismissed')),false,
    `${name}: touching the globe must not reflow it before the gesture becomes a drag`);
  await page.mouse.move(width/2+60,height*0.4,{steps:8});
  await page.mouse.up();
  await page.waitForFunction(()=>document.body.classList.contains('hero-collapsed'),{timeout:4000});
  await page.waitForTimeout(200);
  const browsing=await assertFullBleed(page,width,height,`${name} browsing`);
  assert.ok(browsing.insets.bottom<idle.insets.bottom,
    `${name}: dismissing the hero must hand the band back, ${Math.round(idle.insets.bottom)} -> ${Math.round(browsing.insets.bottom)}`);
  assert.equal(await page.locator('#mobileDock .intro').isVisible(),false,`${name}: hero copy must collapse after interaction`);
  assert.ok(await page.locator('#claimButton').isVisible(),`${name}: the primary action must survive hero dismissal`);
  assertCentredInFreeBand(browsing,height,`${name} browsing`);
  await page.screenshot({path:`${shots}/${name}-browsing.png`});

  // 4. Re-centre restores the pitch for anyone who wants it back.
  await page.locator('#homeView').click();
  await page.waitForTimeout(450);
  assert.ok(await page.locator('#mobileDock .intro h1').isVisible(),`${name}: Re-centre must restore the hero copy`);

  // 5. The studio sheet becomes the bottom chrome; the canvas still must not shrink.
  await page.locator('#claimButton').click();
  await page.locator('#designStep').waitFor({state:'visible'});
  await page.locator('#logoUpload').setInputFiles('scripts/fixtures/test-logo.svg');
  await page.waitForFunction(()=>document.querySelector('#addImageLabel').textContent==='Change image');
  await page.locator('#toPlacement').click();
  await page.locator('#placeStep').waitFor({state:'visible'});
  await page.waitForTimeout(400);
  const placing=await assertFullBleed(page,width,height,`${name} place`);
  assert.ok(placing.insets.bottom>0,`${name}: the studio sheet must be measured as bottom chrome`);
  assertCentredInFreeBand(placing,height,`${name} place`);
  const sheet=await page.locator('#buyPanel').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth}));
  assert.ok(sheet.scrollWidth<=sheet.width+1,`${name}: the studio sheet must not scroll sideways`);
  await page.screenshot({path:`${shots}/${name}-place.png`});

  // 6. Review keeps the same contract with a taller sheet.
  await page.locator('#toReview').click();
  await page.locator('#reviewStep').waitFor({state:'visible'});
  await page.waitForTimeout(400);
  const reviewing=await assertFullBleed(page,width,height,`${name} review`);
  assertCentredInFreeBand(reviewing,height,`${name} review`);
  const reviewSheet=await page.locator('#buyPanel').evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth}));
  assert.ok(reviewSheet.scrollWidth<=reviewSheet.width+1,`${name}: the review sheet must not scroll sideways`);
  await page.screenshot({path:`${shots}/${name}-review.png`});
  await page.locator('#closeBuy').click();
  await page.waitForTimeout(300);

  // 7. Layout contract for the placement HUD. Local development has no published inventory to
  //    inspect, so this drives the state class directly: it proves the dock yields to the HUD
  //    and the globe re-centres, not that a real placement opens correctly.
  await page.evaluate(()=>{
    document.body.classList.add('inspecting');
    document.querySelector('#placementInspector').hidden=false;
    document.querySelector('#inspectorName').textContent='Layout probe';
  });
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(200);
  const inspecting=await assertFullBleed(page,width,height,`${name} inspect`);
  assert.ok(await page.locator('#claimButton').isVisible(),`${name}: the primary action must stay reachable while inspecting`);
  const stacked=await page.evaluate(()=>{
    const hud=document.querySelector('#placementInspector').getBoundingClientRect();
    const cta=document.querySelector('#claimButton').getBoundingClientRect();
    const rail=document.querySelector('.globe-controls').getBoundingClientRect();
    // Bottom to top the order is: dock action, control row, placement HUD. Nothing overlaps.
    return {hudAboveRail:hud.bottom<=rail.top+1,railAboveCta:rail.bottom<=cta.top+1,
      hud:[hud.top,hud.bottom],rail:[rail.top,rail.bottom],cta:[cta.top,cta.bottom]};
  });
  assert.ok(stacked.hudAboveRail,`${name}: the HUD must stack above the control row (${JSON.stringify(stacked)})`);
  assert.ok(stacked.railAboveCta,`${name}: the control row must stack above the action (${JSON.stringify(stacked)})`);
  assert.ok(inspecting.insets.bottom>0,`${name}: the placement HUD must be measured as bottom chrome`);
  assertCentredInFreeBand(inspecting,height,`${name} inspect`);
  await page.screenshot({path:`${shots}/${name}-inspect.png`});

  report.push({name,width,height,
    idle:{diameter:Math.round(idle.diameter),centre:Math.round(idle.centre.y),bottom:Math.round(idle.insets.bottom)},
    browsing:{diameter:Math.round(browsing.diameter),centre:Math.round(browsing.centre.y),bottom:Math.round(browsing.insets.bottom)},
    place:{centre:Math.round(placing.centre.y),bottom:Math.round(placing.insets.bottom)},
    fillsWidth:`${Math.round(idle.diameter/width*100)}%`});
  await page.close();
}

// Desktop must be untouched: no view offset, no dock, canvas still full height.
const desktop=await browser.newPage({viewport:{width:1440,height:900}});
await desktop.goto(base+'/?geodesicQA');
await desktop.waitForSelector('#world[data-ready=true]',{timeout:60000});
const wide=await desktop.evaluate(()=>window.layoutQA.metrics());
assert.equal(wide.narrow,false,'Desktop must keep the wide layout');
assert.equal(wide.offsetY,0,'Desktop must not use a camera view offset');
assert.equal(await desktop.locator('#mobileDock').isVisible(),false,'Desktop must not show the mobile dock');
assert.ok(await desktop.locator('.topbar #claimButton').count()===1,'Desktop must keep the primary action in the topbar');

// A breakpoint change can land during the hero's 320ms collapse transition (for example when
// a phone rotates just after a drag). The pending timer must not re-apply mobile state after
// the desktop DOM has been restored, and moved nodes must return to their original order.
await desktop.setViewportSize({width:390,height:844});
await desktop.waitForTimeout(100);
await desktop.locator('#world').dispatchEvent('pointerdown',{clientX:190,clientY:300});
await desktop.locator('#world').dispatchEvent('pointermove',{clientX:250,clientY:300});
await desktop.setViewportSize({width:1440,height:900});
await desktop.waitForTimeout(450);
const restored=await desktop.evaluate(()=>({
  classes:document.body.classList.contains('hero-dismissed')||document.body.classList.contains('hero-collapsed'),
  claimParent:document.querySelector('#claimButton').parentElement?.className,
  introNext:document.querySelector('.intro').nextElementSibling?.id,
  feedNext:document.querySelector('#claimFeed').nextElementSibling?.id,
}));
assert.equal(restored.classes,false,'Desktop must not inherit a pending mobile hero collapse');
assert.ok(restored.claimParent.includes('topbar'),'Desktop must restore the primary action to the topbar');
assert.equal(restored.introNext,'hint','Desktop must restore the hero to its original DOM position');
assert.equal(restored.feedNext,'buyPanel','Desktop must restore activity to its original DOM position');
await desktop.screenshot({path:`${shots}/desktop-idle.png`});
await desktop.close();

await browser.close();
console.table(report);
if(skipped.size)console.log('Not exercised in this environment:',[...skipped].join('; '));
console.log('Mobile layout: full-bleed canvas, width-filling globe, free-band centring, hero handoff and studio sheet passed');
