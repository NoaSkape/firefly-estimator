/**
 * System Health Monitoring API
 * Provides real-time system health, error monitoring, and performance metrics
 */

import { errorHandler } from '../lib/errorHandler.js'
import { getDb } from '../lib/db.js'

export const runtime = 'nodejs'

export default async function handler(req, res) {
  // Set CORS headers - Support both www and apex domains
  const origin = req.headers.origin
  const allowedOrigins = [
    'https://www.fireflyestimator.com',
    'https://fireflyestimator.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ]
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.fireflyestimator.com')
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get system health metrics
    const healthData = await getSystemHealth()
    
    // Check if response was already sent before trying to send
    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        data: healthData
      })
    }
  } catch (error) {
    console.error('[SYSTEM_HEALTH] Error:', error)
    
    // Check if response was already sent before trying to send error
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to get system health',
        message: error.message
      })
    }
  }
}

async function getSystemHealth() {
  const startTime = Date.now()
  
  // Get error statistics from error handler
  const errorStats = errorHandler.getErrorStats()
  
  // Check database connectivity
  const dbHealth = await checkDatabaseHealth()
  
  // Check memory usage
  const memoryUsage = process.memoryUsage()
  
  // Check uptime
  const uptime = process.uptime()
  
  // Get recent error logs from database
  const recentErrors = await getRecentErrorLogs()
  
  // Calculate response time
  const responseTime = Date.now() - startTime
  
  return {
    status: getOverallStatus(errorStats.healthStatus, dbHealth.status),
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      human: formatUptime(uptime)
    },
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      unit: 'MB'
    },
    database: dbHealth,
    errors: {
      ...errorStats,
      recent: recentErrors
    },
    performance: {
      responseTime,
      unit: 'ms'
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  }
}

async function checkDatabaseHealth() {
  try {
    const db = await getDb()
    const startTime = Date.now()
    
    // Simple ping to check connectivity
    await db.admin().ping()
    
    const responseTime = Date.now() - startTime
    
    // Get database stats
    const stats = await db.stats()
    
    return {
      status: 'healthy',
      responseTime,
      collections: stats.collections || 0,
      dataSize: Math.round((stats.dataSize || 0) / 1024 / 1024),
      indexSize: Math.round((stats.indexSize || 0) / 1024 / 1024),
      unit: 'MB'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: null
    }
  }
}

async function getRecentErrorLogs() {
  try {
    const db = await getDb()
    const errorsCol = db.collection('ErrorLogs')
    
    const recentErrors = await errorsCol
      .find({
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()
    
    return recentErrors.map(error => ({
      id: error.id,
      category: error.category,
      operation: error.operation,
      message: error.message,
      timestamp: error.timestamp
    }))
  } catch (error) {
    console.error('[SYSTEM_HEALTH] Failed to get recent error logs:', error.message)
    return []
  }
}

function getOverallStatus(errorStatus, dbStatus) {
  if (dbStatus === 'unhealthy') return 'critical'
  if (errorStatus === 'critical') return 'critical'
  if (errorStatus === 'degraded' || dbStatus === 'degraded') return 'degraded'
  if (errorStatus === 'warning') return 'warning'
  return 'healthy'
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}
