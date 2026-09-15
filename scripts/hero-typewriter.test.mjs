import assert from 'node:assert/strict';
import {HERO_WORDS} from '../src/hero-typewriter.js';

assert.deepEqual(HERO_WORDS,['brand','idea','moment','message','art','story','community','mark']);
assert.equal(Math.max(...HERO_WORDS.map(word=>word.length)),9);
assert.equal(new Set(HERO_WORDS).size,HERO_WORDS.length);
console.log('Hero typewriter sequence checks passed.');
