import * as THREE from 'three';
import {cubePoint,tileKey} from './cube.js';

// Select by projected texture density, before consulting cache or download state.
// A cache budget must never decide which half of the screen receives detail.
export function selectArtworkTiles(globe,camera,radius,height,manifest) {
  globe.updateWorldMatrix(true,false);camera.updateMatrixWorld();
  const local=globe.worldToLocal(camera.position.clone()),direction=local.clone().normalize();
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const focal=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))),leaves=[];
  const visit=(face,level,x,y)=>{
    const count=2**level,points=[],box=new THREE.Box3();let facing=-Infinity,nearest=Infinity;
    for(let j=0;j<=4;j++)for(let i=0;i<=4;i++){
      const p=new THREE.Vector3(...cubePoint(face,(x+i/4)/count*2-1,1-(y+j/4)/count*2));
      facing=Math.max(facing,p.dot(direction));p.multiplyScalar(radius);nearest=Math.min(nearest,p.distanceTo(local));
      points.push(p);box.expandByPoint(p.clone().applyMatrix4(globe.matrixWorld));
    }
    const padding=radius/(count*count*16);
    box.expandByScalar(padding);
    if(facing+padding/radius<radius/local.length()||!frustum.intersectsBox(box))return;
    let edge=0;
    for(let i=0;i<4;i++)edge=Math.max(edge,points[12].distanceTo(points[[10,14,2,22][i]])*2);
    const pixels=edge*focal/Math.max(.01,nearest-padding);
    if(level<manifest.maxLevel&&pixels>manifest.tileSize*.8){
      for(let j=0;j<2;j++)for(let i=0;i<2;i++)visit(face,level+1,x*2+i,y*2+j);
    }else leaves.push({key:tileKey(face,level,x,y),face,level,x,y,pixels});
  };
  for(let face=0;face<6;face++)visit(face,0,0,0);
  return leaves.sort((a,b)=>b.pixels-a.pixels);
}
