import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {RegionalTopology} from '../src/globe/regional-topology.js';
import {regionForPoint} from '../src/globe/region-format.js';
import {visibleGridRegions,buildGridRegion,createCellDetail} from '../src/globe/detail.js';
const manifest=JSON.parse(fs.readFileSync('public/topology/regions-v1/manifest.json'));
const bytes=gunzipSync(fs.readFileSync('public/topology/regions-v1/index.gz'));
const index=new Uint16Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const regional=()=>new RegionalTopology(manifest,index,async path=>gunzipSync(fs.readFileSync(`public/${path}`)));

test('viewport bounds cover all ray-hit samples including corners, horizons and cube seams',()=>{
  for(const aspect of [.46,1.6,2.4])for(const altitude of [.2,.8,1.5,3.5])for(const direction of [[0,0,1],[1,1,1],[0,1,0]]){
    const camera=new THREE.PerspectiveCamera(38,aspect,.1,100),globe=new THREE.Group();
    globe.rotation.set(.3,.2,.1);camera.position.set(...direction).normalize().multiplyScalar(4+altitude);camera.lookAt(0,0,0);
    const regions=new Set(visibleGridRegions(camera,globe,4));
    for(let x=-1;x<=1;x+=.1)for(let y=-1;y<=1;y+=.1){
      const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x,y),camera);
      const hit=ray.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(),4),new THREE.Vector3());
      if(hit)assert.ok(regions.has(regionForPoint(globe.worldToLocal(hit).normalize().toArray())),`Missing viewport cell at ${aspect}, ${altitude}, ${x}, ${y}`);
    }
  }
});

test('indexed grid triangles preserve canonical hexagon and pentagon corners and cell IDs',async()=>{
  const topology=regional(),hexagon=Array.from({length:64},(_,i)=>i+1).find(id=>!manifest.pentagons.includes(id)),cells=[hexagon,...manifest.pentagons];await topology.ensureCells(cells);
  const iterator=buildGridRegion(topology,cells,4);let result;do{result=iterator.next();}while(!result.done);
  const g=result.value,p=g.attributes.position,id=g.attributes.cellId,edge=g.attributes.edge;
  let cursor=0;
  for(const cell of cells){const polygon=topology.polygon(cell),centre=topology.centre(cell);
    for(let k=0;k<polygon.length;k++)for(let j=0;j<3;j++){
      const vertex=g.index.array[cursor++],expected=j===0?centre:polygon[(k+j-1)%polygon.length];
      for(let axis=0;axis<3;axis++)assert.equal(p.array[vertex*3+axis],Math.fround(expected[axis]*4.0009));
      assert.equal(id.array[vertex],cell-1);assert.equal(edge.array[vertex],j===0?1:0);
    }
  }
  assert.equal(g.drawRange.count,cursor);g.dispose();
});

test('a stalled region does not block other visible geometry; cached views survive topology eviction',async()=>{
  const topology=regional(),camera=new THREE.PerspectiveCamera(38,1.6,.1,100),globe=new THREE.Group();
  camera.position.set(0,0,4.3);camera.lookAt(0,0,0);
  const keys=visibleGridRegions(camera,globe,4,1.12);await Promise.all(keys.slice(1).map(key=>topology.loadRegion(key)));
  topology.loadRegion=()=>new Promise(()=>{});
  const detail=createCellDetail(topology,globe,4,{occupancy:null,selection:null},{value:0},{value:-2});
  for(let frame=0;frame<80;frame++)detail.update(camera,900,frame*16,true);
  assert.ok(detail.stats.ready>0);assert.ok(detail.stats.ready<detail.stats.wanted);
  const geometries=detail.mesh.children.map(part=>part.geometry);
  topology.regions.clear();topology.generation++;
  for(let frame=80;frame<90;frame++)detail.update(camera,900,frame*16);
  assert.deepEqual(detail.mesh.children.map(part=>part.geometry),geometries);
  detail.dispose();assert.equal(globe.children.length,0);
});

test('sustained navigation completes each viewport and bounds retained GPU geometry',async()=>{
  const topology=regional(),camera=new THREE.PerspectiveCamera(38,1.6,.1,100),globe=new THREE.Group();
  const detail=createCellDetail(topology,globe,4,{occupancy:null,selection:null},{value:0},{value:-2});
  let time=0,totalBuilt=0;
  for(let view=0;view<16;view++){
    const angle=view*Math.PI/8;camera.position.set(Math.sin(angle)*5.5,0,Math.cos(angle)*5.5);camera.lookAt(0,0,0);
    // Refresh view selection before checking completion from the previous view.
    time+=100;detail.update(camera,900,time,true);
    let frames=0;
    while((detail.stats.ready!==detail.stats.wanted||detail.stats.wanted===0)&&frames++<200){
      await new Promise(resolve=>setImmediate(resolve));time+=16;detail.update(camera,900,time,true);
    }
    assert.ok(frames<200,`Viewport ${view} stalled`);assert.equal(detail.stats.ready,detail.stats.wanted);
    assert.ok(detail.stats.retained<=128);assert.ok(detail.stats.bytes<32*1024*1024);
    totalBuilt+=detail.stats.ready;
    topology.trim([],192);
  }
  assert.ok(totalBuilt>128,'Navigation must exceed the cache capacity');
  detail.dispose();
});
