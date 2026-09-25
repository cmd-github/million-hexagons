export const PRICING_REGIONS={
  gbp:{currency:'gbp',symbol:'£',unitAmountMinor:100,label:'United Kingdom'},
  eur:{currency:'eur',symbol:'€',unitAmountMinor:100,label:'Eurozone'},
  usd:{currency:'usd',symbol:'$',unitAmountMinor:100,label:'Other countries'}
};

// The 21 EU euro-area members as of 1 January 2026.
export const EUROZONE_COUNTRIES=new Set(['AT','BE','BG','HR','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES']);

export function pricingRegionForCountry(country){
  const code=String(country||'').trim().toUpperCase();
  if(code==='GB')return'gbp';
  if(EUROZONE_COUNTRIES.has(code))return'eur';
  return'usd';
}

export function pricingForRegion(region){return PRICING_REGIONS[region]||PRICING_REGIONS.usd;}

export function formatRegionalPrice(count,region){
  const price=pricingForRegion(region),value=Math.max(0,Math.floor(Number(count)||0));
  return`${price.symbol}${value.toLocaleString(price.currency==='gbp'?'en-GB':price.currency==='eur'?'en-IE':'en-US')}`;
}
