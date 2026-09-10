import assert from 'node:assert/strict';
import test from 'node:test';
import { quoteCells } from './pricing.js';

test('creates a versioned server price snapshot in minor units',()=>{
  assert.deepEqual(quoteCells(150,1000,900000,'q1'),{quoteId:'q1',pricingVersion:'staging-usd-per-cell-v1',currency:'usd',unitAmountMinor:100,totalAmountMinor:15000,cellCount:150,createdAtMs:1000,expiresAtMs:901000,displayTotal:'$150'});
  assert.throws(()=>quoteCells(0,1000),error=>error.code==='invalid-quote');
});
