import test from 'node:test';
import assert from 'node:assert/strict';
import {cubePoint,cubeProject} from '../src/globe/cube.js';
import {smoothZoom} from '../src/globe/zoom.js';
import * as THREE from 'three';
import {selectArtworkTiles} from '../src/globe/tile-selection.js';
test('both sides of a cube seam receive the requested pixel density',()=>{
  const globe=new THREE.Group(),camera=new THREE.PerspectiveCamera(38,1.44,.1,100);
  camera.position.set(1,.2,-1).normalize().multiplyScalar(6);camera.lookAt(0,0,0);
  const selection=selectArtworkTiles(globe,camera,4,1000,{tileSize:512,maxLevel:5});
  assert.ok(new Set(selection.map(t=>t.face)).size>=2);
  assert.ok(selection.length>36,'Regression: the old traversal budget starved half the view');
  assert.ok(selection.every(t=>t.level===5||t.pixels<=512*.8));
});
import {encodeTopology,decodeTopology} from '../src/globe/topology-codec.js';
test('topology packing preserves every bit, including lane wraparound',()=>{
  const manifest={sections:{centres:{offset:32,length:12},rings:{offset:80,length:12}}};
  const buffer=new ArrayBuffer(128),words=new Uint32Array(buffer);
  for(let i=0;i<words.length;i++)words[i]=[0,0xffffffff,0x80000000,0x3f800001,17][i%5];
  assert.deepEqual(new Uint8Array(decodeTopology(encodeTopology(buffer,manifest),manifest)),new Uint8Array(buffer));
});
test('cube tile coordinates round-trip on every face and at seams',()=>{
  for(let face=0;face<6;face++)for(const x of [-1,-.5,0,.5,1])for(const y of [-1,-.5,0,.5,1]){
    const p=cubePoint(face,x,y),q=cubeProject(face,p);assert.ok(Math.abs(q.x-x)<1e-12);assert.ok(Math.abs(q.y-y)<1e-12);assert.ok(Math.abs(Math.hypot(...p)-1)<1e-12);
  }
});
test('zoom targets change altitude smoothly and respect bounds',async()=>{
  const listeners=new Map(),canvas={addEventListener(name,fn){listeners.set(name,fn);},clientHeight:800};
  const camera=new THREE.PerspectiveCamera();camera.position.set(0,0,4.4);
  const zoom=smoothZoom(canvas,camera,{minDistance:4.22,maxDistance:20},4);
  zoom.change(.8);assert.equal(camera.position.length(),4.4);
  await new Promise(r=>setTimeout(r,25));zoom.update();assert.ok(camera.position.length()<4.4&&camera.position.length()>4.32);
  for(let i=0;i<30;i++)zoom.change(.1);await new Promise(r=>setTimeout(r,25));zoom.update();assert.ok(camera.position.length()>4.22);
  zoom.cancel();const before=camera.position.length();await new Promise(r=>setTimeout(r,10));zoom.update();assert.equal(camera.position.length(),before);
});
