// Enhanced Admin Analytics API
// Provides comprehensive analytics and reporting capabilities

import express from 'express'
import { adminAuth, PERMISSIONS } from '../../lib/adminAuth.js'
import { getCollection, COLLECTIONS } from '../../lib/adminSchema.js'
import { createClerkClient } from '@clerk/backend'

// Initialize Clerk client defensively
let clerkClient
try {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY missing')
  }
  clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
} catch (e) {
  console.error('[ADMIN][analytics] Clerk init failed:', e?.message || e)
}

const router = express.Router()

// Guard router.use to avoid non-function handlers
const __origRouterUse = router.use.bind(router)
router.use = function guardedRouterUse(...args) {
  try {
    const path = (typeof args[0] === 'string' || args[0] instanceof RegExp || Array.isArray(args[0])) ? args[0] : undefined
    const handlers = path ? args.slice(1) : args
    const startIndex = path ? 1 : 0
    for (let i = 0; i < handlers.length; i++) {
      if (typeof handlers[i] !== 'function') {
        const idx = startIndex + i
        const t = typeof handlers[i]
        console.error('[SUBROUTER_USE_GUARD] Non-function handler; patching', { file: __filename, path, index: idx, type: t })
        args[idx] = (req, res) => res.status(500).json({ error: 'admin_handler_misconfigured', file: __filename, path: String(path || ''), index: idx, type: t })
      }
    }
  } catch (e) { console.warn('[SUBROUTER_USE_GUARD] Failed:', e?.message) }
  return __origRouterUse(...args)
}
// Admin authentication middleware for all routes
router.use((req,res,next)=>{ if(process.env.ADMIN_AUTH_DISABLED==='true'){ return next() } return validateAdminAccess(req,res,next) })

// Get analytics dashboard data
router.get('/', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    
    // Calculate date ranges
    const now = new Date()
    let startDate, previousStartDate
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
        previousStartDate = new Date(startDate.getTime() - (7 * 24 * 60 * 60 * 1000))
        break
      case '30d':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        previousStartDate = new Date(startDate.getTime() - (30 * 24 * 60 * 60 * 1000))
        break
      case '90d':
        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
        previousStartDate = new Date(startDate.getTime() - (90 * 24 * 60 * 60 * 1000))
        break
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        previousStartDate = new Date(startDate.getTime() - (365 * 24 * 60 * 60 * 1000))
        break
      default:
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        previousStartDate = new Date(startDate.getTime() - (30 * 24 * 60 * 60 * 1000))
    }

    // Get collections
    const [ordersCollection, customersCollection, modelsCollection] = await Promise.all([
      getCollection(COLLECTIONS.ORDERS),
      getCollection(COLLECTIONS.CUSTOMERS),
      getCollection(COLLECTIONS.MODELS)
    ])

    // Get Total Users from Clerk
    let totalUsers = 0
    let newUsersCount = 0
    if (clerkClient) {
      try {
        const users = await clerkClient.users.getUserList({ limit: 1000 })
        totalUsers = users.length
        
        // Count new users in the time range
        const newUsersList = users.filter(user => {
          const createdAt = new Date(user.createdAt)
          return createdAt >= startDate
        })
        newUsersCount = newUsersList.length
      } catch (clerkError) {
        console.warn('[ANALYTICS] Clerk users fetch failed:', clerkError.message)
      }
    }

    // Get revenue analytics
    const revenueAnalytics = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate }
      }},
      { $group: { 
        _id: { 
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.date': 1 } }
    ]).toArray()

    // Get previous period for comparison
    const previousRevenue = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: previousStartDate, $lt: startDate }
      }},
      { $group: { _id: null, total: { $sum: '$totalAmount' } }}
    ]).toArray()

    // Get order analytics
    const orderAnalytics = await ordersCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { 
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$totalAmount' }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get customer analytics
    const customerAnalytics = await customersCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { 
        _id: '$source',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get model performance analytics
    const modelAnalytics = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate }
      }},
      { $group: { 
        _id: '$modelId',
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }},
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]).toArray()

    // Get model details for top performers
    const modelIds = modelAnalytics.map(item => item._id)
    const models = await modelsCollection.find({ _id: { $in: modelIds } }).toArray()
    const modelMap = models.reduce((acc, model) => {
      acc[model._id] = model
      return acc
    }, {})

    // Format model analytics
    const formattedModelAnalytics = modelAnalytics.map(item => ({
      modelId: item._id,
      modelName: modelMap[item._id]?.name || 'Unknown Model',
      category: modelMap[item._id]?.category || 'Unknown',
      orderCount: item.orderCount,
      totalRevenue: item.totalRevenue,
      averageOrder: item.totalRevenue / item.orderCount
    }))

    // Calculate current period totals
    const currentRevenue = revenueAnalytics.reduce((sum, item) => sum + item.total, 0)
    const currentOrders = revenueAnalytics.reduce((sum, item) => sum + item.count, 0)
    const previousRevenueTotal = previousRevenue[0]?.total || 0

    // Calculate percentage changes
    const revenueChange = previousRevenueTotal > 0 ? ((currentRevenue - previousRevenueTotal) / previousRevenueTotal) * 100 : 0

    res.json({
      success: true,
      data: {
        timeRange: range,
        period: {
          current: { start: startDate, end: now },
          previous: { start: previousStartDate, end: startDate }
        },
        metrics: {
          users: {
            total: totalUsers,
            new: newUsersCount
          },
          revenue: {
            current: currentRevenue,
            previous: previousRevenueTotal,
            change: revenueChange,
            daily: revenueAnalytics
          },
          orders: {
            current: currentOrders,
            byStatus: orderAnalytics
          },
          customers: {
            bySource: customerAnalytics
          },
          models: {
            topPerformers: formattedModelAnalytics
          }
        }
      }
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    res.status(500).json({ error: 'Failed to fetch analytics data' })
  }
})

// Get specific metric data
router.get('/:metric', async (req, res) => {
  try {
    const { metric } = req.params
    const { range = '30d', groupBy = 'day' } = req.query
    
    // Calculate date range
    const now = new Date()
    let startDate
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
        break
      case '30d':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        break
      case '90d':
        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
        break
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default:
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    }

    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    
    let aggregationPipeline = []
    let dateFormat = '%Y-%m-%d'
    
    // Set grouping based on parameter
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d-%H'
        break
      case 'day':
        dateFormat = '%Y-%m-%d'
        break
      case 'week':
        dateFormat = '%Y-%U'
        break
      case 'month':
        dateFormat = '%Y-%m'
        break
      default:
        dateFormat = '%Y-%m-%d'
    }

    switch (metric) {
      case 'revenue':
        aggregationPipeline = [
          { $match: { 
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
            createdAt: { $gte: startDate }
          }},
          { $group: { 
            _id: { 
              date: { $dateToString: { format: dateFormat, date: '$createdAt' } }
            },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }},
          { $sort: { '_id.date': 1 } }
        ]
        break
        
      case 'orders':
        aggregationPipeline = [
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { 
            _id: { 
              date: { $dateToString: { format: dateFormat, date: '$createdAt' } }
            },
            count: { $sum: 1 },
            total: { $sum: '$totalAmount' }
          }},
          { $sort: { '_id.date': 1 } }
        ]
        break
        
      case 'customers':
        const customersCollection = await getCollection(COLLECTIONS.CUSTOMERS)
        const customerData = await customersCollection.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { 
            _id: { 
              date: { $dateToString: { format: dateFormat, date: '$createdAt' } }
            },
            count: { $sum: 1 }
          }},
          { $sort: { '_id.date': 1 } }
        ]).toArray()
        
        return res.json({
          success: true,
          data: {
            metric,
            timeRange: range,
            groupBy,
            data: customerData
          }
        })
        
      case 'models':
        aggregationPipeline = [
          { $match: { 
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
            createdAt: { $gte: startDate }
          }},
          { $group: { 
            _id: { 
              date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
              modelId: '$modelId'
            },
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' }
          }},
          { $group: { 
            _id: '$_id.date',
            models: { 
              $push: { 
                modelId: '$_id.modelId',
                orderCount: '$orderCount',
                totalRevenue: '$totalRevenue'
              }
            },
            totalOrders: { $sum: '$orderCount' },
            totalRevenue: { $sum: '$totalRevenue' }
          }},
          { $sort: { '_id': 1 } }
        ]
        break
        
      default:
        return res.status(400).json({ error: 'Invalid metric specified' })
    }

    const data = await ordersCollection.aggregate(aggregationPipeline).toArray()
    
    res.json({
      success: true,
      data: {
        metric,
        timeRange: range,
        groupBy,
        data
      }
    })
  } catch (error) {
    console.error('Metric API error:', error)
    res.status(500).json({ error: 'Failed to fetch metric data' })
  }
})

// ============================================================================
// ADVANCED BUSINESS INTELLIGENCE ENDPOINTS
// ============================================================================

// Get predictive analytics and forecasting
router.get('/predictive/revenue', async (req, res) => {
  try {
    const { months = 6 } = req.query
    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    
    // Get historical revenue data for the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    
    const historicalData = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: twelveMonthsAgo }
      }},
      { $group: { 
        _id: { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray()
    
    // Simple linear regression for forecasting
    const dataPoints = historicalData.map(item => ({
      x: item._id.year * 12 + item._id.month,
      y: item.revenue
    }))
    
    if (dataPoints.length < 3) {
      return res.json({
        success: true,
        data: {
          forecast: [],
          confidence: 'low',
          message: 'Insufficient data for forecasting'
        }
      })
    }
    
    // Calculate linear regression
    const n = dataPoints.length
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0)
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0)
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0)
    const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // Generate forecast
    const forecast = []
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    
    for (let i = 1; i <= parseInt(months); i++) {
      const futureMonth = currentMonth + i
      const futureYear = currentYear + Math.floor((futureMonth - 1) / 12)
      const adjustedMonth = ((futureMonth - 1) % 12) + 1
      const x = futureYear * 12 + adjustedMonth
      const predictedRevenue = slope * x + intercept
      
      forecast.push({
        year: futureYear,
        month: adjustedMonth,
        predictedRevenue: Math.max(0, predictedRevenue),
        confidence: i <= 3 ? 'high' : i <= 6 ? 'medium' : 'low'
      })
    }
    
    res.json({
      success: true,
      data: {
        historical: historicalData,
        forecast,
        model: {
          slope,
          intercept,
          rSquared: calculateRSquared(dataPoints, slope, intercept)
        }
      }
    })
  } catch (error) {
    console.error('Predictive analytics error:', error)
    res.status(500).json({ error: 'Failed to generate revenue forecast' })
  }
})

// Get customer lifetime value analytics
router.get('/customers/lifetime-value', async (req, res) => {
  try {
    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    
    const customerLTV = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { 
        _id: '$customerId',
        totalSpent: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 },
        firstOrder: { $min: '$createdAt' },
        lastOrder: { $max: '$createdAt' }
      }},
      { $addFields: {
        lifetimeValue: '$totalSpent',
        averageOrderValue: { $divide: ['$totalSpent', '$orderCount'] },
        customerAge: { 
          $divide: [
            { $subtract: ['$lastOrder', '$firstOrder'] },
            1000 * 60 * 60 * 24 * 30 // months
          ]
        }
      }},
      { $group: {
        _id: null,
        avgLTV: { $avg: '$lifetimeValue' },
        medianLTV: { $median: { input: '$lifetimeValue', method: 'approximate' } },
        avgAOV: { $avg: '$averageOrderValue' },
        avgOrdersPerCustomer: { $avg: '$orderCount' },
        avgCustomerAge: { $avg: '$customerAge' },
        totalCustomers: { $sum: 1 },
        highValueCustomers: {
          $sum: { $cond: [{ $gte: ['$lifetimeValue', 100000] }, 1, 0] }
        }
      }}
    ]).toArray()
    
    // Get LTV distribution
    const ltvDistribution = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { 
        _id: '$customerId',
        totalSpent: { $sum: '$totalAmount' }
      }},
      { $bucket: {
        groupBy: '$totalSpent',
        boundaries: [0, 25000, 50000, 75000, 100000, 150000, 200000, 300000, 500000],
        default: '500000+',
        output: {
          count: { $sum: 1 },
          avgLTV: { $avg: '$totalSpent' }
        }
      }}
    ]).toArray()
    
    res.json({
      success: true,
      data: {
        summary: customerLTV[0] || {},
        distribution: ltvDistribution
      }
    })
  } catch (error) {
    console.error('Customer LTV analytics error:', error)
    res.status(500).json({ error: 'Failed to calculate customer lifetime value' })
  }
})

// Get conversion funnel analytics
router.get('/funnel/conversion', async (req, res) => {
  try {
    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    
    // Get conversion funnel data
    const funnelData = await ordersCollection.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalAmount' }
      }},
      { $sort: { count: -1 } }
    ]).toArray()
    
    // Calculate conversion rates
    const totalOrders = funnelData.reduce((sum, item) => sum + item.count, 0)
    const confirmedOrders = funnelData.find(item => item._id === 'confirmed')?.count || 0
    const completedOrders = funnelData.find(item => item._id === 'completed')?.count || 0
    
    const conversionRates = {
      quoteToConfirmed: totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0,
      confirmedToCompleted: confirmedOrders > 0 ? (completedOrders / confirmedOrders) * 100 : 0,
      overallConversion: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    }
    
    res.json({
      success: true,
      data: {
        funnel: funnelData,
        conversionRates,
        totalOrders
      }
    })
  } catch (error) {
    console.error('Conversion funnel analytics error:', error)
    res.status(500).json({ error: 'Failed to calculate conversion funnel' })
  }
})

// Helper function for R-squared calculation
function calculateRSquared(dataPoints, slope, intercept) {
  const yMean = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length
  const ssRes = dataPoints.reduce((sum, p) => {
    const predicted = slope * p.x + intercept
    return sum + Math.pow(p.y - predicted, 2)
  }, 0)
  const ssTot = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0)
  
  return ssTot > 0 ? 1 - (ssRes / ssTot) : 0
}

export default router




