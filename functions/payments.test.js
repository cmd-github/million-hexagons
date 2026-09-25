import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutLineItem, checkoutOrderId, checkoutOwnerId, checkoutSessionParameters, paidCheckoutEmail, paidEmailOwnerId } from './payments.js';

test('builds Stripe line items only from a consistent server quote',()=>{
  const item=checkoutLineItem({currency:'usd',unitAmountMinor:100,cellCount:15,totalAmountMinor:1500});
  assert.equal(item.quantity,15);assert.equal(item.price_data.tax_behavior,'inclusive');
  assert.throws(()=>checkoutLineItem({currency:'usd',unitAmountMinor:100,cellCount:15,totalAmountMinor:1}),error=>error.code==='invalid-quote');
});
test('builds an explicit Managed Payments session without unsupported payment method parameters',()=>{
  const params=checkoutSessionParameters({quote:{currency:'usd',unitAmountMinor:100,cellCount:5,totalAmountMinor:500},orderId:'o1',reservationId:'r1',placementId:'p1',checkoutExpiresAt:12345,managedPayments:true,taxCode:'txcd_10000000'});
  assert.deepEqual(params.managed_payments,{enabled:true});assert.equal(params.mode,'payment');assert.equal(params.ui_mode,'embedded');assert.equal(params.line_items[0].price_data.tax_behavior,'inclusive');assert.equal(params.line_items[0].price_data.product_data.tax_code,'txcd_10000000');assert.equal('payment_method_types' in params,false);
  assert.throws(()=>checkoutSessionParameters({quote:{currency:'usd',unitAmountMinor:100,cellCount:5,totalAmountMinor:500},managedPayments:true}),error=>error.code==='managed-payments-tax-code-required');
});
test('retains the existing card-only staging session until Managed Payments is enabled',()=>{
  const params=checkoutSessionParameters({quote:{currency:'usd',unitAmountMinor:100,cellCount:5,totalAmountMinor:500},managedPayments:false});
  assert.deepEqual(params.payment_method_types,['card']);assert.equal(params.ui_mode,'embedded');assert.equal('managed_payments' in params,false);assert.equal(params.line_items[0].price_data.product_data.tax_code,undefined);
});
test('uses opaque checkout ownership and requires a paid valid email',()=>{
  assert.match(checkoutOwnerId('secret-token'),/^checkout:[a-f0-9]{64}$/);assert.equal(checkoutOrderId('abc!'),'order-abc');
  assert.match(paidEmailOwnerId(' Buyer@Example.com '),/^paid-email:[a-f0-9]{64}$/);assert.equal(paidEmailOwnerId(' Buyer@Example.com '),paidEmailOwnerId('buyer@example.com'));
  assert.equal(paidCheckoutEmail({payment_status:'paid',customer_details:{email:'Buyer@Example.com'}}),'buyer@example.com');assert.equal(paidCheckoutEmail({payment_status:'unpaid',customer_details:{email:'buyer@example.com'}}),null);
});
