import * as THREE from 'three';
import {REGION_COUNT, regionBounds} from './region-format.js';

const bounds=Array.from({length:REGION_COUNT},(_,key)=>regionBounds(key));

// Conservative bounds include polygon corners across cube-region seams.
export function visibleGridRegions(camera, globe, radius, margin=1) {
  camera.updateMatrixWorld();globe.updateWorldMatrix(true,false);
  const projection=camera.projectionMatrix.clone();
  projection.elements[0]/=margin;projection.elements[5]/=margin;
  const frustum=new THREE.Frustum().setFromProjectionMatrix(projection.multiply(camera.matrixWorldInverse).multiply(globe.matrixWorld));
  const eye=globe.worldToLocal(camera.position.clone()),distance=eye.length(),direction=eye.normalize();
  const horizon=Math.acos(Math.min(1,radius/distance));
  return bounds.flatMap(({direction:p,angle},key)=>{
    const a=angle+.005,centre=new THREE.Vector3(...p),score=centre.dot(direction);
    if(score<Math.cos(horizon+a))return [];
    const sphere=new THREE.Sphere(centre.multiplyScalar(radius*Math.cos(a)),radius*Math.sin(a)+.002);
    return frustum.intersectsSphere(sphere)?[{key,score}]:[];
  }).sort((a,b)=>b.score-a.score).map(({key})=>key);
}

// Indexed centre fans retain canonical corners and IDs with seven vertices
// per hexagon instead of eighteen. Each region can be built independently.
export function* buildGridRegion(topology, cells, radius) {
  const positions=new Float32Array(cells.length*7*3),ids=new Float32Array(cells.length*7),edges=new Uint8Array(cells.length*7);
  const indices=new Uint16Array(cells.length*18);
  let vertex=0,index=0;
  for(let i=0;i<cells.length;i++){
    if(i%64===0)yield;
    const id=cells[i],polygon=topology.polygon(id),points=[topology.centre(id),...polygon],base=vertex;
    for(let k=0;k<points.length;k++,vertex++){
      for(let axis=0;axis<3;axis++)positions[vertex*3+axis]=points[k][axis]*(radius+.0009);
      ids[vertex]=id-1;edges[vertex]=k===0?1:0;
    }
    for(let k=0;k<polygon.length;k++){indices[index++]=base;indices[index++]=base+k+1;indices[index++]=base+(k+1)%polygon.length+1;}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions.subarray(0,vertex*3),3));
  geometry.setAttribute('cellId',new THREE.BufferAttribute(ids.subarray(0,vertex),1));
  geometry.setAttribute('edge',new THREE.BufferAttribute(edges.subarray(0,vertex),1));
  geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.setDrawRange(0,index);geometry.computeBoundingSphere();
  return geometry;
}

export function createCellDetail(topology, globe, radius, textures, selectionMode, hover) {
  const material=new THREE.ShaderMaterial({
    uniforms:{occupancyMap:{value:textures.occupancy},selectionMap:{value:textures.selection},selectionMode,hover,visibility:{value:0}},
    vertexShader:`attribute float cellId; attribute float edge; varying float vId; varying float vEdge;
      void main(){vId=cellId;vEdge=edge;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D occupancyMap; uniform sampler2D selectionMap;
      uniform float selectionMode; uniform float hover; uniform float visibility; varying float vId; varying float vEdge;
      void main(){float id=floor(vId+.5);vec2 uv=(vec2(mod(id,1024.0),floor(id/1024.0))+.5)/vec2(1024.0,977.0);
        vec4 selected=texture2D(selectionMap,uv);float occupied=texture2D(occupancyMap,uv).r;
        float border=1.0-smoothstep(0.0,max(fwidth(vEdge)*1.1,.0001),vEdge);
        vec3 line=mix(vec3(.07,.23,.29),vec3(.28,.65,.72),selectionMode);
        if(abs(id-hover)<.25)line=vec3(.8,1.,.3);
        if(selected.a>.5)line=vec3(.45,.8,1.);
        float artwork=max(occupied,step(.5,selected.a));
        gl_FragColor=vec4(line,visibility*border*mix(.48,.07,artwork));
        #include <colorspace_fragment>
      }`,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,
  });
  const mesh=new THREE.Group();globe.add(mesh);
  const cache=new Map(),pending=new Set(),retry=new Map();
  const stats={wanted:0,ready:0,vertices:0,retained:0,bytes:0,buildMs:0};
  let keys=[],visible=[],job=null,lastView=-Infinity,lastFrame=null,opacity=0;
  function dispose(key){const entry=cache.get(key);mesh.remove(entry.mesh);entry.mesh.geometry.dispose();cache.delete(key);}
  return {mesh,material,stats,
    update(camera,height,time){
      const dt=lastFrame===null?0:Math.min(.1,(time-lastFrame)/1000);lastFrame=time;
      const pixels=height*.0038/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(camera.position.length()-radius));
      opacity+=(THREE.MathUtils.smoothstep(pixels,1.25,4)-opacity)*(1-Math.exp(-dt/.12));
      material.uniforms.visibility.value=opacity;mesh.visible=opacity>.001;
      // Prepare before lines become noticeable, including an offscreen guard
      // band. Refresh during flights as well as at rest.
      if(time-lastView>80){
        lastView=time;
        visible=pixels>=1.05?visibleGridRegions(camera,globe,radius):[];
        keys=pixels>=1.05?visibleGridRegions(camera,globe,radius,1.12):[];
      }
      const wanted=new Set(keys),onScreen=new Set(visible);
      if(job&&!wanted.has(job.key)){job.iterator.return();job=null;}
      for(const [key,entry]of cache){entry.mesh.visible=wanted.has(key);if(entry.mesh.visible)entry.used=time;}
      // At most four requests from this renderer: old views cannot accumulate
      // a long queued download backlog during navigation.
      for(const key of [...visible,...keys]){
        if(pending.size>=4)break;
        if(cache.has(key)||topology.regions.has(key)||pending.has(key)||(retry.get(key)||0)>time)continue;
        pending.add(key);topology.loadRegion(key,10).catch(()=>retry.set(key,performance.now()+1500)).finally(()=>pending.delete(key));
      }
      const started=performance.now(),deadline=started+2;
      while(performance.now()<deadline){
        if(!job){
          const key=[...visible,...keys].find(key=>!cache.has(key)&&topology.regions.has(key));
          if(key===undefined)break;
          job={key,iterator:buildGridRegion(topology,topology.regions.get(key).ids,radius)};
        }
        if(!topology.regions.has(job.key)){job.iterator.return();job=null;break;}
        const result=job.iterator.next();
        if(result.done){const part=new THREE.Mesh(result.value,material);part.renderOrder=7;mesh.add(part);cache.set(job.key,{mesh:part,used:time});job=null;}
      }
      stats.buildMs=performance.now()-started;
      // GPU regions survive topology trimming. Retain the current view plus
      // a bounded recently seen working set for return visits.
      const limit=Math.max(128,keys.length);
      for(const [key]of [...cache].filter(([key])=>!wanted.has(key)).sort((a,b)=>a[1].used-b[1].used)){
        if(cache.size<=limit)break;dispose(key);
      }
      stats.wanted=visible.length;stats.ready=visible.filter(key=>cache.has(key)).length;stats.retained=cache.size;stats.vertices=0;stats.bytes=0;
      for(const [key,{mesh:part}]of cache){
        if(onScreen.has(key))stats.vertices+=part.geometry.attributes.position.count;
        stats.bytes+=part.geometry.index.array.byteLength+Object.values(part.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0);
      }
    },
    dispose(){job?.iterator.return();for(const key of cache.keys())dispose(key);material.dispose();globe.remove(mesh);},
  };
}
