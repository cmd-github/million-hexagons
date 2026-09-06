import * as THREE from 'three';

// One bounded merged patch, rebuilt only when the camera leaves its cached area.
// Polygon corner positions are shared with picking and placement geometry.
export function createCellDetail(topology, globe, radius, textures, selectionMode, hover) {
  const material = new THREE.ShaderMaterial({
    uniforms: { occupancyMap: { value: textures.occupancy }, selectionMap: { value: textures.selection }, selectionMode, hover, visibility: { value: 0 }, patchDirection: { value: new THREE.Vector3() }, patchCosines: { value: new THREE.Vector2() } },
    vertexShader: `attribute float cellId; attribute float edge; varying float vId; varying float vEdge; varying vec3 vPoint;
      void main(){ vId=cellId; vEdge=edge; vPoint=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D occupancyMap; uniform sampler2D selectionMap;
      uniform float selectionMode; uniform float hover; uniform float visibility; varying float vId; varying float vEdge;
      uniform vec3 patchDirection; uniform vec2 patchCosines; varying vec3 vPoint;
      void main(){ float id=floor(vId+.5); vec2 uv=(vec2(mod(id,1024.0),floor(id/1024.0))+.5)/vec2(1024.0,977.0);
        vec4 selected=texture2D(selectionMap,uv);
        float occupied=texture2D(occupancyMap,uv).r;
        float border=1.0-smoothstep(0.0,max(fwidth(vEdge)*1.1,.0001),vEdge);
        vec3 line=mix(vec3(.07,.23,.29),vec3(.28,.65,.72),selectionMode);
        if(abs(id-hover)<.25) line=vec3(.8,1.,.3);
        if(selected.a>.5) line=vec3(.45,.8,1.);
        float artwork=max(occupied,step(.5,selected.a));
        float patchFade=smoothstep(patchCosines.x,patchCosines.y,dot(normalize(vPoint),patchDirection));
        // Only outlines fade in: never replace the background with an opaque
        // circular patch as geometry becomes available.
        gl_FragColor=vec4(line,visibility*patchFade*border*mix(.48,.22,artwork));
        #include <colorspace_fragment>
      }`, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material); mesh.renderOrder = 7; globe.add(mesh);
  let previous = new THREE.Vector3(99, 99, 99), lastTime = 0, previousCap = 0;
  let job=null;
  let lastFrame=null,opacity=0,reveal=0,hasGeometry=false;
  function* build(direction,cap) {
    const origin = topology.pick(direction.toArray());
      const cosine = Math.cos(cap), queue = [origin], visited = new Set(queue), cells = [];
      for (let i = 0; i < queue.length; i++) {
        if(i%256===0)yield;
        const id = queue[i], p = topology.centre(id);
        if (p[0] * direction.x + p[1] * direction.y + p[2] * direction.z < cosine) continue;
        cells.push(id);
        for (const neighbour of topology.neighboursOf(id)) if (!visited.has(neighbour)) { visited.add(neighbour); queue.push(neighbour); }
      }
      const positions = new Float32Array(cells.length * 18 * 3), ids = new Float32Array(cells.length * 18), edges = new Float32Array(cells.length * 18);
      let cursor = 0;
      let processed=0;
      for (const id of cells) {
        if(processed++%128===0)yield;
        const degree=topology.degrees[id-1],start=(id-1)*6;
        for (let k = 0; k < degree; k++) {
          for(let corner=0;corner<3;corner++) {
            const source=corner===0?topology.centres:topology.vertices;
            const offset=corner===0?(id-1)*3:topology.rings[start+(k+corner-1)%degree]*3;
            positions[cursor*3]=source[offset]*(radius+.0009);positions[cursor*3+1]=source[offset+1]*(radius+.0009);positions[cursor*3+2]=source[offset+2]*(radius+.0009);
            ids[cursor]=id-1;edges[cursor]=corner===0?1:0;cursor++;
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('cellId', new THREE.BufferAttribute(ids, 1));
      geometry.setAttribute('edge', new THREE.BufferAttribute(edges, 1));
      geometry.setDrawRange(0,cursor);
      return geometry;
  }
  return {
    mesh,
    update(camera, height, time) {
      const dt=lastFrame===null?0:Math.min(.1,(time-lastFrame)/1000);lastFrame=time;
      if(job) {
        const deadline=performance.now()+2;
        while(performance.now()<deadline) {
          const result=job.iterator.next();
          if(result.done) {
            if(!hasGeometry){hasGeometry=true;reveal=0;}
            mesh.geometry.dispose();mesh.geometry=result.value;
            previous.copy(job.direction);previousCap=job.cap;
            material.uniforms.patchDirection.value.copy(previous);
            material.uniforms.patchCosines.value.set(Math.cos(previousCap),Math.cos(previousCap*.8));
            job=null;break;
          }
        }
      }
      const distance = camera.position.length() - radius;
      const pixels = height * .0038 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance);
      const visible = THREE.MathUtils.smoothstep(pixels, 1.5, 8);
      opacity+=(visible-opacity)*(1-Math.exp(-dt/ .3));
      if(hasGeometry)reveal=Math.min(1,reveal+dt/.8);
      mesh.visible = hasGeometry&&opacity>.001;
      material.uniforms.visibility.value = opacity*THREE.MathUtils.smoothstep(reveal,0,1);
      // Prepare the bounded patch before its outlines become noticeable.
      if (pixels<1.1&&opacity<.001) return;
      const direction = globe.worldToLocal(camera.position.clone()).normalize();
      const cap = Math.min(.32, Math.max(.055, distance / radius * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(camera.aspect, 1) * 1.9));
      if(job)return;
      if ((direction.distanceToSquared(previous) < .0003 && Math.abs(cap - previousCap) < .008) || time - lastTime < 140) return;
      lastTime = time;
      job = {iterator:build(direction.clone(),cap),direction:direction.clone(),cap};
    },
  };
}
