import test from 'node:test';
import assert from 'node:assert/strict';
import {hasArtworkPreview} from '../src/globe/artwork-loading.js';

test('reveal needs complete visible coverage but permits coarse ancestors',()=>{
  const tiles={group:{visible:true},selection:[{key:'a'},{key:'b'}],views:new Map([['a',{mesh:{visible:true},source:{preview:true}}]])};
  assert.equal(hasArtworkPreview(undefined),false);
  assert.equal(hasArtworkPreview(tiles),false);
  tiles.views.set('b',{mesh:{visible:true},source:{preview:true}});
  assert.equal(hasArtworkPreview(tiles),true);
  tiles.group.visible=false;assert.equal(hasArtworkPreview(tiles),false);
  tiles.group.visible=true;tiles.selection=[];assert.equal(hasArtworkPreview(tiles),false);
});
