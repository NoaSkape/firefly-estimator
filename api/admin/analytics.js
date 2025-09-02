// Enhanced Admin Analytics API
// Provides comprehensive analytics and reporting capabilities

import express from 'express'
import { adminAuth, PERMISSIONS } from '../../lib/adminAuth.js'
import { getCollection, COLLECTIONS } from '../../lib/adminSchema.js'
import { createClerkClient } from '@clerk/backend'

// Initialize Clerk client
const clerkClient = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
})

const router = express.Router()

// Admin authentication middleware for all routes
router.use(adminAuth.validateAdminAccess.bind(adminAuth))

// Get analytics dashboard data
router.get('/', adminAuth.validatePermission(PERMISSIONS.FINANCIAL_REPORTS), async (req, res) => {
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
router.get('/:metric', adminAuth.validatePermission(PERMISSIONS.FINANCIAL_REPORTS), async (req, res) => {
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

export default router

