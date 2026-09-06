import * as THREE from 'three';

export function createDemoTour({camera,globe,controls,radius,button,wideDistance,cancelZoom,prepareDetail=()=>{}}) {
  let active=false,loading=false,stops=null,index=0,phase=0,elapsed=0,last=0,segment=null,generation=0;
  const normalRoute=[['travel',7],['approach',5],['pass',7],['pullback',5]];
  const detailRoute=[['travel',7],['approach',5],['pass',4],['dive',7],['hexagons',6],['pullback',7]];
  const route=()=>index%2===0?detailRoute:normalRoute;
  const label=()=>{
    button.textContent=loading?'…':active?'■':'✨';
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',loading?'Preparing guided globe demo':active?'Stop guided globe demo':'Play guided globe demo');
    button.title=loading?'Preparing guided globe demo':active?'Stop guided globe demo':'Play guided globe demo';
  };
  function stop(){generation++;active=false;loading=false;segment=null;controls.enableDamping=true;label();}
  function prepare(){
    const step=route()[phase][0];
    if(step==='travel'&&index%2===0)prepareDetail();
    const place=stops[index],normal=new THREE.Vector3(...place.normal);
    const east=new THREE.Vector3().crossVectors(Math.abs(normal.y)<.99999?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,-1),normal).normalize();
    const north=new THREE.Vector3().crossVectors(normal,east);
    const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(east,north,normal)).invert();
    const fov=Math.min(THREE.MathUtils.degToRad(camera.fov),2*Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
    const close=Math.min(wideDistance()*.85,Math.max(radius+.65,radius*Math.cos(place.angle)+radius*Math.sin(place.angle)/Math.tan(fov/2)*1.3));
    const detail=step==='dive'||step==='hexagons';
    const distance=detail?Math.max(controls.minDistance,radius+.24):step==='travel'||step==='pullback'?wideDistance():step==='approach'?close:Math.min(wideDistance(),close+(close-radius)*.35);
    const offset=step==='approach'?.08:step==='pass'?-.12:step==='hexagons'?.025:0;
    segment={from:camera.position.clone(),to:new THREE.Vector3(offset*(distance-radius),step==='pass'?(distance-radius)*.04:0,distance),fromQ:globe.quaternion.clone(),toQ:orientation};
    button.dataset.stop=place.name;button.dataset.phase=step;
  }
  async function start(){
    if(active||loading){stop();return;}
    const token=++generation;loading=true;label();
    try{
      if(!stops){const response=await fetch('/artwork/sample-hq/tour.json');if(!response.ok)throw Error('Route unavailable');stops=(await response.json()).stops;}
      if(token!==generation)return;
      if(!stops?.length)throw Error('Empty route');
      cancelZoom();controls.autoRotate=false;controls.enableDamping=false;controls.update();
      loading=false;active=true;index=0;phase=0;elapsed=0;last=performance.now();prepare();label();
    }catch{if(token===generation){stop();button.textContent='↻';button.setAttribute('aria-label','Retry guided globe demo');button.title='Retry guided globe demo';}}
  }
  button.addEventListener('click',start);
  document.addEventListener('pointerdown',event=>{if(!button.contains(event.target)&&(active||loading))stop();},{capture:true});
  document.addEventListener('wheel',()=>{if(active||loading)stop();},{capture:true,passive:true});
  document.addEventListener('keydown',event=>{if((event.key==='Escape'||!button.contains(event.target))&&(active||loading))stop();});
  addEventListener('resize',()=>{if(active||loading)stop();});
  label();
  return {stop,get active(){return active;},update(time){
    if(!active)return;
    const dt=Math.min(.1,Math.max(0,(time-last)/1000));last=time;if(document.hidden)return;
    elapsed+=dt;
    const t=Math.min(1,elapsed/route()[phase][1]),ease=t*t*t*(t*(t*6-15)+10);
    camera.position.lerpVectors(segment.from,segment.to,ease);globe.quaternion.slerpQuaternions(segment.fromQ,segment.toQ,ease);camera.lookAt(0,0,0);
    if(t===1){elapsed=0;phase++;if(phase===route().length){phase=0;index=(index+1)%stops.length;}prepare();}
  }};
}
