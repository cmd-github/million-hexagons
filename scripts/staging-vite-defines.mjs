// Only public browser settings belong in this map. Never pass the MH_* settings object
// itself to Vite: it can contain R2 and QA credentials.
export function stagingViteDefines(settings, assetBase) {
  return {
    'import.meta.env.VITE_RUNTIME_ASSET_BASE': JSON.stringify(assetBase),
    'import.meta.env.VITE_STAGING_SANDBOX': JSON.stringify(true),
    'import.meta.env.VITE_STAGING_API_URL': JSON.stringify(settings.MH_STAGING_API_URL || 'https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements'),
    'import.meta.env.VITE_STAGING_CHECKOUT_URL': JSON.stringify(settings.MH_STAGING_CHECKOUT_URL || 'https://europe-west1-million-hexagons.cloudfunctions.net/stagingCheckout'),
    'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(settings.MH_STRIPE_PUBLISHABLE_KEY || 'pk_test_51UE3XXFvLW1Gl1Cp1fLy8dvjJecfZW10OpoG7ac9j0P588l7gRq1129roDlVXuJ7POgZ9IE8GwsNvv8ht4Ahb7EB00oLw46QtT'),
  };
}
