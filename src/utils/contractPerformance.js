/**
 * Contract Performance Monitoring and Optimization
 * Tracks performance metrics and implements optimizations
 */

/**
 * Performance metrics collector
 */
class ContractPerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.startTimes = new Map()
    this.thresholds = {
      apiCall: 5000, // 5 seconds
      documentLoad: 10000, // 10 seconds
      statusPoll: 2000, // 2 seconds
      userInteraction: 100 // 100ms
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(operation, context = {}) {
    const key = `${operation}_${Date.now()}_${Math.random()}`
    this.startTimes.set(key, {
      start: performance.now(),
      operation,
      context
    })
    return key
  }

  /**
   * End timing and record metric
   */
  endTimer(key, additionalData = {}) {
    const startData = this.startTimes.get(key)
    if (!startData) return null

    const duration = performance.now() - startData.start
    const metric = {
      operation: startData.operation,
      duration,
      timestamp: Date.now(),
      context: startData.context,
      ...additionalData
    }

    // Store metric
    if (!this.metrics.has(startData.operation)) {
      this.metrics.set(startData.operation, [])
    }
    this.metrics.get(startData.operation).push(metric)

    // Clean up
    this.startTimes.delete(key)

    // Check for performance issues
    this.checkPerformanceThresholds(metric)

    return metric
  }

  /**
   * Check if operation exceeded performance thresholds
   */
  checkPerformanceThresholds(metric) {
    const threshold = this.thresholds[metric.operation]
    if (threshold && metric.duration > threshold) {
      console.warn(`Performance warning: ${metric.operation} took ${metric.duration.toFixed(2)}ms (threshold: ${threshold}ms)`, metric)
      
      // In production, this would send to monitoring service
      this.reportPerformanceIssue(metric)
    }
  }

  /**
   * Report performance issue
   */
  reportPerformanceIssue(metric) {
    const report = {
      type: 'performance_warning',
      operation: metric.operation,
      duration: metric.duration,
      threshold: this.thresholds[metric.operation],
      timestamp: metric.timestamp,
      context: metric.context,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // In production, send to monitoring service
    console.log('[PERFORMANCE_ISSUE]', report)
  }

  /**
   * Get performance statistics
   */
  getStats(operation = null) {
    if (operation) {
      const metrics = this.metrics.get(operation) || []
      return this.calculateStats(metrics)
    }

    const stats = {}
    for (const [op, metrics] of this.metrics.entries()) {
      stats[op] = this.calculateStats(metrics)
    }
    return stats
  }

  /**
   * Calculate statistics for metrics
   */
  calculateStats(metrics) {
    if (metrics.length === 0) return null

    const durations = metrics.map(m => m.duration)
    durations.sort((a, b) => a - b)

    return {
      count: metrics.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)],
      recent: metrics.slice(-10) // Last 10 measurements
    }
  }

  /**
   * Clean up old metrics
   */
  cleanup(maxAge = 60 * 60 * 1000) { // 1 hour
    const cutoff = Date.now() - maxAge
    
    for (const [operation, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff)
      if (filtered.length === 0) {
        this.metrics.delete(operation)
      } else {
        this.metrics.set(operation, filtered)
      }
    }
  }
}

export const performanceMonitor = new ContractPerformanceMonitor()

/**
 * Optimized status polling with backoff
 */
export class OptimizedStatusPoller {
  constructor(pollFunction, options = {}) {
    this.pollFunction = pollFunction
    this.options = {
      initialInterval: 2000, // 2 seconds
      maxInterval: 30000, // 30 seconds
      backoffMultiplier: 1.5,
      maxRetries: 10,
      ...options
    }
    
    this.currentInterval = this.options.initialInterval
    this.retryCount = 0
    this.isPolling = false
    this.pollTimer = null
  }

  start() {
    if (this.isPolling) return
    
    this.isPolling = true
    this.retryCount = 0
    this.currentInterval = this.options.initialInterval
    this.poll()
  }

  stop() {
    this.isPolling = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  async poll() {
    if (!this.isPolling) return

    const timerKey = performanceMonitor.startTimer('statusPoll')

    try {
      const result = await this.pollFunction()
      
      performanceMonitor.endTimer(timerKey, { success: true })
      
      // Reset interval on success
      this.currentInterval = this.options.initialInterval
      this.retryCount = 0

      // Check if we should continue polling
      if (result && result.shouldStop) {
        this.stop()
        return
      }

    } catch (error) {
      performanceMonitor.endTimer(timerKey, { success: false, error: error.message })
      
      console.error('Status poll failed:', error)
      this.retryCount++

      // Increase interval with backoff
      this.currentInterval = Math.min(
        this.currentInterval * this.options.backoffMultiplier,
        this.options.maxInterval
      )

      // Stop if max retries reached
      if (this.retryCount >= this.options.maxRetries) {
        console.error('Max polling retries reached, stopping')
        this.stop()
        return
      }
    }

    // Schedule next poll
    if (this.isPolling) {
      this.pollTimer = setTimeout(() => this.poll(), this.currentInterval)
    }
  }
}

/**
 * Debounced function creator for performance optimization
 */
export function debounce(func, wait, immediate = false) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

/**
 * Throttled function creator for performance optimization
 */
export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Lazy loading utility for heavy components
 */
export function createLazyLoader(importFunction, fallback = null) {
  return {
    component: null,
    loading: false,
    error: null,
    
    async load() {
      if (this.component) return this.component
      if (this.loading) return null
      
      this.loading = true
      const timerKey = performanceMonitor.startTimer('componentLoad')
      
      try {
        const module = await importFunction()
        this.component = module.default || module
        performanceMonitor.endTimer(timerKey, { success: true })
        return this.component
      } catch (error) {
        this.error = error
        performanceMonitor.endTimer(timerKey, { success: false, error: error.message })
        console.error('Component lazy loading failed:', error)
        return fallback
      } finally {
        this.loading = false
      }
    }
  }
}

/**
 * Memory usage monitoring
 */
export function monitorMemoryUsage() {
  if (!performance.memory) return null
  
  const memory = {
    used: performance.memory.usedJSHeapSize,
    total: performance.memory.totalJSHeapSize,
    limit: performance.memory.jsHeapSizeLimit,
    timestamp: Date.now()
  }
  
  // Warn if memory usage is high
  const usagePercent = (memory.used / memory.limit) * 100
  if (usagePercent > 80) {
    console.warn(`High memory usage: ${usagePercent.toFixed(1)}%`, memory)
  }
  
  return memory
}

/**
 * Network performance monitoring
 */
export function monitorNetworkPerformance() {
  if (!navigator.connection) return null
  
  const connection = {
    effectiveType: navigator.connection.effectiveType,
    downlink: navigator.connection.downlink,
    rtt: navigator.connection.rtt,
    saveData: navigator.connection.saveData,
    timestamp: Date.now()
  }
  
  // Adjust behavior for slow connections
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    console.log('Slow connection detected, optimizing experience')
    return { ...connection, optimizeForSlow: true }
  }
  
  return connection
}

/**
 * Document load performance tracking
 */
export function trackDocumentLoadPerformance(documentUrl, startTime) {
  const loadTime = performance.now() - startTime
  
  const metric = {
    operation: 'documentLoad',
    duration: loadTime,
    url: documentUrl,
    timestamp: Date.now()
  }
  
  performanceMonitor.checkPerformanceThresholds(metric)
  
  return metric
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  // Clean up metrics periodically
  setInterval(() => {
    performanceMonitor.cleanup()
  }, 30 * 60 * 1000) // Every 30 minutes
  
  // Monitor memory usage periodically
  setInterval(() => {
    monitorMemoryUsage()
  }, 60 * 1000) // Every minute
  
  // Monitor network performance
  const networkInfo = monitorNetworkPerformance()
  
  return {
    performanceMonitor,
    networkInfo,
    memoryInfo: monitorMemoryUsage()
  }
}
