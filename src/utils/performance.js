// Performance monitoring utility
import analytics from './analytics'

class PerformanceMonitor {
  constructor() {
    this.metrics = {}
    this.observers = []
    this.init()
  }

  init() {
    // Track page load performance
    this.trackPageLoad()
    
    // Track Core Web Vitals
    this.trackCoreWebVitals()
    
    // Track user interactions
    this.trackUserInteractions()
    
    // Track resource loading
    this.trackResourceLoading()
  }

  trackPageLoad() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const paint = performance.getEntriesByType('paint')
      
      const metrics = {
        pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        url: window.location.href,
        timestamp: Date.now()
      }

      this.metrics.pageLoad = metrics
      analytics.trackPerformance('page_load', metrics.pageLoadTime)
      
      // Log slow page loads
      if (metrics.pageLoadTime > 3000) {
        analytics.trackError('slow_page_load', `Page load took ${metrics.pageLoadTime}ms`, null)
      }
    })
  }

  trackCoreWebVitals() {
    // Track Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        this.metrics.lcp = lastEntry.startTime
        analytics.trackPerformance('lcp', lastEntry.startTime)
        
        if (lastEntry.startTime > 2500) {
          analytics.trackError('poor_lcp', `LCP took ${lastEntry.startTime}ms`, null)
        }
      })
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          this.metrics.fid = entry.processingStart - entry.startTime
          analytics.trackPerformance('fid', this.metrics.fid)
          
          if (this.metrics.fid > 100) {
            analytics.trackError('poor_fid', `FID took ${this.metrics.fid}ms`, null)
          }
        })
      })
      
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Track Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        
        this.metrics.cls = clsValue
        analytics.trackPerformance('cls', clsValue)
        
        if (clsValue > 0.1) {
          analytics.trackError('poor_cls', `CLS is ${clsValue}`, null)
        }
      })
      
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    }
  }

  trackUserInteractions() {
    // Throttle interaction tracking to prevent excessive events
    let interactionCount = 0
    const maxInteractionsPerMinute = 20
    
    // Track button clicks and form interactions (throttled)
    document.addEventListener('click', (event) => {
      const target = event.target
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        // Only track every 5th interaction to reduce noise
        if (interactionCount % 5 !== 0) {
          interactionCount++
          return
        }
        
        const startTime = performance.now()
        
        const trackInteraction = () => {
          const duration = performance.now() - startTime
          // Only track slow interactions (>100ms)
          if (duration > 100) {
            analytics.trackPerformance('interaction_response', duration, null, {
              element: target.tagName,
              text: target.textContent?.slice(0, 50),
              url: window.location.href
            })
          }
        }
        
        // Track response time after a short delay
        setTimeout(trackInteraction, 100)
        interactionCount++
      }
    })

    // Track form submissions (always track these as they're important)
    document.addEventListener('submit', (event) => {
      const startTime = performance.now()
      const form = event.target
      
      const trackSubmission = () => {
        const duration = performance.now() - startTime
        analytics.trackPerformance('form_submission', duration, null, {
          formId: form.id || 'unknown',
          formAction: form.action
        })
      }
      
      setTimeout(trackSubmission, 100)
    })
  }

  trackResourceLoading() {
    // Track image loading performance (only slow loads)
    const imageObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.initiatorType === 'img') {
          const duration = entry.responseEnd - entry.startTime
          
          // Only track slow image loads (>2 seconds) to reduce noise
          if (duration > 2000) {
            analytics.trackPerformance('image_load', duration, null, {
              url: entry.name,
              size: entry.transferSize || 0
            })
            
            analytics.trackError('slow_image_load', `Image took ${duration}ms to load: ${entry.name}`, null)
          }
        }
      })
    })
    
    imageObserver.observe({ entryTypes: ['resource'] })
  }

  // Track custom performance metrics
  trackCustomMetric(name, value, buildId = null, properties = {}) {
    this.metrics[name] = value
    analytics.trackPerformance(name, value, buildId, properties)
  }

  // Get performance summary
  getPerformanceSummary() {
    return {
      metrics: this.metrics,
      timestamp: Date.now(),
      url: window.location.href
    }
  }

  // Track build-specific performance
  trackBuildPerformance(buildId, action, duration) {
    this.trackCustomMetric(`build_${action}`, duration, buildId, {
      action,
      buildId
    })
  }

  // Track API call performance
  trackApiCall(url, method, duration, status) {
    this.trackCustomMetric('api_call', duration, null, {
      url,
      method,
      status
    })
    
    // Track slow API calls
    if (duration > 5000) {
      analytics.trackError('slow_api_call', `${method} ${url} took ${duration}ms`, null)
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor()

// Export for use throughout the app
export default performanceMonitor

// Helper function to wrap API calls with performance tracking
export function trackApiCall(url, method, promise) {
  const startTime = performance.now()
  
  return promise
    .then((response) => {
      const duration = performance.now() - startTime
      performanceMonitor.trackApiCall(url, method, duration, response.status)
      return response
    })
    .catch((error) => {
      const duration = performance.now() - startTime
      performanceMonitor.trackApiCall(url, method, duration, 'error')
      throw error
    })
}
