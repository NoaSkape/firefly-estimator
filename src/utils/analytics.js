export function trackEvent(name, payload = {}) {
  try {
    const data = { 
      event: name, 
      at: new Date().toISOString(), 
      url: window.location.pathname,
      ...payload 
    }
    // For now, just log. Hook up to a provider later.
    // eslint-disable-next-line no-console
    console.log('[analytics]', data)
    
    // TODO: Send to analytics provider (Google Analytics, Mixpanel, etc.)
    // Example: gtag('event', name, payload)
  } catch {}
}

// Predefined event tracking functions
export const analytics = {
  // Build lifecycle
  buildCreated: (buildId, modelSlug) => trackEvent('build_created', { buildId, modelSlug }),
  buildSaved: (buildId) => trackEvent('build_saved', { buildId }),
  buildLoaded: (buildId) => trackEvent('build_loaded', { buildId }),
  buildDuplicated: (fromBuildId, toBuildId) => trackEvent('build_duplicated', { from: fromBuildId, to: toBuildId }),
  buildDeleted: (buildId) => trackEvent('build_deleted', { buildId }),
  buildResumed: (buildId, step) => trackEvent('build_resumed', { buildId, step }),
  buildSetPrimary: (buildId) => trackEvent('build_set_primary', { buildId }),
  
  // Checkout funnel
  stepChanged: (buildId, fromStep, toStep) => trackEvent('step_changed', { buildId, fromStep, toStep }),
  paymentSelected: (buildId, method) => trackEvent('payment_selected', { buildId, method }),
  buyerSaved: (buildId) => trackEvent('buyer_saved', { buildId }),
  contractStarted: (buildId) => trackEvent('contract_started', { buildId }),
  orderConfirmed: (buildId) => trackEvent('order_confirmed', { buildId }),
  
  // User actions
  modelViewed: (modelSlug) => trackEvent('model_viewed', { modelSlug }),
  optionSelected: (buildId, optionCode) => trackEvent('option_selected', { buildId, optionCode }),
  guestDraftCreated: (modelSlug) => trackEvent('guest_draft_created', { modelSlug }),
  guestDraftMigrated: (modelSlug, buildId) => trackEvent('guest_draft_migrated', { modelSlug, buildId }),
  
  // Navigation
  pageViewed: (page) => trackEvent('page_viewed', { page }),
  ctaClicked: (cta, location) => trackEvent('cta_clicked', { cta, location })
}


