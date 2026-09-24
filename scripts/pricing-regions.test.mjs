import assert from'node:assert/strict';
import test from'node:test';
import{EUROZONE_COUNTRIES,formatRegionalPrice,pricingForRegion,pricingRegionForCountry}from'../src/pricing-regions.js';

test('maps UK, the 2026 eurozone and other countries to fixed price regions',()=>{
  assert.equal(pricingRegionForCountry('GB'),'gbp');
  assert.equal(pricingRegionForCountry('BG'),'eur');
  assert.equal(pricingRegionForCountry('FR'),'eur');
  assert.equal(pricingRegionForCountry('SE'),'usd');
  assert.equal(pricingRegionForCountry('US'),'usd');
  assert.equal(pricingRegionForCountry(''),'usd');
  assert.equal(EUROZONE_COUNTRIES.size,21);
});

test('formats the fixed one-unit regional totals',()=>{
  assert.equal(formatRegionalPrice(150,'gbp'),'£150');
  assert.equal(formatRegionalPrice(150,'eur'),'€150');
  assert.equal(formatRegionalPrice(150,'usd'),'$150');
  assert.deepEqual(pricingForRegion('invalid'),pricingForRegion('usd'));
});
