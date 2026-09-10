import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSessionState, paymentFailure, refundState } from './payment-lifecycle.js';

test('classifies paid, processing, open and expired Checkout sessions',()=>{
  assert.equal(checkoutSessionState({payment_status:'paid',status:'complete'}),'paid');
  assert.equal(checkoutSessionState({payment_status:'unpaid',status:'complete'}),'payment-processing');
  assert.equal(checkoutSessionState({payment_status:'unpaid',status:'open'}),'checkout-open');
  assert.equal(checkoutSessionState({payment_status:'unpaid',status:'expired'}),'expired');
});

test('records partial and full refunds while preserving ownership pending policy',()=>{
  assert.deepEqual(refundState({amount:1000,amount_refunded:400,currency:'USD'}),{status:'partially-refunded',amountRefundedMinor:400,amountPaidMinor:1000,currency:'usd',ownershipOutcome:'retained-pending-policy'});
  assert.equal(refundState({amount:1000,amount_refunded:1000,currency:'usd'}).status,'refunded');
  assert.equal(refundState({amount:1000,amount_refunded:0,currency:'usd'}),null);
});

test('keeps bounded buyer-safe payment failure details',()=>{
  assert.deepEqual(paymentFailure({last_payment_error:{decline_code:'insufficient_funds',message:'Your card has insufficient funds.'}}),{code:'insufficient_funds',message:'Your card has insufficient funds.'});
});
