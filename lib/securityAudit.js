// Security audit logging utility for compliance and monitoring
import { createHash } from 'crypto'

// Security event types
export const SECURITY_EVENTS = {
  // Authentication events
  AUTH_LOGIN_SUCCESS: 'auth_login_success',
  AUTH_LOGIN_FAILURE: 'auth_login_failure',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_PASSWORD_CHANGE: 'auth_password_change',
  AUTH_PASSWORD_RESET: 'auth_password_reset',
  AUTH_2FA_ENABLE: 'auth_2fa_enable',
  AUTH_2FA_DISABLE: 'auth_2fa_disable',
  
  // Authorization events
  AUTH_ACCESS_GRANTED: 'auth_access_granted',
  AUTH_ACCESS_DENIED: 'auth_access_denied',
  AUTH_ROLE_CHANGE: 'auth_role_change',
  AUTH_PERMISSION_GRANT: 'auth_permission_grant',
  AUTH_PERMISSION_REVOKE: 'auth_permission_revoke',
  
  // Data access events
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  DATA_DELETION: 'data_deletion',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  
  // Security incidents
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_INPUT: 'invalid_input',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  PATH_TRAVERSAL_ATTEMPT: 'path_traversal_attempt',
  
  // System events
  SYSTEM_STARTUP: 'system_startup',
  SYSTEM_SHUTDOWN: 'system_shutdown',
  CONFIGURATION_CHANGE: 'configuration_change',
  BACKUP_CREATED: 'backup_created',
  BACKUP_RESTORED: 'backup_restored',
  
  // Compliance events
  GDPR_REQUEST: 'gdpr_request',
  CPRA_REQUEST: 'cpra_request',
  DATA_BREACH: 'data_breach',
  AUDIT_REPORT: 'audit_report',
  COMPLIANCE_CHECK: 'compliance_check'
}

// Security event severity levels
export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

// Security audit logger class
export class SecurityAuditLogger {
  constructor(options = {}) {
    this.enabled = options.enabled !== false
    this.logLevel = options.logLevel || 'info'
    this.maxLogSize = options.maxLogSize || 1000
    this.retentionDays = options.retentionDays || 90
    this.logs = []
    this.sensitiveFields = options.sensitiveFields || ['password', 'token', 'secret', 'key']
    
    // Initialize audit log
    this.initializeAuditLog()
  }

  // Initialize audit log
  initializeAuditLog() {
    try {
      // Load existing logs from storage
      const stored = localStorage.getItem('security_audit_log')
      if (stored) {
        this.logs = JSON.parse(stored)
        this.cleanupOldLogs()
      }
    } catch (error) {
      console.warn('Failed to load security audit log:', error)
    }
  }

  // Log security event
  logEvent(eventType, details = {}, severity = SEVERITY_LEVELS.MEDIUM) {
    if (!this.enabled) return

    const event = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      details: this.sanitizeDetails(details),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
      ipAddress: 'client-side', // Will be set server-side
      hash: this.generateEventHash(eventType, details)
    }

    // Add to logs
    this.logs.push(event)
    
    // Maintain log size
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize)
    }

    // Save to storage
    this.saveLogs()

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 Security Event: ${eventType}`, event)
    }

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('securityEvent', { detail: event }))

    return event.id
  }

  // Log authentication success
  logAuthSuccess(userId, method = 'password', metadata = {}) {
    return this.logEvent(SECURITY_EVENTS.AUTH_LOGIN_SUCCESS, {
      userId,
      method,
      metadata
    }, SEVERITY_LEVELS.LOW)
  }

  // Log authentication failure
  logAuthFailure(userId, method = 'password', reason = 'invalid_credentials', metadata = {}) {
    return this.logEvent(SECURITY_EVENTS.AUTH_LOGIN_FAILURE, {
      userId,
      method,
      reason,
      metadata
    }, SEVERITY_LEVELS.MEDIUM)
  }

  // Log access attempt
  logAccessAttempt(resource, action, userId = null, granted = false, metadata = {}) {
    const eventType = granted ? SECURITY_EVENTS.AUTH_ACCESS_GRANTED : SECURITY_EVENTS.AUTH_ACCESS_DENIED
    const severity = granted ? SEVERITY_LEVELS.LOW : SEVERITY_LEVELS.HIGH
    
    return this.logEvent(eventType, {
      resource,
      action,
      userId,
      granted,
      metadata
    }, severity)
  }

  // Log suspicious activity
  logSuspiciousActivity(activity, details = {}, severity = SEVERITY_LEVELS.HIGH) {
    return this.logEvent(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, {
      activity,
      details
    }, severity)
  }

  // Log security incident
  logSecurityIncident(incidentType, details = {}, severity = SEVERITY_LEVELS.CRITICAL) {
    return this.logEvent(incidentType, {
      details
    }, severity)
  }

  // Log data access
  logDataAccess(dataType, action, userId, recordId = null, metadata = {}) {
    return this.logEvent(SECURITY_EVENTS.DATA_ACCESS, {
      dataType,
      action,
      userId,
      recordId,
      metadata
    }, SEVERITY_LEVELS.LOW)
  }

  // Log data modification
  logDataModification(dataType, action, userId, recordId, changes = {}, metadata = {}) {
    return this.logEvent(SECURITY_EVENTS.DATA_MODIFICATION, {
      dataType,
      action,
      userId,
      recordId,
      changes,
      metadata
    }, SEVERITY_LEVELS.MEDIUM)
  }

  // Log compliance request
  logComplianceRequest(requestType, userId, details = {}) {
    const eventType = requestType === 'gdpr' ? SECURITY_EVENTS.GDPR_REQUEST : SECURITY_EVENTS.CPRA_REQUEST
    
    return this.logEvent(eventType, {
      requestType,
      userId,
      details
    }, SEVERITY_LEVELS.MEDIUM)
  }

  // Sanitize sensitive details
  sanitizeDetails(details) {
    const sanitized = { ...details }
    
    for (const field of this.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    }
    
    return sanitized
  }

  // Generate unique event ID
  generateEventId() {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Generate event hash for integrity
  generateEventHash(eventType, details) {
    const data = JSON.stringify({ eventType, details, timestamp: Date.now() })
    return createHash('sha256').update(data).digest('hex')
  }

  // Get session ID
  getSessionId() {
    return sessionStorage.getItem('session_id') || 'unknown'
  }

  // Save logs to storage
  saveLogs() {
    try {
      localStorage.setItem('security_audit_log', JSON.stringify(this.logs))
    } catch (error) {
      console.error('Failed to save security audit log:', error)
    }
  }

  // Cleanup old logs
  cleanupOldLogs() {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays)
    
    this.logs = this.logs.filter(log => {
      const logDate = new Date(log.timestamp)
      return logDate > cutoffDate
    })
  }

  // Get logs by criteria
  getLogs(criteria = {}) {
    let filtered = [...this.logs]
    
    if (criteria.eventType) {
      filtered = filtered.filter(log => log.eventType === criteria.eventType)
    }
    
    if (criteria.severity) {
      filtered = filtered.filter(log => log.severity === criteria.severity)
    }
    
    if (criteria.userId) {
      filtered = filtered.filter(log => log.details.userId === criteria.userId)
    }
    
    if (criteria.startDate) {
      const start = new Date(criteria.startDate)
      filtered = filtered.filter(log => new Date(log.timestamp) >= start)
    }
    
    if (criteria.endDate) {
      const end = new Date(criteria.endDate)
      filtered = filtered.filter(log => new Date(log.timestamp) <= end)
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  // Get security statistics
  getSecurityStats(timeframe = '30d') {
    const now = new Date()
    let startDate
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    const recentLogs = this.getLogs({ startDate })
    
    const stats = {
      totalEvents: recentLogs.length,
      byEventType: {},
      bySeverity: {},
      byUser: {},
      suspiciousActivity: 0,
      failedAuthAttempts: 0,
      successfulAuthAttempts: 0
    }
    
    recentLogs.forEach(log => {
      // Count by event type
      stats.byEventType[log.eventType] = (stats.byEventType[log.eventType] || 0) + 1
      
      // Count by severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1
      
      // Count by user
      if (log.details.userId) {
        stats.byUser[log.details.userId] = (stats.byUser[log.details.userId] || 0) + 1
      }
      
      // Count specific events
      if (log.eventType === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY) {
        stats.suspiciousActivity++
      } else if (log.eventType === SECURITY_EVENTS.AUTH_LOGIN_FAILURE) {
        stats.failedAuthAttempts++
      } else if (log.eventType === SECURITY_EVENTS.AUTH_LOGIN_SUCCESS) {
        stats.successfulAuthAttempts++
      }
    })
    
    return stats
  }

  // Export logs for compliance
  exportLogs(format = 'json', criteria = {}) {
    const logs = this.getLogs(criteria)
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2)
      case 'csv':
        return this.convertToCSV(logs)
      default:
        return logs
    }
  }

  // Convert logs to CSV
  convertToCSV(logs) {
    if (logs.length === 0) return ''
    
    const headers = Object.keys(logs[0])
    const csvRows = [headers.join(',')]
    
    logs.forEach(log => {
      const values = headers.map(header => {
        const value = log[header]
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }
        return `"${String(value).replace(/"/g, '""')}"`
      })
      csvRows.push(values.join(','))
    })
    
    return csvRows.join('\n')
  }

  // Clear all logs
  clearLogs() {
    this.logs = []
    this.saveLogs()
  }
}

// Create default instance
export const securityAuditLogger = new SecurityAuditLogger()

// Export convenience functions
export const logSecurityEvent = (eventType, details, severity) => 
  securityAuditLogger.logEvent(eventType, details, severity)

export const logAuthSuccess = (userId, method, metadata) => 
  securityAuditLogger.logAuthSuccess(userId, method, metadata)

export const logAuthFailure = (userId, method, reason, metadata) => 
  securityAuditLogger.logAuthFailure(userId, method, reason, metadata)

export const logAccessAttempt = (resource, action, userId, granted, metadata) => 
  securityAuditLogger.logAccessAttempt(resource, action, userId, granted, metadata)

export const logSuspiciousActivity = (activity, details, severity) => 
  securityAuditLogger.logSuspiciousActivity(activity, details, severity)

export const logSecurityIncident = (incidentType, details, severity) => 
  securityAuditLogger.logSecurityIncident(incidentType, details, severity)

export const logDataAccess = (dataType, action, userId, recordId, metadata) => 
  securityAuditLogger.logDataAccess(dataType, action, userId, recordId, metadata)

export const logDataModification = (dataType, action, userId, recordId, changes, metadata) => 
  securityAuditLogger.logDataModification(dataType, action, userId, recordId, changes, metadata)

export const logComplianceRequest = (requestType, userId, details) => 
  securityAuditLogger.logComplianceRequest(requestType, userId, details)

// Export default instance
export default securityAuditLogger
