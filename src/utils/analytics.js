// Advanced Analytics System
class Analytics {
  constructor() {
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()
    this.events = []
    this.funnelSteps = {
      'homepage_view': 1,
      'model_view': 2,
      'build_started': 3,
      'customization_complete': 4,
      'payment_method_selected': 5,
      'buyer_info_complete': 6,
      'review_complete': 7,
      'contract_signed': 8,
      'order_placed': 9
    }
    
    this.initializeSession()
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  initializeSession() {
    // Track session start
    this.trackEvent('session_start', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      url: window.location.href
    })
  }

  trackEvent(eventName, properties = {}) {
    const event = {
      event: eventName,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      properties: {
        ...properties,
        sessionDuration: Date.now() - this.startTime
      }
    }

    this.events.push(event)
    
    // Send to analytics endpoint
    this.sendToAnalytics(event)
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('📊 Analytics Event:', eventName, properties)
    }
  }

  async sendToAnalytics(event) {
    try {
      // Send to internal analytics endpoint
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })
    } catch (error) {
      // Store locally if network fails
      this.storeEventLocally(event)
    }
  }

  storeEventLocally(event) {
    try {
      const stored = localStorage.getItem('ff_analytics_events') || '[]'
      const events = JSON.parse(stored)
      events.push(event)
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100)
      }
      
      localStorage.setItem('ff_analytics_events', JSON.stringify(events))
    } catch (error) {
      console.error('Failed to store analytics event locally:', error)
    }
  }

  // Funnel tracking methods
  trackFunnelStep(stepName, buildId = null, properties = {}) {
    const stepNumber = this.funnelSteps[stepName]
    if (!stepNumber) {
      console.warn('Unknown funnel step:', stepName)
      return
    }

    this.trackEvent('funnel_step', {
      stepName,
      stepNumber,
      buildId,
      ...properties
    })
  }

  trackConversion(conversionType, buildId = null, properties = {}) {
    this.trackEvent('conversion', {
      conversionType,
      buildId,
      sessionDuration: Date.now() - this.startTime,
      ...properties
    })
  }

  // Build-specific tracking
  buildStarted(buildId, modelSlug, modelName, basePrice) {
    this.trackFunnelStep('build_started', buildId, {
      modelSlug,
      modelName,
      basePrice
    })
  }

  buildCustomized(buildId, optionsCount, totalPrice) {
    this.trackFunnelStep('customization_complete', buildId, {
      optionsCount,
      totalPrice
    })
  }

  paymentSelected(buildId, paymentMethod) {
    this.trackFunnelStep('payment_method_selected', buildId, {
      paymentMethod
    })
  }

  buyerInfoComplete(buildId, hasFinancing) {
    this.trackFunnelStep('buyer_info_complete', buildId, {
      hasFinancing
    })
  }

  reviewComplete(buildId, finalPrice) {
    this.trackFunnelStep('review_complete', buildId, {
      finalPrice
    })
  }

  contractSigned(buildId, contractType) {
    this.trackFunnelStep('contract_signed', buildId, {
      contractType
    })
  }

  orderPlaced(buildId, orderId, totalAmount) {
    this.trackFunnelStep('order_placed', buildId, {
      orderId,
      totalAmount
    })
    
    this.trackConversion('purchase', buildId, {
      orderId,
      totalAmount
    })
  }

  // User interaction tracking
  trackPageView(pageName, properties = {}) {
    this.trackEvent('page_view', {
      pageName,
      ...properties
    })
  }

  trackModelView(modelSlug, modelName, basePrice) {
    this.trackFunnelStep('model_view', null, {
      modelSlug,
      modelName,
      basePrice
    })
  }

  trackHomepageView() {
    this.trackFunnelStep('homepage_view')
  }

  // Error tracking
  trackError(errorType, errorMessage, buildId = null) {
    this.trackEvent('error', {
      errorType,
      errorMessage,
      buildId
    })
  }

  // Performance tracking
  trackPerformance(metricName, value, buildId = null) {
    this.trackEvent('performance', {
      metricName,
      value,
      buildId
    })
  }

  // Step navigation tracking
  stepChanged(buildId, fromStep, toStep) {
    this.trackEvent('step_navigation', {
      buildId,
      fromStep,
      toStep,
      direction: toStep > fromStep ? 'forward' : 'backward'
    })
  }

  // Build management tracking
  buildSaved(buildId) {
    this.trackEvent('build_saved', { buildId })
  }

  buildDuplicated(buildId, newBuildId) {
    this.trackEvent('build_duplicated', { 
      originalBuildId: buildId, 
      newBuildId 
    })
  }

  buildDeleted(buildId) {
    this.trackEvent('build_deleted', { buildId })
  }

  buildRenamed(buildId, newName) {
    this.trackEvent('build_renamed', { 
      buildId, 
      newName 
    })
  }

  // Offline tracking
  trackOfflineAction(action, buildId = null) {
    this.trackEvent('offline_action', {
      action,
      buildId,
      timestamp: new Date().toISOString()
    })
  }

  // Get analytics summary
  getSessionSummary() {
    const now = Date.now()
    const duration = now - this.startTime
    
    const eventCounts = {}
    this.events.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1
    })

    return {
      sessionId: this.sessionId,
      duration,
      eventCount: this.events.length,
      eventCounts,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(now).toISOString()
    }
  }

  // Export events for debugging
  exportEvents() {
    return {
      session: this.getSessionSummary(),
      events: this.events
    }
  }

  // Clear local storage
  clearLocalEvents() {
    try {
      localStorage.removeItem('ff_analytics_events')
    } catch (error) {
      console.error('Failed to clear local analytics events:', error)
    }
  }
}

// Create singleton instance
const analytics = new Analytics()

// Legacy function for backward compatibility
export function trackEvent(eventName, properties = {}) {
  analytics.trackEvent(eventName, properties)
}

export default analytics


