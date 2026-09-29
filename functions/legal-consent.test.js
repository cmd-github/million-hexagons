import assert from 'node:assert/strict';
import test from 'node:test';
import {TERMS_VERSION,normaliseCheckoutConsent} from './legal-consent.js';

test('requires separate terms acceptance and immediate service request',()=>{
  const agreed={termsVersion:TERMS_VERSION,acceptedTerms:true,requestedImmediateService:true};
  assert.deepEqual(normaliseCheckoutConsent(agreed),agreed);
  for(const value of [null,{}, {...agreed,acceptedTerms:false},{...agreed,requestedImmediateService:false},{...agreed,termsVersion:'old'}])
    assert.throws(()=>normaliseCheckoutConsent(value),error=>error.code==='checkout-consent-required');
});
