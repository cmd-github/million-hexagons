import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {rotatedImageBox,containRotatedImage} from '../src/placements/artwork-fit.js';
import {placementPose,createCameraFlight} from '../src/globe/camera-flight.js';
test('rotated wide and portrait artwork remains contained at arbitrary angles',()=>{
 for(const [w,h] of [[800,200],[200,800],[512,512]])for(let degrees=-180;degrees<=180;degrees+=7){
  const fitted=containRotatedImage(w,h,170,93,degrees),bound=rotatedImageBox(fitted.width,fitted.height,degrees);
  assert.ok(bound.width<=170+1e-8&&bound.height<=93+1e-8);assert.ok(Math.abs(fitted.width/fitted.height-w/h)<1e-8);
 }
});
test('mobile framing leaves space beneath complete artwork for the HUD',()=>{
 const camera=new THREE.PerspectiveCamera(45,390/544,.01,100),frame={east:[1,0,0],north:[0,1,0],normal:[0,0,1]};
 for(const angle of [.005,.06,.16]){
  const pose=placementPose(frame,camera,4,angle,{mobile:true});camera.position.copy(pose.position);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  for(let i=0;i<100;i++){const t=i/100*Math.PI*2,p=new THREE.Vector3(Math.sin(angle)*Math.cos(t),Math.sin(angle)*Math.sin(t),Math.cos(angle)).multiplyScalar(4).applyQuaternion(pose.quaternion).project(camera);assert.ok(Math.abs(p.x)<.95&&p.y<.95&&p.y>-.3,JSON.stringify(p));}
 }
});
test('flights arrive exactly, cancel without snapping, and respect reduced motion',()=>{
 const camera=new THREE.PerspectiveCamera(),globe=new THREE.Group(),controls={enableDamping:true,autoRotate:true,update(){}};
 camera.position.set(0,0,10);const flight=createCameraFlight(camera,globe,controls),to=new THREE.Vector3(0,0,5);let arrived=0;
 flight.start({position:to,duration:1000,onComplete(){arrived++;}});flight.update(performance.now()+450);assert.ok(camera.position.z>5&&camera.position.z<10);
 flight.cancel();const position=camera.position.clone();flight.update(performance.now()+2000);assert.deepEqual(camera.position,position);assert.equal(arrived,0);assert.equal(controls.enableDamping,true);
 flight.start({position:to,duration:1000,onComplete(){arrived++;}});flight.update(performance.now()+1100);assert.equal(camera.position.z,5);assert.equal(arrived,1);
 const reduced=createCameraFlight(camera,globe,controls,()=>true);reduced.start({position:new THREE.Vector3(0,0,8),onComplete(){arrived++;}});assert.equal(camera.position.z,8);assert.equal(reduced.active,false);assert.equal(arrived,2);
});
