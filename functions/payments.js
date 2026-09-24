import { createHash } from 'node:crypto';

export function checkoutOwnerId(token){return`checkout:${createHash('sha256').update(String(token||'')).digest('hex')}`;}
export function paidEmailOwnerId(email){return`paid-email:${createHash('sha256').update(String(email||'').trim().toLowerCase()).digest('hex')}`;}
export function checkoutOrderId(reservationId){return`order-${String(reservationId||'').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80)}`;}
export function checkoutLineItem(quote,{taxCode=''}={}){
  if(!quote||!['gbp','eur','usd'].includes(quote.currency)||!Number.isSafeInteger(quote.unitAmountMinor)||quote.unitAmountMinor<1||!Number.isSafeInteger(quote.cellCount)||quote.cellCount<1||quote.totalAmountMinor!==quote.unitAmountMinor*quote.cellCount)throw Object.assign(new Error('invalid-quote'),{code:'invalid-quote'});
  const product_data={name:'Million Hexagons placement',description:`Permanent claim to ${quote.cellCount.toLocaleString('en-US')} ${quote.cellCount===1?'cell':'cells'}`};
  if(taxCode)product_data.tax_code=taxCode;
  return{price_data:{currency:quote.currency,unit_amount:quote.unitAmountMinor,tax_behavior:'inclusive',product_data},quantity:quote.cellCount};
}
export function checkoutSessionParameters({quote,orderId,reservationId,placementId,checkoutExpiresAt,verifiedEmail='',managedPayments=false,taxCode=''}){
  if(managedPayments&&!String(taxCode).trim())throw Object.assign(new Error('managed-payments-tax-code-required'),{code:'managed-payments-tax-code-required'});
  return{mode:'payment',ui_mode:'embedded_page',redirect_on_completion:'never',...(managedPayments?{managed_payments:{enabled:true}}:{payment_method_types:['card']}),line_items:[checkoutLineItem(quote,{taxCode:managedPayments?String(taxCode).trim():''})],customer_creation:'always',...(verifiedEmail?{customer_email:verifiedEmail}:{}),expires_at:checkoutExpiresAt,metadata:{orderId,reservationId,placementId},payment_intent_data:{metadata:{orderId,reservationId,placementId}}};
}
export function paidCheckoutEmail(session){const email=String(session?.customer_details?.email||session?.customer_email||'').trim().toLowerCase();return session?.payment_status==='paid'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;}
