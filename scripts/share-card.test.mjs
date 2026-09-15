import assert from 'node:assert/strict';
import {cardCopy,displayName,SHARE_FORMATS} from '../src/share/card-copy.js';

assert.equal(displayName({title:'  Northbound   Coffee  '}),'Northbound Coffee');
assert.equal(displayName({}),'');
assert.equal(cardCopy({cellCount:1,anchor:7}).headline,'A new place on the globe.');
assert.equal(Object.keys(SHARE_FORMATS).length,4);
const copy=cardCopy({title:'Northbound Coffee',cellCount:48,anchor:847231},'4x5');
assert.equal(copy.headline,'Northbound Coffee is on the globe.');
assert.equal(copy.support,'48 of 1,000,000 hexagons claimed.');
assert.equal(copy.action,'Search #847231 to find it');
assert.doesNotMatch(Object.values(copy).join(' '),/traffic|return|NFT|price/i);
console.log('Share card copy checks passed.');
