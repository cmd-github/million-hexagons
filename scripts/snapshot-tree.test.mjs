import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newTree,setNode,hasNode,hasChildren,validateTree,nodeIndex,SNAPSHOT_TREE_BYTES} from '../src/globe/snapshot-tree.js';
import {selectArtworkTiles,selectBudgetedArtworkTiles} from '../src/globe/tile-selection.js';

test('sparse tree isolates faces, levels and quadrants through maximum detail',()=>{
  const tree=newTree();for(let f=0;f<6;f++)setNode(tree,f,0,0,0);
  assert.equal(validateTree(tree),tree);assert.equal(tree.length,SNAPSHOT_TREE_BYTES);
  setNode(tree,5,10,1023,1023);assert.equal(hasNode(tree,5,10,1023,1023),true);
  assert.equal(hasNode(tree,4,10,1023,1023),false);assert.equal(hasNode(tree,5,10,1022,1023),false);
  assert.equal(hasChildren(tree,5,9,511,511),true);assert.equal(hasChildren(tree,5,10,1023,1023),false);
  assert.ok(nodeIndex(5,10,1023,1023)<SNAPSHOT_TREE_BYTES*8);
});

test('extreme display density keeps complete coverage within the fixed tile budget',()=>{
  const globe=new THREE.Group(),camera=new THREE.PerspectiveCamera(38,2,.1,100);camera.position.set(0,0,14);camera.lookAt(0,0,0);
  const selected=selectBudgetedArtworkTiles(globe,camera,4,16000,{tileSize:512,maxLevel:10},null,54);
  assert.ok(selected.length>0&&selected.length<=54);
  const roots=selectArtworkTiles(globe,camera,4,1,{tileSize:512,maxLevel:0});
  assert.deepEqual([...new Set(selected.map(t=>t.face))].sort(),roots.map(t=>t.face).sort());
});
test('truncated or rootless trees fail instead of silently hiding artwork',()=>{
  assert.throws(()=>validateTree(new Uint8Array(32)),/Incomplete/);
  assert.throws(()=>validateTree(newTree()),/overview/);
});
test('viewport selection does not grow with declared placement count',()=>{
  const globe=new THREE.Group(),camera=new THREE.PerspectiveCamera(38,1440/900,.1,100);camera.position.set(0,0,14);camera.lookAt(0,0,0);
  const sets=[1000,10000,100000,1000000].map(placements=>selectArtworkTiles(globe,camera,4,900,{tileSize:512,maxLevel:10,placements}));
  for(const set of sets){assert.deepEqual(set,sets[0]);assert.ok(set.length<64);}
  // This tests selection complexity, not the diversity or byte size of dense imagery.
});
