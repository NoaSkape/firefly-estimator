// Enterprise Analytics API - Phase 3 Implementation
// Advanced analytics with predictive modeling, funnel analysis, and enterprise features

import { getDb } from '../lib/db.js'
import { ORDERS_COLLECTION } from '../lib/orders.js'
import { BUILDS_COLLECTION } from '../lib/builds.js'
import { createClerkClient } from '@clerk/backend'
import PredictiveAnalyticsEngine from '../lib/analytics/predictiveEngine.js'
import ConversionFunnelAnalyzer from '../lib/analytics/conversionFunnel.js'
import EnterpriseAnalyticsManager from '../lib/analytics/enterpriseFeatures.js'

export const runtime = 'nodejs'

// Initialize enterprise analytics components
let clerkClient
let predictiveEngine
let funnelAnalyzer
let enterpriseManager

try {
  if (process.env.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  }
  predictiveEngine = new PredictiveAnalyticsEngine()
  funnelAnalyzer = new ConversionFunnelAnalyzer()
  enterpriseManager = new EnterpriseAnalyticsManager()
  
  console.log('[ENTERPRISE_ANALYTICS] All components initialized successfully')
} catch (error) {
  console.error('[ENTERPRISE_ANALYTICS] Initialization failed:', error.message)
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://www.fireflyestimator.com')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method, query, body } = req
  const { action, range = '30d' } = query

  console.log('[ENTERPRISE_ANALYTICS] Request:', {
    method,
    action,
    range,
    hasBody: !!body
  })

  try {
    switch (action) {
      case 'forecast':
        return await handleForecastRequest(req, res)
      case 'funnel':
        return await handleFunnelAnalysis(req, res)
      case 'clv':
        return await handleCLVAnalysis(req, res)
      case 'alerts':
        return await handleAlertsManagement(req, res)
      case 'reports':
        return await handleReportsManagement(req, res)
      case 'realtime':
        return await handleRealTimeMetrics(req, res)
      case 'advanced_filters':
        return await handleAdvancedFiltering(req, res)
      default:
        return await handleComprehensiveAnalytics(req, res)
    }
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Enterprise analytics error',
      message: error.message
    })
  }
}

/**
 * Revenue Forecasting Endpoint
 */
async function handleForecastRequest(req, res) {
  const { range, periods = 12 } = req.query
  
  try {
    const db = await getDb()
    const ordersCollection = db.collection(ORDERS_COLLECTION)
    
    // Get historical revenue data
    const historicalData = await ordersCollection.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } // Last year
        }
      },
      {
        $group: {
          _id: { 
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]).toArray()

    // Transform for forecasting engine
    const forecastData = historicalData.map(item => ({
      date: item._id.date,
      revenue: item.revenue,
      orders: item.orders
    }))

    // Generate forecast
    const forecast = await predictiveEngine.forecastRevenue(forecastData, parseInt(periods))
    
    // Seasonal analysis
    const seasonalAnalysis = await predictiveEngine.analyzeSeasonality(forecastData)

    return res.json({
      success: true,
      data: {
        forecast: forecast,
        seasonalAnalysis: seasonalAnalysis,
        historicalData: forecastData,
        metadata: {
          dataPoints: forecastData.length,
          forecastPeriods: periods,
          generatedAt: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] Forecast error:', error)
    return res.status(500).json({
      success: false,
      error: 'Forecasting failed',
      message: error.message
    })
  }
}

/**
 * Conversion Funnel Analysis Endpoint
 */
async function handleFunnelAnalysis(req, res) {
  const { range, segmentation } = req.query
  
  try {
    const funnelAnalysis = await funnelAnalyzer.analyzeFunnel({
      timeRange: range,
      segmentation: segmentation
    })

    return res.json({
      success: true,
      data: funnelAnalysis
    })
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] Funnel analysis error:', error)
    return res.status(500).json({
      success: false,
      error: 'Funnel analysis failed',
      message: error.message
    })
  }
}

/**
 * Customer Lifetime Value Analysis Endpoint
 */
async function handleCLVAnalysis(req, res) {
  try {
    const db = await getDb()
    
    // Get customer transaction data
    const customerData = await db.collection(ORDERS_COLLECTION).aggregate([
      {
        $group: {
          _id: '$userId',
          transactions: {
            $push: {
              date: '$createdAt',
              amount: '$totalAmount',
              status: '$status'
            }
          },
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          firstOrder: { $min: '$createdAt' },
          lastOrder: { $max: '$createdAt' }
        }
      }
    ]).toArray()

    // Transform for CLV engine
    const clvData = customerData.map(customer => ({
      id: customer._id,
      transactions: customer.transactions,
      totalSpent: customer.totalSpent,
      orderCount: customer.orderCount,
      firstOrder: customer.firstOrder,
      lastOrder: customer.lastOrder
    }))

    // Calculate CLV
    const clvAnalysis = await predictiveEngine.calculateCustomerLifetimeValue(clvData)

    return res.json({
      success: true,
      data: clvAnalysis
    })
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] CLV analysis error:', error)
    return res.status(500).json({
      success: false,
      error: 'CLV analysis failed',
      message: error.message
    })
  }
}

/**
 * KPI Alerts Management Endpoint
 */
async function handleAlertsManagement(req, res) {
  const { method } = req
  
  try {
    if (method === 'GET') {
      // Get monitoring dashboard data
      const monitoringData = await enterpriseManager.getKPIMonitoringData()
      return res.json({
        success: true,
        data: monitoringData
      })
    }
    
    if (method === 'POST') {
      // Create new alert
      const alertConfig = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const result = await enterpriseManager.setupKPIAlert(alertConfig)
      return res.json({
        success: true,
        data: result
      })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] Alerts management error:', error)
    return res.status(500).json({
      success: false,
      error: 'Alerts management failed',
      message: error.message
    })
  }
}

/**
 * Report Scheduling Management Endpoint
 */
async function handleReportsManagement(req, res) {
  const { method } = req
  
  try {
    if (method === 'GET') {
      // Get scheduled reports
      const db = await getDb()
      const reports = await db.collection('report_schedules')
        .find({ enabled: true })
        .toArray()
      
      return res.json({
        success: true,
        data: { reports }
      })
    }
    
    if (method === 'POST') {
      // Schedule new report
      const reportConfig = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const result = await enterpriseManager.scheduleReport(reportConfig)
      return res.json({
        success: true,
        data: result
      })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] Reports management error:', error)
    return res.status(500).json({
      success: false,
      error: 'Reports management failed',
      message: error.message
    })
  }
}

/**
 * Real-time Metrics Endpoint
 */
async function handleRealTimeMetrics(req, res) {
  try {
    const db = await getDb()
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Real-time metrics calculation
    const metrics = await Promise.all([
      // Orders in last hour
      db.collection(ORDERS_COLLECTION).countDocuments({
        createdAt: { $gte: oneHourAgo }
      }),
      
      // Revenue in last hour
      db.collection(ORDERS_COLLECTION).aggregate([
        {
          $match: {
            createdAt: { $gte: oneHourAgo },
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).toArray(),
      
      // Active builds
      db.collection(BUILDS_COLLECTION).countDocuments({
        status: { $in: ['DRAFT', 'REVIEW', 'CONFIRMED', 'CUSTOMIZING'] }
      }),
      
      // Users online (if we track sessions)
      clerkClient ? clerkClient.users.getUserList({ limit: 1000 }) : Promise.resolve([])
    ])

    const [ordersLastHour, revenueResult, activeBuilds, users] = metrics
    const revenueLastHour = revenueResult[0]?.total || 0

    // Generate sparkline data (last 24 hours by hour)
    const sparklineData = await generateSparklineData(db, 24)

    const realTimeMetrics = [
      {
        id: 'orders_1h',
        title: 'Orders (1h)',
        value: ordersLastHour,
        change: 0, // Would need historical comparison
        trend: 'stable',
        format: 'number',
        sparklineData: sparklineData.orders
      },
      {
        id: 'revenue_1h',
        title: 'Revenue (1h)',
        value: revenueLastHour,
        change: 0,
        trend: 'stable',
        format: 'currency',
        sparklineData: sparklineData.revenue
      },
      {
        id: 'active_builds',
        title: 'Active Builds',
        value: activeBuilds,
        change: 0,
        trend: 'stable',
        format: 'number',
        sparklineData: sparklineData.builds
      },
      {
        id: 'total_users',
        title: 'Total Users',
        value: users.length || 0,
        change: 0,
        trend: 'stable',
        format: 'number',
        sparklineData: sparklineData.users
      }
    ]

    return res.json({
      success: true,
      data: {
        metrics: realTimeMetrics,
        lastUpdated: new Date().toISOString(),
        updateInterval: 30000 // 30 seconds
      }
    })
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] Real-time metrics error:', error)
    return res.status(500).json({
      success: false,
      error: 'Real-time metrics failed',
      message: error.message
    })
  }
}

/**
 * Advanced Filtering Endpoint
 */
async function handleAdvancedFiltering(req, res) {
  const { method } = req
  
  try {
    if (method === 'GET') {
      // Get available filters
      const availableFilters = enterpriseManager.getAvailableFilters()
      return res.json({
        success: true,
        data: { filters: availableFilters }
      })
    }
    
    if (method === 'POST') {
      // Apply filters and return filtered data
      const filters = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const baseQuery = {}
      
      const filteredQuery = await enterpriseManager.applyAdvancedFilters(baseQuery, filters)
      
      // Execute filtered query
      const db = await getDb()
      const results = await db.collection('analytics').find(filteredQuery).toArray()
      
      return res.json({
        success: true,
        data: {
          results: results,
          filters: filters,
          resultCount: results.length
        }
      })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] Advanced filtering error:', error)
    return res.status(500).json({
      success: false,
      error: 'Advanced filtering failed',
      message: error.message
    })
  }
}

/**
 * Comprehensive Analytics Dashboard Data
 */
async function handleComprehensiveAnalytics(req, res) {
  const { range } = req.query
  
  try {
    const db = await getDb()
    
    // Calculate date range
    const endDate = new Date()
    let startDate
    
    switch (range) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate())
        break
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Gather all analytics data in parallel
    const [
      basicMetrics,
      forecastData,
      funnelData,
      clvData,
      geographicData,
      realTimeData
    ] = await Promise.allSettled([
      gatherBasicMetrics(db, startDate, endDate),
      generateForecastData(db, startDate, endDate),
      funnelAnalyzer.analyzeFunnel({ timeRange: range }),
      generateCLVData(db),
      generateGeographicData(db, startDate, endDate),
      generateRealTimeData(db)
    ])

    // Compile comprehensive response
    const response = {
      success: true,
      data: {
        timeRange: range,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        
        // Core metrics
        metrics: basicMetrics.status === 'fulfilled' ? basicMetrics.value : {},
        
        // Predictive analytics
        forecast: forecastData.status === 'fulfilled' ? forecastData.value : null,
        
        // Conversion analysis
        funnel: funnelData.status === 'fulfilled' ? funnelData.value : null,
        
        // Customer insights
        clv: clvData.status === 'fulfilled' ? clvData.value : null,
        
        // Geographic insights
        geographic: geographicData.status === 'fulfilled' ? geographicData.value : null,
        
        // Real-time data
        realTime: realTimeData.status === 'fulfilled' ? realTimeData.value : null,
        
        // System status
        systemStatus: {
          dataQuality: calculateDataQuality(basicMetrics, forecastData, funnelData),
          lastUpdated: new Date().toISOString(),
          componentsStatus: {
            predictiveEngine: forecastData.status === 'fulfilled',
            funnelAnalyzer: funnelData.status === 'fulfilled',
            clvEngine: clvData.status === 'fulfilled'
          }
        }
      }
    }

    console.log('[ENTERPRISE_ANALYTICS] Comprehensive data generated successfully')
    return res.json(response)
    
  } catch (error) {
    console.error('[ENTERPRISE_ANALYTICS] Comprehensive analytics error:', error)
    return res.status(500).json({
      success: false,
      error: 'Comprehensive analytics failed',
      message: error.message
    })
  }
}

// Helper functions

async function gatherBasicMetrics(db, startDate, endDate) {
  const ordersCollection = db.collection(ORDERS_COLLECTION)
  const buildsCollection = db.collection(BUILDS_COLLECTION)
  
  // Revenue metrics
  const revenue = await ordersCollection.aggregate([
    {
      $match: {
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 },
        avg: { $avg: '$totalAmount' }
      }
    }
  ]).toArray()

  // Order metrics
  const orders = await ordersCollection.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]).toArray()

  // Build metrics
  const builds = await buildsCollection.countDocuments({
    status: { $in: ['DRAFT', 'REVIEW', 'CONFIRMED', 'CUSTOMIZING'] }
  })

  // User metrics (from Clerk)
  let users = 0
  if (clerkClient) {
    try {
      const userList = await clerkClient.users.getUserList({ limit: 1000 })
      users = userList.length
    } catch (error) {
      console.warn('[ENTERPRISE_ANALYTICS] Clerk users fetch failed:', error.message)
    }
  }

  return {
    revenue: {
      total: revenue[0]?.total || 0,
      count: revenue[0]?.count || 0,
      average: revenue[0]?.avg || 0
    },
    orders: orders,
    builds: builds,
    users: users
  }
}

async function generateForecastData(db, startDate, endDate) {
  // Get 12 months of historical data for better forecasting
  const historicalStart = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000)
  
  const historicalData = await db.collection(ORDERS_COLLECTION).aggregate([
    {
      $match: {
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: historicalStart }
      }
    },
    {
      $group: {
        _id: { 
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]).toArray()

  const forecastData = historicalData.map(item => ({
    date: item._id.date,
    revenue: item.revenue
  }))

  if (forecastData.length < 3) {
    return null // Not enough data for forecasting
  }

  return await predictiveEngine.forecastRevenue(forecastData, 12)
}

async function generateCLVData(db) {
  // Simplified CLV calculation for initial implementation
  const customerData = await db.collection(ORDERS_COLLECTION).aggregate([
    {
      $group: {
        _id: '$userId',
        transactions: {
          $push: {
            date: '$createdAt',
            amount: '$totalAmount'
          }
        }
      }
    },
    { $limit: 100 } // Limit for performance
  ]).toArray()

  if (customerData.length === 0) return null

  return await predictiveEngine.calculateCustomerLifetimeValue(customerData)
}

async function generateGeographicData(db, startDate, endDate) {
  // This would require location data in orders
  // For now, return sample structure
  return {
    states: [
      { state: 'TX', customers: 45, revenue: 125000 },
      { state: 'CA', customers: 32, revenue: 98000 },
      { state: 'FL', customers: 28, revenue: 87000 }
    ],
    countries: [
      { country: 'US', customers: 150, revenue: 450000 }
    ]
  }
}

async function generateRealTimeData(db) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  
  const realtimeMetrics = await Promise.all([
    db.collection(ORDERS_COLLECTION).countDocuments({ createdAt: { $gte: oneHourAgo } }),
    db.collection(BUILDS_COLLECTION).countDocuments({ updatedAt: { $gte: oneHourAgo } })
  ])

  return {
    ordersLastHour: realtimeMetrics[0],
    buildsLastHour: realtimeMetrics[1],
    timestamp: now.toISOString()
  }
}

async function generateSparklineData(db, hours) {
  // Generate hourly data for sparklines
  const sparklineData = {
    orders: [],
    revenue: [],
    builds: [],
    users: []
  }
  
  for (let i = hours; i >= 0; i--) {
    const hourStart = new Date(Date.now() - i * 60 * 60 * 1000)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
    
    // Sample data for sparklines (would be real queries in production)
    sparklineData.orders.push(Math.floor(Math.random() * 10))
    sparklineData.revenue.push(Math.floor(Math.random() * 5000))
    sparklineData.builds.push(Math.floor(Math.random() * 15))
    sparklineData.users.push(Math.floor(Math.random() * 50))
  }
  
  return sparklineData
}

function calculateDataQuality(basicMetrics, forecastData, funnelData) {
  let score = 100
  let issues = []
  
  if (basicMetrics.status === 'rejected') {
    score -= 30
    issues.push('Basic metrics collection failed')
  }
  
  if (forecastData.status === 'rejected') {
    score -= 20
    issues.push('Forecasting data insufficient')
  }
  
  if (funnelData.status === 'rejected') {
    score -= 20
    issues.push('Funnel tracking data missing')
  }
  
  return {
    score: Math.max(score, 0),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
    issues: issues
  }
}
