import assert from 'node:assert/strict';
import {HERO_HOLD_MS,HERO_WORDS,heroWordOrder,shuffleHeroWords} from '../src/hero-typewriter.js';

assert.deepEqual(HERO_WORDS,['brand','idea','art','community','mark','name','project','team','club','company','picture','game','memory','vision','cause','masterpiece','business']);
assert.equal(Math.max(...HERO_WORDS.map(word=>word.length)),11);
assert.equal(new Set(HERO_WORDS).size,HERO_WORDS.length);
assert.equal(HERO_HOLD_MS,3000);
assert.deepEqual(shuffleHeroWords(['a','b','c'],()=>0),['b','c','a']);
const order=heroWordOrder(()=>0);
assert.equal(order[2],'brand');
assert.equal(order[3],'business');
assert.deepEqual(new Set(order),new Set(HERO_WORDS));
console.log('Hero typewriter sequence checks passed.');
