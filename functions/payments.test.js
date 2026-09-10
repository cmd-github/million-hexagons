import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutLineItem, checkoutOrderId, checkoutOwnerId, paidCheckoutEmail } from './payments.js';

test('builds Stripe line items only from a consistent server quote',()=>{
  assert.equal(checkoutLineItem({currency:'usd',unitAmountMinor:100,cellCount:15,totalAmountMinor:1500}).quantity,15);
  assert.throws(()=>checkoutLineItem({currency:'usd',unitAmountMinor:100,cellCount:15,totalAmountMinor:1}),error=>error.code==='invalid-quote');
});
test('uses opaque checkout ownership and requires a paid valid email',()=>{
  assert.match(checkoutOwnerId('secret-token'),/^checkout:[a-f0-9]{64}$/);assert.equal(checkoutOrderId('abc!'),'order-abc');
  assert.equal(paidCheckoutEmail({payment_status:'paid',customer_details:{email:'Buyer@Example.com'}}),'buyer@example.com');assert.equal(paidCheckoutEmail({payment_status:'unpaid',customer_details:{email:'buyer@example.com'}}),null);
});
