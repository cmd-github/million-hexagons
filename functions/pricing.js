export const STAGING_PRICING_VERSION='staging-usd-per-cell-v1';
export const STAGING_CURRENCY='usd';
export const STAGING_UNIT_AMOUNT_MINOR=100;

export function quoteCells(cellCount,nowMs,ttlMs=15*60_000,quoteId='quote'){
  const count=Number(cellCount);
  if(!Number.isSafeInteger(count)||count<1||count>100_000)throw Object.assign(new Error('invalid-quote'),{code:'invalid-quote'});
  const totalAmountMinor=count*STAGING_UNIT_AMOUNT_MINOR;
  return{quoteId,pricingVersion:STAGING_PRICING_VERSION,currency:STAGING_CURRENCY,unitAmountMinor:STAGING_UNIT_AMOUNT_MINOR,totalAmountMinor,cellCount:count,createdAtMs:nowMs,expiresAtMs:nowMs+ttlMs,displayTotal:`$${count.toLocaleString('en-US')}`};
}
