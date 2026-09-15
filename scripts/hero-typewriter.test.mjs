import assert from 'node:assert/strict';
import {HERO_HOLD_MS,HERO_WORDS,shuffleHeroWords} from '../src/hero-typewriter.js';

assert.ok(HERO_WORDS.length>=16);
assert.equal(Math.max(...HERO_WORDS.map(word=>word.length)),9);
assert.equal(new Set(HERO_WORDS).size,HERO_WORDS.length);
assert.equal(HERO_HOLD_MS,3000);
assert.deepEqual(shuffleHeroWords(['a','b','c'],()=>0),['b','c','a']);
assert.deepEqual(HERO_WORDS.includes('brand'),true);
console.log('Hero typewriter sequence checks passed.');
