// Advanced Security and Audit System API
// Provides comprehensive security monitoring and audit logging

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'

const router = express.Router()

// Security event schema
const securityEventSchema = z.object({
  type: z.enum(['login', 'logout', 'failed_login', 'permission_denied', 'data_access', 'data_modification', 'system_change', 'suspicious_activity']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1).max(500),
  userId: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// Get security events and audit logs
router.get('/events', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      severity,
      userId,
      resource,
      dateFrom,
      dateTo,
      sort = 'timestamp',
      order = 'desc'
    } = req.query

    const db = await getDb()
    const auditLogsCollection = db.collection('audit_logs')

    // Build filter
    const filter = {}
    if (type) filter.type = type
    if (severity) filter.severity = severity
    if (userId) filter.userId = userId
    if (resource) filter.resource = resource
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.timestamp = {}
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom)
      if (dateTo) filter.timestamp.$lte = new Date(dateTo)
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get security events
    const events = await auditLogsCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await auditLogsCollection.countDocuments(filter)

    // Get security statistics
    const stats = await auditLogsCollection.aggregate([
      { $group: {
        _id: '$severity',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    const typeStats = await auditLogsCollection.aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        statistics: {
          bySeverity: stats,
          byType: typeStats
        }
      }
    })
  } catch (error) {
    console.error('Security events API error:', error)
    res.status(500).json({ error: 'Failed to fetch security events' })
  }
})

// Get security dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { range = '7d' } = req.query
    const db = await getDb()
    const auditLogsCollection = db.collection('audit_logs')

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '1d' ? 1 : range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)

    // Get security metrics
    const securityMetrics = await auditLogsCollection.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        criticalEvents: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highEvents: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        failedLogins: { $sum: { $cond: [{ $eq: ['$type', 'failed_login'] }, 1, 0] } },
        permissionDenied: { $sum: { $cond: [{ $eq: ['$type', 'permission_denied'] }, 1, 0] } }
      }}
    ]).toArray()

    // Get daily security trends
    const dailyTrends = await auditLogsCollection.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        totalEvents: { $sum: 1 },
        criticalEvents: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        failedLogins: { $sum: { $cond: [{ $eq: ['$type', 'failed_login'] }, 1, 0] } }
      }},
      { $sort: { '_id': 1 } }
    ]).toArray()

    // Get top users by activity
    const topUsers = await auditLogsCollection.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: {
        _id: '$userId',
        eventCount: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }},
      { $sort: { eventCount: -1 } },
      { $limit: 10 }
    ]).toArray()

    // Get suspicious activities
    const suspiciousActivities = await auditLogsCollection.aggregate([
      { $match: { 
        timestamp: { $gte: startDate },
        severity: { $in: ['high', 'critical'] }
      }},
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        latestEvent: { $max: '$timestamp' }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    res.json({
      success: true,
      data: {
        timeRange: range,
        metrics: securityMetrics[0] || {},
        dailyTrends,
        topUsers,
        suspiciousActivities
      }
    })
  } catch (error) {
    console.error('Security dashboard API error:', error)
    res.status(500).json({ error: 'Failed to fetch security dashboard' })
  }
})

// Create security event
router.post('/events', async (req, res) => {
  try {
    const eventData = await validateRequest(req, securityEventSchema)
    const db = await getDb()
    const auditLogsCollection = db.collection('audit_logs')

    const newEvent = {
      ...eventData,
      timestamp: new Date(),
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    const result = await auditLogsCollection.insertOne(newEvent)

    // If critical event, trigger alerts
    if (eventData.severity === 'critical') {
      await triggerSecurityAlert(newEvent)
    }

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newEvent }
    })
  } catch (error) {
    console.error('Security event creation API error:', error)
    res.status(500).json({ error: 'Failed to create security event' })
  }
})

// Trigger security alert
async function triggerSecurityAlert(event) {
  try {
    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    // Create critical security notification
    const alert = {
      title: 'Critical Security Event',
      message: `Critical security event detected: ${event.description}`,
      type: 'error',
      category: 'security',
      priority: 'urgent',
      metadata: {
        eventId: event.id,
        eventType: event.type,
        severity: event.severity,
        userId: event.userId,
        ipAddress: event.ipAddress
      },
      createdBy: 'system',
      createdAt: new Date(),
      readBy: [],
      status: 'active'
    }

    await notificationsCollection.insertOne(alert)
  } catch (error) {
    console.error('Failed to trigger security alert:', error)
  }
}

// Get user activity summary
router.get('/users/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params
    const { range = '30d' } = req.query
    const db = await getDb()
    const auditLogsCollection = db.collection('audit_logs')

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)

    // Get user activity
    const userActivity = await auditLogsCollection.aggregate([
      { $match: { 
        userId,
        timestamp: { $gte: startDate }
      }},
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' },
        severity: { $max: '$severity' }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get user session summary
    const sessionSummary = await auditLogsCollection.aggregate([
      { $match: { 
        userId,
        type: { $in: ['login', 'logout'] },
        timestamp: { $gte: startDate }
      }},
      { $group: {
        _id: null,
        totalLogins: { $sum: { $cond: [{ $eq: ['$type', 'login'] }, 1, 0] } },
        totalLogouts: { $sum: { $cond: [{ $eq: ['$type', 'logout'] }, 1, 0] } },
        lastLogin: { $max: { $cond: [{ $eq: ['$type', 'login'] }, '$timestamp', null] } },
        lastLogout: { $max: { $cond: [{ $eq: ['$type', 'logout'] }, '$timestamp', null] } }
      }}
    ]).toArray()

    // Get IP addresses used
    const ipAddresses = await auditLogsCollection.distinct('ipAddress', {
      userId,
      timestamp: { $gte: startDate },
      ipAddress: { $exists: true, $ne: null }
    })

    res.json({
      success: true,
      data: {
        userId,
        timeRange: range,
        activity: userActivity,
        sessionSummary: sessionSummary[0] || {},
        ipAddresses
      }
    })
  } catch (error) {
    console.error('User activity API error:', error)
    res.status(500).json({ error: 'Failed to fetch user activity' })
  }
})

// Get security recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const db = await getDb()
    const auditLogsCollection = db.collection('audit_logs')

    // Get recent security events
    const recentEvents = await auditLogsCollection.find({
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(100).toArray()

    const recommendations = []

    // Analyze failed logins
    const failedLogins = recentEvents.filter(event => event.type === 'failed_login')
    if (failedLogins.length > 10) {
      recommendations.push({
        id: 'failed-login-threshold',
        type: 'security',
        priority: 'high',
        title: 'High Failed Login Attempts',
        description: `${failedLogins.length} failed login attempts detected in the last 7 days.`,
        recommendation: 'Consider implementing account lockout policies and rate limiting.',
        actionItems: [
          'Implement account lockout after 5 failed attempts',
          'Add rate limiting for login endpoints',
          'Enable two-factor authentication',
          'Review and strengthen password policies'
        ]
      })
    }

    // Analyze permission denials
    const permissionDenials = recentEvents.filter(event => event.type === 'permission_denied')
    if (permissionDenials.length > 5) {
      recommendations.push({
        id: 'permission-denial-pattern',
        type: 'security',
        priority: 'medium',
        title: 'Frequent Permission Denials',
        description: `${permissionDenials.length} permission denials detected in the last 7 days.`,
        recommendation: 'Review user permissions and access patterns.',
        actionItems: [
          'Audit user permissions',
          'Review access control policies',
          'Provide additional training to users',
          'Consider role-based access improvements'
        ]
      })
    }

    // Analyze suspicious activities
    const suspiciousActivities = recentEvents.filter(event => 
      event.severity === 'high' || event.severity === 'critical'
    )
    if (suspiciousActivities.length > 0) {
      recommendations.push({
        id: 'suspicious-activity-detected',
        type: 'security',
        priority: 'critical',
        title: 'Suspicious Activities Detected',
        description: `${suspiciousActivities.length} suspicious activities detected in the last 7 days.`,
        recommendation: 'Immediate investigation and response required.',
        actionItems: [
          'Investigate suspicious activities',
          'Review system logs',
          'Consider temporary access restrictions',
          'Notify security team'
        ]
      })
    }

    res.json({
      success: true,
      data: {
        recommendations,
        totalRecommendations: recommendations.length,
        generatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Security recommendations API error:', error)
    res.status(500).json({ error: 'Failed to generate security recommendations' })
  }
})

// Export security logs
router.get('/export', async (req, res) => {
  try {
    const { 
      format = 'csv',
      type,
      severity,
      dateFrom,
      dateTo,
      limit = 10000
    } = req.query

    const db = await getDb()
    const auditLogsCollection = db.collection('audit_logs')

    // Build filter
    const filter = {}
    if (type) filter.type = type
    if (severity) filter.severity = severity
    
    if (dateFrom || dateTo) {
      filter.timestamp = {}
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom)
      if (dateTo) filter.timestamp.$lte = new Date(dateTo)
    }

    // Get security events
    const events = await auditLogsCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .toArray()

    if (format === 'csv') {
      // Convert to CSV
      const csvContent = convertSecurityLogsToCSV(events)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="security-logs-${Date.now()}.csv"`)
      res.send(csvContent)
    } else {
      res.json({
        success: true,
        data: {
          events,
          totalEvents: events.length,
          exportedAt: new Date()
        }
      })
    }
  } catch (error) {
    console.error('Security export API error:', error)
    res.status(500).json({ error: 'Failed to export security logs' })
  }
})

// Convert security logs to CSV
function convertSecurityLogsToCSV(events) {
  if (!events || events.length === 0) {
    return 'timestamp,type,severity,description,userId,ipAddress,resource,action\n'
  }

  const headers = ['timestamp', 'type', 'severity', 'description', 'userId', 'ipAddress', 'resource', 'action']
  const csvContent = [
    headers.join(','),
    ...events.map(event => 
      headers.map(header => {
        const value = event[header] || ''
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  return csvContent
}

export default router
