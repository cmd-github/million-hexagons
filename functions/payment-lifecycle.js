export function checkoutSessionState(session) {
  if (session?.payment_status === 'paid' || session?.payment_status === 'no_payment_required') return 'paid';
  if (session?.status === 'expired') return 'expired';
  if (session?.status === 'complete') return 'payment-processing';
  return 'checkout-open';
}

export function refundState(charge) {
  const paid=Number(charge?.amount||0),refunded=Number(charge?.amount_refunded||0);
  if(!Number.isSafeInteger(paid)||paid<1||!Number.isSafeInteger(refunded)||refunded<1||refunded>paid)return null;
  return{status:refunded===paid?'refunded':'partially-refunded',amountRefundedMinor:refunded,amountPaidMinor:paid,currency:String(charge.currency||'').toLowerCase(),ownershipOutcome:'retained-pending-policy'};
}

export function paymentFailure(paymentIntent) {
  const error=paymentIntent?.last_payment_error;
  return{code:String(error?.code||error?.decline_code||'payment-failed').slice(0,80),message:String(error?.message||'Payment was not completed.').slice(0,200)};
}
