import assert from 'node:assert/strict';
import test from 'node:test';
import { normaliseDesignState, normaliseDraft } from './drafts.js';

const designState={topologyVersion:'geodesic-v1',anchor:2,cells:[{id:1,color:'#AABBCC'},{id:2,transparent:true}],baseColour:'#6366A8',imageTransform:{scale:125,x:12,y:-8,rotation:30,treatment:'tint'}};

test('normalises editable design state without flattening cell edits',()=>{
  const result=normaliseDesignState(designState);
  assert.deepEqual(result.cells,[{id:1,color:'#aabbcc'},{id:2,transparent:true}]);
  assert.deepEqual(result.imageTransform,{scale:125,x:12,y:-8,rotation:30,treatment:'tint'});
});

test('normalises recoverable drafts and rejects invalid cells or URLs',()=>{
  const draft=normaliseDraft({title:'  Working   draft ',destinationUrl:'https://example.com',designState});
  assert.equal(draft.title,'Working draft');
  assert.match(draft.draftId,/^[0-9a-f-]{36}$/);
  assert.equal(normaliseDraft({title:'Bad',destinationUrl:'javascript:bad',designState}),null);
  assert.equal(normaliseDraft({title:'Bad',designState:{...designState,cells:[{id:2},{id:2}]}}),null);
});
