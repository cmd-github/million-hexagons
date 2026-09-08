import * as THREE from 'three';

export const cinematicEase=t=>t*t*t*(t*(t*6-15)+10);

// Allocate poses at navigation boundaries, never in the frame loop.
export function placementPose(frame,camera,radius,angle,{mobile=false,distance}={}) {
  const half=Math.min(THREE.MathUtils.degToRad(camera.fov)/2,Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect));
  const field=half*(mobile?.52:.82);
  const fit=radius*Math.cos(angle)+radius*Math.sin(angle)/Math.tan(field);
  const depth=Math.max(radius+.4,distance??fit);
  const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...frame.east),new THREE.Vector3(...frame.north),new THREE.Vector3(...frame.normal))).invert();
  if(mobile){
    const origin=new THREE.Vector3(0,0,depth),direction=new THREE.Vector3(0,.38*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),-1).normalize();
    const point=new THREE.Ray(origin,direction).intersectSphere(new THREE.Sphere(new THREE.Vector3(),radius),new THREE.Vector3());
    if(point)orientation.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),point.normalize()));
  }
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
