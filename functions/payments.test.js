import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCreditsToQuote, checkoutLineItem, checkoutOrderId, checkoutOwnerId, checkoutSessionParameters, paidCheckoutEmail, paidEmailOwnerId } from './payments.js';

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

test('credits cover hexagons one for one and Stripe charges the remainder',()=>{
  const quote={currency:'gbp',unitAmountMinor:100,cellCount:100,totalAmountMinor:10000};
  const partial=applyCreditsToQuote(quote,25);
  assert.equal(partial.applied,25);
  assert.equal(partial.chargeCells,75);
  assert.equal(partial.covered,false);
  assert.equal(partial.quote.totalAmountMinor,7500);
  assert.equal(partial.quote.unitAmountMinor,100,'the unit price is untouched, so inclusive tax still works');
  // More credits than hexagons never charges a negative amount or spends the surplus.
  const full=applyCreditsToQuote(quote,250);
  assert.equal(full.applied,100);
  assert.equal(full.chargeCells,0);
  assert.equal(full.covered,true);
  // No credits leaves the quote exactly as it was.
  assert.deepEqual(applyCreditsToQuote(quote,0).quote,quote);
  assert.equal(applyCreditsToQuote(quote,-5).applied,0);
});

test('a part-credited checkout charges the uncovered cells and still names the full claim',()=>{
  const quote={currency:'gbp',unitAmountMinor:100,cellCount:100,totalAmountMinor:10000};
  const {quote:charged,applied}=applyCreditsToQuote(quote,40);
  const params=checkoutSessionParameters({quote:charged,orderId:'o1',reservationId:'r1',placementId:'p1',checkoutExpiresAt:1,creditsApplied:applied,placementCells:quote.cellCount});
  assert.equal(params.line_items[0].quantity,60);
  assert.equal(params.line_items[0].price_data.unit_amount,100);
  assert.match(params.line_items[0].price_data.product_data.description,/100 cells · 40 covered by credits/);
  assert.equal(params.metadata.creditsApplied,'40');
  assert.equal(params.payment_intent_data.metadata.creditsApplied,'40');
});
