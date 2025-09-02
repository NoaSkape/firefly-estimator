// Admin Analytics API Endpoint
// Provides comprehensive business intelligence and reporting data

import express from 'express'
import { adminAuth, hasPermission, PERMISSIONS } from '../../lib/adminAuth.js'
import { getCollection, COLLECTIONS } from '../../lib/adminSchema.js'

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
    const [ordersCollection, customersCollection, modelsCollection, financialCollection] = await Promise.all([
      getCollection(COLLECTIONS.ORDERS),
      getCollection(COLLECTIONS.CUSTOMERS),
      getCollection(COLLECTIONS.MODELS),
      getCollection(COLLECTIONS.FINANCIAL)
    ])

    // Current period metrics
    const currentPeriodMetrics = await Promise.all([
      // Total revenue
      ordersCollection.aggregate([
        { $match: { 
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
        }},
        { $group: { _id: null, total: { $sum: '$totalAmount' } }}
      ]).toArray(),
      
      // Total orders
      ordersCollection.countDocuments({ createdAt: { $gte: startDate } }),
      
      // New customers
      customersCollection.countDocuments({ createdAt: { $gte: startDate } }),
      
      // Average order value
      ordersCollection.aggregate([
        { $match: { 
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
        }},
        { $group: { _id: null, avg: { $avg: '$totalAmount' } }}
      ]).toArray()
    ])

    // Previous period metrics for comparison
    const previousPeriodMetrics = await Promise.all([
      // Total revenue
      ordersCollection.aggregate([
        { $match: { 
          createdAt: { $gte: previousStartDate, $lt: startDate },
          status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
        }},
        { $group: { _id: null, total: { $sum: '$totalAmount' } }}
      ]).toArray(),
      
      // Total orders
      ordersCollection.countDocuments({ 
        createdAt: { $gte: previousStartDate, $lt: startDate } 
      }),
      
      // New customers
      customersCollection.countDocuments({ 
        createdAt: { $gte: previousStartDate, $lt: startDate } 
      }),
      
      // Average order value
      ordersCollection.aggregate([
        { $match: { 
          createdAt: { $gte: previousStartDate, $lt: startDate },
          status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
        }},
        { $group: { _id: null, avg: { $avg: '$totalAmount' } }}
      ]).toArray()
    ])

    // Calculate metrics
    const currentRevenue = currentPeriodMetrics[0][0]?.total || 0
    const currentOrders = currentPeriodMetrics[1]
    const currentCustomers = currentPeriodMetrics[2]
    const currentAOV = currentPeriodMetrics[3][0]?.avg || 0

    const previousRevenue = previousPeriodMetrics[0][0]?.total || 0
    const previousOrders = previousPeriodMetrics[1]
    const previousCustomers = previousPeriodMetrics[2]
    const previousAOV = previousPeriodMetrics[3][0]?.avg || 0

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const ordersChange = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0
    const customersChange = previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0
    const aovChange = previousAOV > 0 ? ((currentAOV - previousAOV) / previousAOV) * 100 : 0

    // Get order status distribution
    const orderStatuses = await ordersCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()

    const statusColors = {
      'quote': 'bg-yellow-400',
      'pending': 'bg-blue-400',
      'confirmed': 'bg-green-400',
      'production': 'bg-purple-400',
      'ready': 'bg-indigo-400',
      'delivered': 'bg-teal-400',
      'completed': 'bg-green-600',
      'cancelled': 'bg-red-400'
    }

    const orderStatusesWithColors = orderStatuses.map(status => ({
      status: status._id,
      count: status.count,
      color: statusColors[status._id] || 'bg-gray-400'
    }))

    // Get top performing models
    const topModels = await ordersCollection.aggregate([
      { $match: { 
        createdAt: { $gte: startDate },
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { 
        _id: '$modelId', 
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }},
      { $sort: { orderCount: -1 } },
      { $limit: 10 }
    ]).toArray()

    // Get model details for top models
    const modelIds = topModels.map(m => m._id)
    const models = await modelsCollection.find({ _id: { $in: modelIds } }).toArray()
    const modelMap = models.reduce((acc, model) => {
      acc[model._id] = model
      return acc
    }, {})

    const topModelsWithDetails = topModels.map(model => ({
      _id: model._id,
      name: modelMap[model._id]?.name || 'Unknown Model',
      category: modelMap[model._id]?.category || 'Unknown',
      orderCount: model.orderCount,
      totalRevenue: model.totalRevenue
    }))

    // Get customer acquisition sources
    const customerSources = await customersCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()

    // Get recent activity (last 10 orders)
    const recentActivity = await ordersCollection.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    const activityLog = recentActivity.map(order => ({
      timestamp: order.createdAt,
      description: `Order ${order.orderId} created for ${order.customerInfo?.name || 'Customer'}`,
      type: 'order_created',
      orderId: order.orderId
    }))

    // Get daily revenue trend for the selected period
    const dailyRevenue = await ordersCollection.aggregate([
      { $match: { 
        createdAt: { $gte: startDate },
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { 
        _id: { 
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]).toArray()

    // Get customer lifetime value data
    const customerLTV = await customersCollection.aggregate([
      { $match: { totalSpent: { $gt: 0 } } },
      { $group: { 
        _id: null,
        avgLTV: { $avg: '$totalSpent' },
        maxLTV: { $max: '$totalSpent' },
        totalCustomers: { $sum: 1 }
      }}
    ]).toArray()

    // Get inventory status
    const inventoryStatus = await modelsCollection.aggregate([
      { $group: { 
        _id: '$isActive', 
        count: { $sum: 1 }
      }}
    ]).toArray()

    const inventorySummary = {
      active: inventoryStatus.find(s => s._id === true)?.count || 0,
      inactive: inventoryStatus.find(s => s._id === false)?.count || 0
    }

    res.json({
      success: true,
      data: {
        timeRange: range,
        period: {
          current: { start: startDate, end: now },
          previous: { start: previousStartDate, end: startDate }
        },
        metrics: {
          totalRevenue: currentRevenue,
          totalOrders: currentOrders,
          newCustomers: currentCustomers,
          averageOrderValue: currentAOV,
          revenueChange,
          ordersChange,
          customersChange,
          aovChange
        },
        orderStatuses: orderStatusesWithColors,
        topModels: topModelsWithDetails,
        customerSources,
        recentActivity: activityLog,
        dailyRevenue,
        customerLTV: customerLTV[0] || { avgLTV: 0, maxLTV: 0, totalCustomers: 0 },
        inventory: inventorySummary
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
    const { range = '30d' } = req.query

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (parseInt(range) * 24 * 60 * 60 * 1000))

    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)

    let data = null

    switch (metric) {
      case 'revenue-trend':
        data = await ordersCollection.aggregate([
          { $match: { 
            createdAt: { $gte: startDate },
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
          }},
          { $group: { 
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }},
          { $sort: { _id: 1 } }
        ]).toArray()
        break

      case 'order-status':
        data = await ordersCollection.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray()
        break

      case 'model-performance':
        data = await ordersCollection.aggregate([
          { $match: { 
            createdAt: { $gte: startDate },
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
          }},
          { $group: { 
            _id: '$modelId', 
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' }
          }},
          { $sort: { totalRevenue: -1 } },
          { $limit: 20 }
        ]).toArray()
        break

      default:
        return res.status(400).json({ error: 'Invalid metric specified' })
    }

    res.json({
      success: true,
      data: {
        metric,
        timeRange: range,
        data
      }
    })

  } catch (error) {
    console.error('Metric API error:', error)
    res.status(500).json({ error: 'Failed to fetch metric data' })
  }
})

export default router
