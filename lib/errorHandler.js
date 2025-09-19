/**
 * Enterprise Error Handling System
 * Comprehensive error handling, monitoring, and alerting for production
 */

export class ErrorHandler {
  constructor() {
    this.errorCounts = new Map()
    this.lastErrors = []
    this.maxErrorHistory = 100
  }

  /**
   * Handle API response with comprehensive error checking
   */
  async handleResponse(res, operation, callback) {
    try {
      // Check if response was already sent
      if (res.headersSent) {
        console.warn(`[ERROR_HANDLER] Response already sent for ${operation}`)
        return
      }

      const result = await callback()
      
      // Check again before sending response
      if (!res.headersSent) {
        res.json(result)
      }
    } catch (error) {
      await this.handleError(error, { operation, res })
    }
  }

  /**
   * Comprehensive error handling with categorization and monitoring
   */
  async handleError(error, context = {}) {
    const { operation, res, req } = context
    
    // Categorize error
    const errorCategory = this.categorizeError(error)
    const errorId = this.generateErrorId()
    
    // Log error with full context
    const errorLog = {
      id: errorId,
      timestamp: new Date().toISOString(),
      category: errorCategory,
      operation: operation || 'unknown',
      message: error?.message || String(error),
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      context: {
        url: req?.url,
        method: req?.method,
        userAgent: req?.headers?.['user-agent'],
        ip: req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress
      }
    }
    
    // Store error for monitoring
    this.trackError(errorLog)
    
    // Log to console with appropriate level
    if (errorCategory === 'critical') {
      console.error('[CRITICAL_ERROR]', errorLog)
    } else if (errorCategory === 'warning') {
      console.warn('[WARNING_ERROR]', errorLog)
    } else {
      console.log('[INFO_ERROR]', errorLog)
    }
    
    // Send appropriate response if not already sent
    if (res && !res.headersSent) {
      const statusCode = this.getStatusCode(errorCategory, error)
      const response = this.getErrorResponse(errorCategory, error, errorId)
      
      res.status(statusCode).json(response)
    }
    
    // Alert on critical errors
    if (errorCategory === 'critical') {
      await this.sendAlert(errorLog)
    }
  }

  /**
   * Categorize errors by type and severity
   */
  categorizeError(error) {
    const message = error?.message?.toLowerCase() || ''
    const code = error?.code
    
    // Critical errors that require immediate attention
    if (
      message.includes('eaddrinuse') ||
      message.includes('econnrefused') ||
      message.includes('out of memory') ||
      message.includes('segmentation fault') ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT'
    ) {
      return 'critical'
    }
    
    // Database errors
    if (
      message.includes('mongoserverselectionerror') ||
      message.includes('mongonetworkerror') ||
      message.includes('tlsv1 alert internal error') ||
      message.includes('connection failed') ||
      message.includes('authentication failed')
    ) {
      return 'database'
    }
    
    // HTTP and API errors
    if (
      message.includes('headers sent') ||
      message.includes('cannot set headers') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'http'
    }
    
    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('schema')
    ) {
      return 'validation'
    }
    
    // External service errors
    if (
      message.includes('clerk') ||
      message.includes('stripe') ||
      message.includes('docuseal') ||
      message.includes('cloudinary')
    ) {
      return 'external'
    }
    
    return 'general'
  }

  /**
   * Get appropriate HTTP status code for error category
   */
  getStatusCode(category, error) {
    const message = error?.message?.toLowerCase() || ''
    
    switch (category) {
      case 'critical':
        return 503 // Service Unavailable
      case 'database':
        return 503 // Service Unavailable
      case 'http':
        if (message.includes('unauthorized')) return 401
        if (message.includes('forbidden')) return 403
        if (message.includes('headers sent')) return 500
        return 500
      case 'validation':
        return 400 // Bad Request
      case 'external':
        return 502 // Bad Gateway
      default:
        return 500 // Internal Server Error
    }
  }

  /**
   * Get user-friendly error response
   */
  getErrorResponse(category, error, errorId) {
    const baseResponse = {
      success: false,
      errorId,
      timestamp: new Date().toISOString()
    }
    
    switch (category) {
      case 'critical':
        return {
          ...baseResponse,
          error: 'service_unavailable',
          message: 'The service is temporarily unavailable. Please try again later.',
          retryAfter: 60
        }
      
      case 'database':
        return {
          ...baseResponse,
          error: 'database_unavailable',
          message: 'Database connection failed. Please try again in a moment.',
          retryAfter: 30
        }
      
      case 'http':
        return {
          ...baseResponse,
          error: 'request_failed',
          message: 'Request processing failed. Please check your data and try again.'
        }
      
      case 'validation':
        return {
          ...baseResponse,
          error: 'validation_failed',
          message: 'Invalid data provided. Please check your input and try again.'
        }
      
      case 'external':
        return {
          ...baseResponse,
          error: 'external_service_failed',
          message: 'External service temporarily unavailable. Please try again later.',
          retryAfter: 30
        }
      
      default:
        return {
          ...baseResponse,
          error: 'internal_error',
          message: 'An unexpected error occurred. Please try again later.'
        }
    }
  }

  /**
   * Track errors for monitoring and alerting
   */
  trackError(errorLog) {
    // Add to recent errors
    this.lastErrors.unshift(errorLog)
    if (this.lastErrors.length > this.maxErrorHistory) {
      this.lastErrors.pop()
    }
    
    // Count error occurrences
    const key = `${errorLog.category}:${errorLog.operation}`
    const count = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, count + 1)
    
    // Store in database for long-term monitoring
    this.storeErrorLog(errorLog).catch(console.error)
  }

  /**
   * Store error log in database
   */
  async storeErrorLog(errorLog) {
    try {
      const { getDb } = await import('./db.js')
      const db = await getDb()
      const errorsCol = db.collection('ErrorLogs')
      
      await errorsCol.insertOne({
        ...errorLog,
        createdAt: new Date()
      })
    } catch (error) {
      // Don't throw - just log
      console.error('[ERROR_HANDLER] Failed to store error log:', error.message)
    }
  }

  /**
   * Send alert for critical errors
   */
  async sendAlert(errorLog) {
    try {
      // Check if we've already alerted for this error recently
      const recentSimilarErrors = this.lastErrors.filter(e => 
        e.category === errorLog.category &&
        e.operation === errorLog.operation &&
        new Date(e.timestamp) > new Date(Date.now() - 5 * 60 * 1000) // 5 minutes
      )
      
      if (recentSimilarErrors.length > 3) {
        console.log('[ERROR_HANDLER] Suppressing alert - too many similar errors recently')
        return
      }
      
      // In production, this would send to Slack, email, etc.
      console.error('[ALERT] Critical Error Detected:', {
        id: errorLog.id,
        category: errorLog.category,
        operation: errorLog.operation,
        message: errorLog.message,
        timestamp: errorLog.timestamp
      })
      
      // TODO: Implement actual alerting (Slack webhook, email, etc.)
      
    } catch (error) {
      console.error('[ERROR_HANDLER] Failed to send alert:', error.message)
    }
  }

  /**
   * Generate unique error ID for tracking
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get error statistics for monitoring dashboard
   */
  getErrorStats() {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const recentErrors = this.lastErrors.filter(e => new Date(e.timestamp) > oneHourAgo)
    const dailyErrors = this.lastErrors.filter(e => new Date(e.timestamp) > oneDayAgo)
    
    return {
      total: this.lastErrors.length,
      lastHour: recentErrors.length,
      lastDay: dailyErrors.length,
      byCategory: this.groupByCategory(dailyErrors),
      topErrors: this.getTopErrors(),
      healthStatus: this.getHealthStatus()
    }
  }

  /**
   * Group errors by category
   */
  groupByCategory(errors) {
    return errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {})
  }

  /**
   * Get most frequent errors
   */
  getTopErrors() {
    return Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [category, operation] = key.split(':')
        return { category, operation, count }
      })
  }

  /**
   * Get overall system health status
   */
  getHealthStatus() {
    const recentErrors = this.lastErrors.filter(e => 
      new Date(e.timestamp) > new Date(Date.now() - 5 * 60 * 1000)
    )
    
    const criticalErrors = recentErrors.filter(e => e.category === 'critical')
    
    if (criticalErrors.length > 0) return 'critical'
    if (recentErrors.length > 10) return 'degraded'
    if (recentErrors.length > 5) return 'warning'
    return 'healthy'
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler()

// Process-level error handlers
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT_EXCEPTION]', error)
  errorHandler.handleError(error, { operation: 'uncaught_exception' })
  // Don't exit immediately - let the error handler process it
  setTimeout(() => process.exit(1), 1000)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED_REJECTION]', reason)
  errorHandler.handleError(reason, { operation: 'unhandled_rejection' })
})

export default errorHandler
