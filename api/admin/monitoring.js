// Performance Monitoring and System Health API
// Provides comprehensive system monitoring and health checks

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { adminAuth } from '../../lib/adminAuth.js'

const router = express.Router()

// Admin authentication middleware for all routes
router.use(adminAuth.validateAdminAccess.bind(adminAuth))

// System health check schema
const healthCheckSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['database', 'api', 'external', 'internal']),
  endpoint: z.string().optional(),
  timeout: z.number().int().min(1000).max(30000).default(5000),
  expectedStatus: z.number().int().min(200).max(599).default(200),
  isEnabled: z.boolean().default(true)
})

// Get system health dashboard
router.get('/health', async (req, res) => {
  try {
    const db = await getDb()
    
    // Get system metrics
    const systemMetrics = await getSystemMetrics()
    
    // Get database health
    const databaseHealth = await getDatabaseHealth(db)
    
    // Get API health
    const apiHealth = await getAPIHealth()
    
    // Get external service health
    const externalHealth = await getExternalServiceHealth()
    
    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics()
    
    // Calculate overall health score
    const healthScore = calculateHealthScore({
      database: databaseHealth,
      api: apiHealth,
      external: externalHealth,
      performance: performanceMetrics
    })

    res.json({
      success: true,
      data: {
        overall: {
          status: healthScore.status,
          score: healthScore.score,
          lastChecked: new Date()
        },
        database: databaseHealth,
        api: apiHealth,
        external: externalHealth,
        performance: performanceMetrics,
        system: systemMetrics
      }
    })
  } catch (error) {
    console.error('System health API error:', error)
    res.status(500).json({ error: 'Failed to fetch system health' })
  }
})

// Get system metrics
async function getSystemMetrics() {
  const memoryUsage = process.memoryUsage()
  const uptime = process.uptime()
  
  return {
    memory: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      usagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    },
    uptime: {
      seconds: uptime,
      formatted: formatUptime(uptime)
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuUsage: process.cpuUsage()
  }
}

// Get database health
async function getDatabaseHealth(db) {
  try {
    const startTime = Date.now()
    
    // Test database connection
    await db.admin().ping()
    
    const responseTime = Date.now() - startTime
    
    // Get database stats
    const stats = await db.stats()
    
    // Get collection counts
    const collections = await db.listCollections().toArray()
    const collectionStats = await Promise.all(
      collections.map(async (collection) => {
        const count = await db.collection(collection.name).countDocuments()
        return {
          name: collection.name,
          count
        }
      })
    )
    
    return {
      status: 'healthy',
      responseTime,
      stats: {
        collections: collections.length,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        storageSize: stats.storageSize
      },
      collections: collectionStats
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: null
    }
  }
}

// Get API health
async function getAPIHealth() {
  try {
    const startTime = Date.now()
    
    // Test internal API endpoint
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      timeout: 5000
    })
    
    const responseTime = Date.now() - startTime
    
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime,
      statusCode: response.status,
      lastChecked: new Date()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: null
    }
  }
}

// Get external service health
async function getExternalServiceHealth() {
  const services = [
    {
      name: 'Clerk Authentication',
      url: 'https://api.clerk.com/v1/health',
      type: 'external'
    },
    {
      name: 'Cloudinary',
      url: 'https://api.cloudinary.com/v1_1/health',
      type: 'external'
    }
  ]
  
  const healthChecks = await Promise.all(
    services.map(async (service) => {
      try {
        const startTime = Date.now()
        const response = await fetch(service.url, {
          method: 'GET',
          timeout: 5000
        })
        const responseTime = Date.now() - startTime
        
        return {
          name: service.name,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
          statusCode: response.status,
          lastChecked: new Date()
        }
      } catch (error) {
        return {
          name: service.name,
          status: 'unhealthy',
          error: error.message,
          responseTime: null,
          lastChecked: new Date()
        }
      }
    })
  )
  
  return healthChecks
}

// Get performance metrics
async function getPerformanceMetrics() {
  const db = await getDb()
  
  try {
    // Get API response times from audit logs
    const responseTimes = await db.collection('audit_logs').aggregate([
      { $match: { 
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        responseTime: { $exists: true }
      }},
      { $group: {
        _id: null,
        avgResponseTime: { $avg: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        count: { $sum: 1 }
      }}
    ]).toArray()
    
    // Get error rates
    const errorRates = await db.collection('audit_logs').aggregate([
      { $match: { 
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }},
      { $group: {
        _id: '$severity',
        count: { $sum: 1 }
      }}
    ]).toArray()
    
    const totalRequests = errorRates.reduce((sum, item) => sum + item.count, 0)
    const errorCount = errorRates
      .filter(item => item._id === 'error' || item._id === 'critical')
      .reduce((sum, item) => sum + item.count, 0)
    
    return {
      responseTime: responseTimes[0] || {},
      errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
      totalRequests,
      errorCount
    }
  } catch (error) {
    return {
      error: error.message
    }
  }
}

// Calculate overall health score
function calculateHealthScore(healthData) {
  let score = 100
  let status = 'healthy'
  
  // Database health impact
  if (healthData.database.status !== 'healthy') {
    score -= 30
    status = 'degraded'
  }
  
  // API health impact
  if (healthData.api.status !== 'healthy') {
    score -= 25
    status = 'degraded'
  }
  
  // External service health impact
  const unhealthyExternal = healthData.external.filter(service => service.status !== 'healthy')
  if (unhealthyExternal.length > 0) {
    score -= unhealthyExternal.length * 10
    if (score < 70) status = 'degraded'
  }
  
  // Performance impact
  if (healthData.performance.errorRate > 5) {
    score -= 20
    status = 'degraded'
  }
  
  if (score < 50) {
    status = 'unhealthy'
  }
  
  return {
    score: Math.max(0, score),
    status
  }
}

// Format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  return `${days}d ${hours}h ${minutes}m`
}

// Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const { range = '24h' } = req.query
    const db = await getDb()
    
    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (
      range === '1h' ? 60 * 60 * 1000 :
      range === '24h' ? 24 * 60 * 60 * 1000 :
      range === '7d' ? 7 * 24 * 60 * 60 * 1000 :
      24 * 60 * 60 * 1000
    ))
    
    // Get API performance metrics
    const apiMetrics = await db.collection('audit_logs').aggregate([
      { $match: { 
        timestamp: { $gte: startDate },
        responseTime: { $exists: true }
      }},
      { $group: {
        _id: {
          hour: { $hour: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        avgResponseTime: { $avg: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        requestCount: { $sum: 1 },
        errorCount: { $sum: { $cond: [{ $in: ['$severity', ['error', 'critical']] }, 1, 0] } }
      }},
      { $sort: { '_id.day': 1, '_id.hour': 1 } }
    ]).toArray()
    
    // Get endpoint performance
    const endpointMetrics = await db.collection('audit_logs').aggregate([
      { $match: { 
        timestamp: { $gte: startDate },
        resource: { $exists: true }
      }},
      { $group: {
        _id: '$resource',
        avgResponseTime: { $avg: '$responseTime' },
        requestCount: { $sum: 1 },
        errorCount: { $sum: { $cond: [{ $in: ['$severity', ['error', 'critical']] }, 1, 0] } }
      }},
      { $sort: { requestCount: -1 } },
      { $limit: 10 }
    ]).toArray()
    
    // Get error trends
    const errorTrends = await db.collection('audit_logs').aggregate([
      { $match: { 
        timestamp: { $gte: startDate },
        severity: { $in: ['error', 'critical'] }
      }},
      { $group: {
        _id: {
          hour: { $hour: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        errorCount: { $sum: 1 }
      }},
      { $sort: { '_id.day': 1, '_id.hour': 1 } }
    ]).toArray()
    
    res.json({
      success: true,
      data: {
        timeRange: range,
        apiMetrics,
        endpointMetrics,
        errorTrends
      }
    })
  } catch (error) {
    console.error('Performance metrics API error:', error)
    res.status(500).json({ error: 'Failed to fetch performance metrics' })
  }
})

// Get system alerts
router.get('/alerts', async (req, res) => {
  try {
    const db = await getDb()
    
    // Get recent alerts
    const alerts = await db.collection('system_alerts')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    
    // Get alert statistics
    const alertStats = await db.collection('system_alerts').aggregate([
      { $group: {
        _id: '$severity',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()
    
    res.json({
      success: true,
      data: {
        alerts,
        statistics: {
          bySeverity: alertStats
        }
      }
    })
  } catch (error) {
    console.error('System alerts API error:', error)
    res.status(500).json({ error: 'Failed to fetch system alerts' })
  }
})

// Create system alert
router.post('/alerts', async (req, res) => {
  try {
    const { 
      title, 
      message, 
      severity = 'medium',
      type = 'system',
      metadata = {}
    } = req.body
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' })
    }
    
    const db = await getDb()
    const alertsCollection = db.collection('system_alerts')
    
    const alert = {
      title,
      message,
      severity,
      type,
      metadata,
      status: 'active',
      createdAt: new Date(),
      createdBy: req.adminUser?.userId || 'system'
    }
    
    const result = await alertsCollection.insertOne(alert)
    
    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...alert }
    })
  } catch (error) {
    console.error('System alert creation API error:', error)
    res.status(500).json({ error: 'Failed to create system alert' })
  }
})

// Get system logs
router.get('/logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      level,
      source,
      dateFrom,
      dateTo,
      sort = 'timestamp',
      order = 'desc'
    } = req.query
    
    const db = await getDb()
    const logsCollection = db.collection('system_logs')
    
    // Build filter
    const filter = {}
    if (level) filter.level = level
    if (source) filter.source = source
    
    if (dateFrom || dateTo) {
      filter.timestamp = {}
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom)
      if (dateTo) filter.timestamp.$lte = new Date(dateTo)
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1
    
    // Get logs
    const logs = await logsCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()
    
    // Get total count
    const total = await logsCollection.countDocuments(filter)
    
    // Get log statistics
    const stats = await logsCollection.aggregate([
      { $group: {
        _id: '$level',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        statistics: {
          byLevel: stats
        }
      }
    })
  } catch (error) {
    console.error('System logs API error:', error)
    res.status(500).json({ error: 'Failed to fetch system logs' })
  }
})

// Get system configuration
router.get('/config', async (req, res) => {
  try {
    const config = {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      features: {
        clerk: !!process.env.CLERK_SECRET_KEY,
        cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
        mongodb: !!process.env.MONGODB_URI,
        adminAuth: process.env.ADMIN_AUTH_DISABLED !== 'true'
      },
      limits: {
        maxFileSize: '10MB',
        maxRequestSize: '1MB',
        rateLimit: '100 requests per minute'
      }
    }
    
    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('System config API error:', error)
    res.status(500).json({ error: 'Failed to fetch system configuration' })
  }
})

export default router
