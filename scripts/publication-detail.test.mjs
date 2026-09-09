import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {publicationLevel, ancestorCrop} from '../src/globe/publication-detail.js';
import {selectArtworkTiles} from '../src/globe/tile-selection.js';

const manifest={tileSize:512,maxLevel:5};
test('fine uploads gain detail, large artwork stays within its source resolution',()=>{
  assert.equal(publicationLevel({left:0,right:.04,top:0,bottom:.025},{width:1000,height:625},manifest),7);
  assert.equal(publicationLevel({left:-1,right:1,top:-1,bottom:1},{width:3072,height:3072},manifest),5);
  assert.equal(publicationLevel({left:0,right:.001,top:0,bottom:.001},{width:3072,height:3072},manifest),8);
});

test('inherited child pages include the exact parent gutter on all quadrants',()=>{
  const left=ancestorCrop(6,0,0,5,512,2),right=ancestorCrop(6,1,1,5,512,2);
  assert.deepEqual(left,{x:1,y:1,size:258});
  assert.deepEqual(right,{x:257,y:257,size:258});
  // Their interior edges meet at the parent's centre, while gutters overlap.
  assert.equal(left.x+left.size-1,right.x+1);
  assert.deepEqual(ancestorCrop(8,7,6,5,512,2),{x:449.75,y:385.75,size:64.5});
});

test('only published branches refine, while overview selection remains unchanged',()=>{
  const globe=new THREE.Group(),camera=new THREE.PerspectiveCamera(38,1,.1,100);
  camera.position.set(0,0,4.22);camera.lookAt(0,0,0);
  const before=selectArtworkTiles(globe,camera,4,900,manifest);
  const parent=before[0],branches=new Set([parent.key]);
  const after=selectArtworkTiles(globe,camera,4,900,manifest,branches);
  assert.ok(after.some(t=>t.level===6));
  assert.ok(after.filter(t=>t.level===6).every(t=>t.face===parent.face&&Math.floor(t.x/2)===parent.x&&Math.floor(t.y/2)===parent.y));
  assert.ok(before.filter(t=>t.key!==parent.key).every(t=>after.some(a=>a.key===t.key)));
  camera.position.set(0,0,10);camera.lookAt(0,0,0);
  assert.deepEqual(selectArtworkTiles(globe,camera,4,900,manifest,branches),selectArtworkTiles(globe,camera,4,900,manifest));
});
