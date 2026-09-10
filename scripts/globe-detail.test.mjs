import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {SphericalTopology} from '../src/globe/topology.js';
import {createCellDetail} from '../src/globe/detail.js';

test('a close zoom replaces unfinished wide geometry without waiting for its full build',async t=>{
 const bytes=await readFile(new URL('../public/topology/geodesic-v1.bin',import.meta.url));
 const manifest=JSON.parse(await readFile(new URL('../public/topology/geodesic-v1.json',import.meta.url),'utf8'));
 const topology=new SphericalTopology(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),manifest);
 const globe=new THREE.Group(),camera=new THREE.PerspectiveCamera(38,1.6,.1,100);camera.position.set(0,0,5.5);
 const detail=createCellDetail(topology,globe,4,{occupancy:null,selection:null},{value:0},{value:-2});
 // Deterministic one generator step per frame models a busy main thread.
 let clock=0;t.mock.method(performance,'now',()=>++clock);
 detail.update(camera,900,1000);camera.position.set(0,0,4.22);
 let frames=0;for(;frames<40&&!detail.mesh.geometry.attributes.position;frames++)detail.update(camera,900,1016+frames*16);
 assert.ok(detail.mesh.geometry.attributes.position,'Close geometry must not queue behind the obsolete wide patch');
 assert.ok(detail.mesh.geometry.attributes.position.count<50000,'Built patch must match the close viewport');
 detail.mesh.geometry.dispose();detail.mesh.material.dispose();
});
