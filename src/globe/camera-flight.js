import * as THREE from 'three';

export const cinematicEase=t=>t*t*t*(t*(t*6-15)+10);

// Allocate poses at navigation boundaries, never in the frame loop.
// `tangent` is the limiting tangent of the region the caller actually wants the placement to
// land in. On a full-bleed canvas that is the band left free by the floating chrome, not the
// whole viewport, so it replaces both camera.aspect and the old mobile-only shrink factor.
export function placementPose(frame,camera,radius,angle,{tangent,distance}={}) {
  const half=Math.atan(tangent??Math.min(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect));
  const field=half*.82;
  const fit=radius*Math.cos(angle)+radius*Math.sin(angle)/Math.tan(field);
  const depth=Math.max(radius+.4,distance??fit);
  // Narrow screens keep the placement dead centre. Clearing the panels is the camera view
  // offset's job in main.js resize(); shifting the look target here as well moved arrivals
  // off the top of the screen once both compensations applied.
  const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...frame.east),new THREE.Vector3(...frame.north),new THREE.Vector3(...frame.normal))).invert();
  return {position:new THREE.Vector3(0,0,depth),quaternion:orientation};
}

export function createCameraFlight(camera,globe,controls,reduceMotion=()=>false){
  let segment=null,previousDamping=true;
  function cancel(){if(!segment)return;const cancelled=segment.onCancel;segment=null;controls.enableDamping=previousDamping;cancelled();}
  return {cancel,get active(){return !!segment;},start({position,quaternion=globe.quaternion,duration=1500,onComplete=()=>{},onCancel=()=>{}}){
    cancel();previousDamping=controls.enableDamping;controls.autoRotate=false;controls.enableDamping=false;controls.update();
    segment={from:camera.position.clone(),to:position.clone(),fromQ:globe.quaternion.clone(),toQ:quaternion.clone(),began:performance.now(),duration:reduceMotion()?0:duration,onComplete,onCancel};
    if(!segment.duration)this.update(performance.now());
  },update(now){
    if(!segment)return;const t=segment.duration?Math.min(1,(now-segment.began)/segment.duration):1,e=cinematicEase(t);
    camera.position.lerpVectors(segment.from,segment.to,e);globe.quaternion.slerpQuaternions(segment.fromQ,segment.toQ,e);camera.lookAt(0,0,0);
    if(t===1){const done=segment.onComplete;segment=null;controls.enableDamping=previousDamping;done();}
  }};
}
