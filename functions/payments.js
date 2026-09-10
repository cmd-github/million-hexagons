import { createHash } from 'node:crypto';

export function checkoutOwnerId(token){return`checkout:${createHash('sha256').update(String(token||'')).digest('hex')}`;}
export function paidEmailOwnerId(email){return`paid-email:${createHash('sha256').update(String(email||'').trim().toLowerCase()).digest('hex')}`;}
export function checkoutOrderId(reservationId){return`order-${String(reservationId||'').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80)}`;}
export function checkoutLineItem(quote){
  if(!quote||quote.currency!=='usd'||!Number.isSafeInteger(quote.unitAmountMinor)||quote.unitAmountMinor<1||!Number.isSafeInteger(quote.cellCount)||quote.cellCount<1||quote.totalAmountMinor!==quote.unitAmountMinor*quote.cellCount)throw Object.assign(new Error('invalid-quote'),{code:'invalid-quote'});
  return{price_data:{currency:quote.currency,unit_amount:quote.unitAmountMinor,product_data:{name:'Million Hexagons placement',description:`Permanent claim to ${quote.cellCount.toLocaleString('en-US')} ${quote.cellCount===1?'cell':'cells'}`}},quantity:quote.cellCount};
}
export function paidCheckoutEmail(session){const email=String(session?.customer_details?.email||session?.customer_email||'').trim().toLowerCase();return session?.payment_status==='paid'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;}
