export const STAGING_PRICING_VERSION='staging-regional-per-cell-v1';
export const STAGING_UNIT_AMOUNT_MINOR=100;
export const STAGING_PRICE_REGIONS={gbp:{currency:'gbp',symbol:'£',locale:'en-GB'},eur:{currency:'eur',symbol:'€',locale:'en-IE'},usd:{currency:'usd',symbol:'$',locale:'en-US'}};

export function quoteCells(cellCount,nowMs,ttlMs=15*60_000,quoteId='quote',pricingRegion='usd'){
  const count=Number(cellCount);
  if(!Number.isSafeInteger(count)||count<1||count>100_000)throw Object.assign(new Error('invalid-quote'),{code:'invalid-quote'});
  const region=STAGING_PRICE_REGIONS[pricingRegion];
  if(!region)throw Object.assign(new Error('invalid-pricing-region'),{code:'invalid-pricing-region'});
  const totalAmountMinor=count*STAGING_UNIT_AMOUNT_MINOR;
  return{quoteId,pricingVersion:STAGING_PRICING_VERSION,pricingRegion,currency:region.currency,unitAmountMinor:STAGING_UNIT_AMOUNT_MINOR,totalAmountMinor,cellCount:count,createdAtMs:nowMs,expiresAtMs:nowMs+ttlMs,displayTotal:`${region.symbol}${count.toLocaleString(region.locale)}`};
}
