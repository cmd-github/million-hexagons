import assert from 'node:assert/strict';
import test from 'node:test';
import { quoteCells } from './pricing.js';

test('creates a versioned server price snapshot in minor units',()=>{
  assert.deepEqual(quoteCells(150,1000,900000,'q1'),{quoteId:'q1',pricingVersion:'staging-regional-per-cell-v1',pricingRegion:'usd',currency:'usd',unitAmountMinor:100,totalAmountMinor:15000,cellCount:150,createdAtMs:1000,expiresAtMs:901000,displayTotal:'$150'});
  assert.equal(quoteCells(5,1000,900000,'q2','gbp').displayTotal,'£5');
  assert.equal(quoteCells(5,1000,900000,'q3','eur').currency,'eur');
  assert.throws(()=>quoteCells(5,1000,900000,'q4','cad'),error=>error.code==='invalid-pricing-region');
  assert.throws(()=>quoteCells(0,1000),error=>error.code==='invalid-quote');
});

test('quotes stop at the self-service maximum',()=>{
  assert.equal(quoteCells(10_000,1000,900_000,'q','usd').cellCount,10_000);
  assert.throws(()=>quoteCells(10_001,1000,900_000,'q','usd'),error=>error.code==='invalid-quote');
});
