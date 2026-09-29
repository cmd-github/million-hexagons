export const TERMS_VERSION='uk-service-draft-2026-09-29';

export function normaliseCheckoutConsent(value){
  if(!value||value.termsVersion!==TERMS_VERSION||value.acceptedTerms!==true||value.requestedImmediateService!==true)
    throw Object.assign(new Error('checkout-consent-required'),{code:'checkout-consent-required'});
  return{termsVersion:TERMS_VERSION,acceptedTerms:true,requestedImmediateService:true};
}
