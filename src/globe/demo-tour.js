import * as THREE from 'three';
import { placementPose, cinematicEase } from './camera-flight.js';
import { setIcon } from '../icons.js';

export function createDemoTour({camera,globe,controls,radius,button,wideDistance,cancelZoom,loadStops,prepareDetail=()=>{},onStop=()=>{},timeScale=1}) {
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,loading=false,stops=null,index=0,phase=0,elapsed=0,last=0,segment=null,generation=0,batch=0;
  const normalRoute=[['travel',4],['approach',3],['hold',6],['pullback',3]];
  const detailRoute=[['travel',4],['approach',3],['hold',8],['pullback',3]];
  const overviewRoute=[['travel',7],['pass',8],['pullback',5]];
  const route=()=>stops[index].overview?overviewRoute:stops[index].detail?detailRoute:normalRoute;
  // Two icons only: start and stop. The tour can be cancelled from the moment it is pressed,
  // so loading keeps the stop icon rather than introducing a third mark, and a failure falls
  // back to start with the reason in the label where assistive tech reads it.
  const label=(message)=>{
    setIcon(button,loading||active?'tour-stop':'tour-start');
    // A ring around the stop mark shows the route is still being fetched, so the
    // press is visibly acknowledged during the wait without adding a third icon.
    if(loading)button.dataset.loading='true';else delete button.dataset.loading;
    button.setAttribute('aria-pressed',String(active));
    const text=message||(loading?'Preparing globe tour':active?'Stop globe tour':'Start globe tour');
    button.setAttribute('aria-label',text);
    button.title=text;
  };
  function stop(){generation++;active=false;loading=false;segment=null;controls.enableDamping=true;label();}
  function prepare(){
    const place=stops[index];
    const step=route()[phase][0];
    if(step==='travel'&&place.detail)prepareDetail();
    const normal=new THREE.Vector3(...place.normal);
    if(step==='hold'&&!motionPreference.matches){
      const driftAxis=new THREE.Vector3().crossVectors(Math.abs(normal.y)<.99999?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,-1),normal).normalize();
      normal.applyAxisAngle(driftAxis,THREE.MathUtils.clamp(place.offset||.012,-.018,.018));
    }
    const east=new THREE.Vector3().crossVectors(Math.abs(normal.y)<.99999?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,-1),normal).normalize();
    const north=new THREE.Vector3().crossVectors(normal,east);
    const frame={east:east.toArray(),north:north.toArray(),normal:normal.toArray()};
    const wide=step==='travel'||step==='pullback';
    const pose=placementPose(frame,camera,radius,Math.max(.012,place.angle||.012)*1.18,wide?{distance:wideDistance()}:{});
    segment={from:camera.position.clone(),to:pose.position,fromQ:globe.quaternion.clone(),toQ:pose.quaternion};
    onStop(place,step);
    button.dataset.stop=place.name;button.dataset.cell=place.id||'';button.dataset.phase=step;
  }
  async function start(){
    if(active||loading){stop();return;}
    const token=++generation;loading=true;label();
    try{
      stops=await loadStops();
      if(token!==generation)return;
      if(!stops?.length)throw Error('Empty route');
      cancelZoom();controls.autoRotate=false;controls.enableDamping=false;controls.update();
      loading=false;active=true;index=0;phase=0;elapsed=0;last=performance.now();prepare();label();
      batch=1;button.dataset.batch=String(batch);
    }catch(error){console.error('Could not start globe tour',error);if(token===generation){stop();label('Could not start the tour. Press to try again.');}}
  }
  async function replenish(){
    const token=generation;
    segment=null;
    try{
      const next=await loadStops();
      if(!active||token!==generation)return;
      if(!next?.length)throw Error('Empty route');
      stops=next;index=0;phase=0;elapsed=0;last=performance.now();batch++;button.dataset.batch=String(batch);prepare();
    }catch(error){console.error('Could not continue globe tour',error);if(token===generation)stop();}
  }
  button.addEventListener('click',start);
  // A tap or click leaves the tour running: only deliberately taking the globe
  // over ends it. That means a drag or pinch past a small threshold, a wheel or
  // pinch zoom, Escape, or the tour button itself.
  let press=null;
  const release=()=>{press=null;};
  document.addEventListener('pointerdown',event=>{press=button.contains(event.target)?null:{x:event.clientX,y:event.clientY};},{capture:true,passive:true});
  document.addEventListener('pointermove',event=>{
    if(!press||!(active||loading))return;
    if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>8){press=null;stop();}
  },{capture:true,passive:true});
  document.addEventListener('pointerup',release,{capture:true,passive:true});
  document.addEventListener('pointercancel',release,{capture:true,passive:true});
  document.addEventListener('wheel',()=>{if(active||loading)stop();},{capture:true,passive:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(active||loading))stop();});
  addEventListener('resize',()=>{if(active||loading)stop();});
  label();
  return {stop,get active(){return active;},update(time){
    if(!active||!segment)return;
    const dt=Math.min(.1,Math.max(0,(time-last)/1000));last=time;if(document.hidden)return;
    elapsed+=dt;
    const reduced=motionPreference.matches;
    const t=reduced&&route()[phase][0]!=='hold'?1:Math.min(1,elapsed/(route()[phase][1]*timeScale)),ease=cinematicEase(t);
    camera.position.lerpVectors(segment.from,segment.to,ease);globe.quaternion.slerpQuaternions(segment.fromQ,segment.toQ,ease);camera.lookAt(0,0,0);
    if(t===1){elapsed=0;phase++;if(phase===route().length){phase=0;index++;if(index===stops.length){void replenish();return;}}prepare();}
  }};
}
