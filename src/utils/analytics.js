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
    
    // Circuit breaker for analytics failures
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
      threshold: 5, // Open circuit after 5 failures
      timeout: 60000, // 1 minute timeout
      halfOpenMaxRequests: 3 // Allow 3 requests in half-open state
    }
    
    // Rate limiting for analytics
    this.rateLimiter = {
      requests: [],
      maxRequests: 10, // Max 10 requests per minute
      windowMs: 60000 // 1 minute window
    }
    
    this.initializeSession()
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // Circuit breaker methods
  isCircuitOpen() {
    const now = Date.now()
    const { isOpen, lastFailureTime, timeout } = this.circuitBreaker
    
    if (isOpen && (now - lastFailureTime) > timeout) {
      // Move to half-open state
      this.circuitBreaker.isOpen = false
      this.circuitBreaker.halfOpenRequests = 0
      
      // Retry stored events when circuit breaker reopens
      setTimeout(() => this.retryStoredEvents(), 1000)
      
      return false
    }
    
    return isOpen
  }

  recordFailure() {
    this.circuitBreaker.failures++
    this.circuitBreaker.lastFailureTime = Date.now()
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.isOpen = true
      console.warn('Analytics circuit breaker opened due to failures')
    }
  }

  recordSuccess() {
    this.circuitBreaker.failures = 0
    this.circuitBreaker.isOpen = false
  }

  // Rate limiting methods
  isRateLimited() {
    const now = Date.now()
    const { requests, maxRequests, windowMs } = this.rateLimiter
    
    // Remove old requests outside the window
    this.rateLimiter.requests = requests.filter(time => (now - time) < windowMs)
    
    return this.rateLimiter.requests.length >= maxRequests
  }

  recordRequest() {
    this.rateLimiter.requests.push(Date.now())
  }

  // Retry stored events when circuit breaker reopens
  async retryStoredEvents() {
    if (this.isCircuitOpen() || this.isRateLimited()) {
      return
    }

    try {
      const stored = localStorage.getItem('ff_analytics_events')
      if (!stored) return

      const events = JSON.parse(stored)
      if (events.length === 0) return

      console.log(`Retrying ${events.length} stored analytics events`)

      // Retry events in batches to avoid overwhelming the server
      const batchSize = 5
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize)
        
        for (const event of batch) {
          if (this.isCircuitOpen() || this.isRateLimited()) {
            break
          }
          
          await this.sendToAnalytics(event)
          // Small delay between events
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Delay between batches
        if (i + batchSize < events.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Clear successfully sent events
      localStorage.removeItem('ff_analytics_events')
      console.log('Successfully retried stored analytics events')
    } catch (error) {
      console.warn('Failed to retry stored analytics events:', error)
    }
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

    // Set up periodic retry of stored events (every 5 minutes)
    setInterval(() => {
      this.retryStoredEvents()
    }, 5 * 60 * 1000)
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
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      console.warn('Analytics circuit breaker is open, storing event locally')
      this.storeEventLocally(event)
      return
    }

    // Check rate limiting
    if (this.isRateLimited()) {
      console.warn('Analytics rate limited, storing event locally')
      this.storeEventLocally(event)
      return
    }

    try {
      this.recordRequest()
      
      // Send to internal analytics endpoint
      const response = await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })

      if (response.ok) {
        this.recordSuccess()
      } else if (response.status === 429) {
        // Rate limited by server
        console.warn('Server rate limited analytics request')
        this.storeEventLocally(event)
      } else if (response.status >= 500) {
        // Server error
        this.recordFailure()
        this.storeEventLocally(event)
      } else {
        // Other client errors
        this.storeEventLocally(event)
      }
    } catch (error) {
      this.recordFailure()
      console.warn('Analytics request failed:', error.message)
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


