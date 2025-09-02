// Enhanced Admin Dashboard API
// Integrates with Clerk and MongoDB to provide real-time business metrics

import express from 'express'
import { validateAdminAccess, validatePermission } from '../../lib/simpleAdminAuth.js'
import { getDb } from '../../lib/db.js'
import { ORDERS_COLLECTION } from '../../lib/orders.js'
import { BUILDS_COLLECTION } from '../../lib/builds.js'
import { COLLECTION as MODELS_COLLECTION } from '../../lib/model-utils.js'
import { createClerkClient } from '@clerk/backend'

// Initialize Clerk client with error handling
let clerkClient
try {
  clerkClient = createClerkClient({ 
    secretKey: process.env.CLERK_SECRET_KEY 
  })
} catch (error) {
  console.error('Failed to initialize Clerk client:', error.message)
}

const router = express.Router()

// Admin authentication middleware for all routes
router.use(validateAdminAccess)

// Get comprehensive dashboard data
router.get('/', validatePermission('FINANCIAL_VIEW'), async (req, res) => {
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

    // Get actual collections that exist in our system
    let ordersCollection, buildsCollection, modelsCollection, db
    try {
      db = await getDb()
      if (!db) {
        throw new Error('Database connection failed')
      }
      ordersCollection = db.collection(ORDERS_COLLECTION)
      buildsCollection = db.collection(BUILDS_COLLECTION) 
      modelsCollection = db.collection(MODELS_COLLECTION)
    } catch (dbError) {
      console.error('Database connection error:', dbError.message || dbError)
      // Return basic response if database fails
      return res.json({
        success: true,
        data: {
          metrics: {
            totalUsers: 0,
            activeBuilds: 0,
            totalOrders: 0,
            totalRevenue: 0
          },
          trends: {
            dailyRevenue: [],
            orderStatus: []
          },
          recentActivity: {
            orders: [],
            builds: []
          },
          topModels: []
        }
      })
    }

    // Get Clerk users (total count and recent signups) with error handling
    let clerkUsers = []
    let totalClerkUsers = 0
    try {
      if (!clerkClient) {
        throw new Error('Clerk client not initialized')
      }
      const clerkResponse = await clerkClient.users.getUserList({
        limit: 1000 // Get up to 1000 users
      })
      clerkUsers = clerkResponse.data || []
      totalClerkUsers = clerkResponse.totalCount || clerkResponse.total_count || 0
      console.log('[DEBUG] Clerk users found:', totalClerkUsers)
    } catch (clerkError) {
      console.error('Clerk API error:', clerkError.message || clerkError)
      // Continue with 0 users if Clerk fails
      totalClerkUsers = 0
    }

    // Calculate total users (just Clerk for now)
    const totalUsers = totalClerkUsers

    // Get active builds from the Builds collection with error handling
    let activeBuilds = 0
    try {
      activeBuilds = await buildsCollection.countDocuments({
        status: { $in: ['DRAFT', 'REVIEW', 'CONFIRMED'] }
      })
      console.log('[DEBUG] Active builds found:', activeBuilds)
    } catch (buildsError) {
      console.error('Builds query error:', buildsError.message || buildsError)
      activeBuilds = 0
    }

    // Get total orders (confirmed and delivered orders) with error handling
    let totalOrders = 0
    try {
      totalOrders = await ordersCollection.countDocuments({
        status: { $in: ['confirmed', 'delivered'] }
      })
    } catch (ordersError) {
      console.warn('Could not fetch total orders:', ordersError.message)
    }

    // Get total revenue from paid orders with error handling
    let totalRevenue = 0
    try {
      const revenueData = await ordersCollection.aggregate([
        { $match: { 
          status: { $in: ['confirmed', 'delivered'] },
          'pricing.total': { $exists: true, $gt: 0 }
        }},
        { $group: { _id: null, total: { $sum: '$pricing.total' } }}
      ]).toArray()
      
      totalRevenue = revenueData[0]?.total || 0
    } catch (revenueError) {
      console.warn('Could not fetch revenue data:', revenueError.message)
    }

    // Get daily revenue trend for the selected period with error handling
    let dailyRevenue = []
    try {
      dailyRevenue = await ordersCollection.aggregate([
        { $match: { 
          status: { $in: ['confirmed', 'delivered'] },
          createdAt: { $gte: startDate },
          'pricing.total': { $exists: true, $gt: 0 }
        }},
        { $group: { 
          _id: { 
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          total: { $sum: '$pricing.total' },
          count: { $sum: 1 }
        }},
        { $sort: { '_id.date': 1 } }
      ]).toArray()
    } catch (dailyRevenueError) {
      console.warn('Could not fetch daily revenue:', dailyRevenueError.message)
    }

    // Get previous period data for comparison with error handling
    let previousRevenue = 0
    let revenueChange = 0
    try {
      const previousRevenueData = await ordersCollection.aggregate([
        { $match: { 
          status: { $in: ['confirmed', 'delivered'] },
          createdAt: { $gte: previousStartDate, $lt: startDate },
          'pricing.total': { $exists: true, $gt: 0 }
        }},
        { $group: { _id: null, total: { $sum: '$pricing.total' } }}
      ]).toArray()
      
      previousRevenue = previousRevenueData[0]?.total || 0
      revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    } catch (prevRevenueError) {
      console.warn('Could not fetch previous revenue:', prevRevenueError.message)
    }

    // Get order status distribution with error handling
    let orderStatusDistribution = []
    try {
      orderStatusDistribution = await ordersCollection.aggregate([
        { $group: { 
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$pricing.total' }
        }},
        { $sort: { count: -1 } }
      ]).toArray()
    } catch (statusError) {
      console.warn('Could not fetch order status distribution:', statusError.message)
    }

    // Get recent activity with error handling
    let recentOrders = []
    let recentBuilds = []
    try {
      recentOrders = await ordersCollection.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()
    } catch (recentOrdersError) {
      console.warn('Could not fetch recent orders:', recentOrdersError.message)
    }

    try {
      recentBuilds = await buildsCollection.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()
    } catch (recentBuildsError) {
      console.warn('Could not fetch recent builds:', recentBuildsError.message)
    }

    // Get top models by orders with error handling
    let formattedTopModels = []
    try {
      const topModels = await ordersCollection.aggregate([
        { $match: { 
          status: { $in: ['confirmed', 'delivered'] },
          'model.name': { $exists: true }
        }},
        { $group: { 
          _id: '$model.name',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' }
        }},
        { $sort: { orderCount: -1 } },
        { $limit: 5 }
      ]).toArray()

      // Format top models data (no need to look up since we group by name)
      formattedTopModels = topModels.map(item => ({
        modelId: item._id,
        modelName: item._id || 'Unknown Model',
        orderCount: item.orderCount,
        totalRevenue: item.totalRevenue || 0,
        averageOrder: item.orderCount > 0 ? (item.totalRevenue || 0) / item.orderCount : 0
      }))
    } catch (topModelsError) {
      console.warn('Could not fetch top models:', topModelsError.message)
    }

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers: totalUsers || 0,
          activeBuilds: activeBuilds || 0,
          totalOrders: totalOrders || 0,
          totalRevenue: totalRevenue || 0,
          revenueChange: revenueChange || 0
        },
        trends: {
          dailyRevenue: dailyRevenue || [],
          orderStatus: orderStatusDistribution || []
        },
        recentActivity: {
          orders: recentOrders || [],
          builds: recentBuilds || []
        },
        topModels: formattedTopModels || []
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

// Get detailed user information (Clerk + MongoDB)
router.get('/users/detailed', validatePermission('USERS_VIEW'), async (req, res) => {
  try {
    const usersCollection = await getCollection('UserProfiles')
    
    // Get Clerk users
    let clerkUsers = []
    try {
      const clerkResponse = await clerkClient.users.getUserList({
        limit: 1000
      })
      clerkUsers = clerkResponse.data || []
    } catch (clerkError) {
      console.warn('Could not fetch Clerk users:', clerkError.message)
    }

    // Get local MongoDB users
    const localUsers = await usersCollection.find({}).toArray()

    // Combine and format user data
    const combinedUsers = [
      ...clerkUsers.map(clerkUser => ({
        id: clerkUser.id,
        firstName: clerkUser.firstName || 'Unknown',
        lastName: clerkUser.lastName || 'Unknown',
        email: clerkUser.emailAddresses[0]?.emailAddress || 'No email',
        role: 'customer', // Default role for Clerk users
        status: clerkUser.publicMetadata?.status || 'active',
        createdAt: clerkUser.createdAt,
        source: 'clerk'
      })),
      ...localUsers.map(localUser => ({
        id: localUser._id,
        firstName: localUser.firstName || 'Unknown',
        lastName: localUser.lastName || 'Unknown',
        email: localUser.email || 'No email',
        role: localUser.role || 'customer',
        status: localUser.isActive ? 'active' : 'inactive',
        createdAt: localUser.createdAt,
        source: 'local'
      }))
    ]

    res.json({
      success: true,
      data: combinedUsers
    })

  } catch (error) {
    console.error('Users detailed API error:', error)
    res.status(500).json({ error: 'Failed to fetch detailed user data' })
  }
})

// Get active builds information
router.get('/builds/active', validatePermission('ORDERS_VIEW'), async (req, res) => {
  try {
    const ordersCollection = await getCollection(ORDERS_COLLECTION)
    const modelsCollection = await getCollection(MODELS_COLLECTION)
    
    // Get active builds (orders in production stages)
    const activeBuilds = await ordersCollection.find({
      status: { $in: ['confirmed', 'production', 'ready'] },
      stage: { $in: ['design', 'production', 'quality'] }
    }).sort({ createdAt: -1 }).toArray()

    // Get model details for each build
    const modelIds = activeBuilds.map(build => build.modelId)
    const models = await modelsCollection.find({ _id: { $in: modelIds } }).toArray()
    const modelMap = models.reduce((acc, model) => {
      acc[model._id] = model
      return acc
    }, {})

    // Format build data
    const formattedBuilds = activeBuilds.map(build => ({
      id: build._id,
      orderId: build.orderId,
      customerName: build.customerInfo?.name || 'Unknown Customer',
      modelName: modelMap[build.modelId]?.name || 'Unknown Model',
      status: build.status,
      stage: build.stage,
      totalAmount: build.totalAmount,
      createdAt: build.createdAt,
      estimatedCompletionDate: build.estimatedCompletionDate,
      productionStartDate: build.productionStartDate
    }))

    res.json({
      success: true,
      data: formattedBuilds
    })

  } catch (error) {
    console.error('Active builds API error:', error)
    res.status(500).json({ error: 'Failed to fetch active builds data' })
  }
})

// Get paid orders information
router.get('/orders/paid', validatePermission('ORDERS_VIEW'), async (req, res) => {
  try {
    const ordersCollection = await getCollection(ORDERS_COLLECTION)
    const modelsCollection = await getCollection(MODELS_COLLECTION)
    
    // Get paid orders
    const paidOrders = await ordersCollection.find({
      status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
    }).sort({ createdAt: -1 }).limit(50).toArray()

    // Get model details for each order
    const modelIds = paidOrders.map(order => order.modelId)
    const models = await modelsCollection.find({ _id: { $in: modelIds } }).toArray()
    const modelMap = models.reduce((acc, model) => {
      acc[model._id] = model
      return acc
    }, {})

    // Format order data
    const formattedOrders = paidOrders.map(order => ({
      id: order._id,
      orderId: order.orderId,
      customerName: order.customerInfo?.name || 'Unknown Customer',
      modelName: modelMap[order.modelId]?.name || 'Unknown Model',
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      deliveryDate: order.deliveryDate
    }))

    res.json({
      success: true,
      data: formattedOrders
    })

  } catch (error) {
    console.error('Paid orders API error:', error)
    res.status(500).json({ error: 'Failed to fetch paid orders data' })
  }
})

// Get revenue breakdown
router.get('/financial/revenue', validatePermission('FINANCIAL_REPORTS'), async (req, res) => {
  try {
    const ordersCollection = await getCollection(ORDERS_COLLECTION)
    
    // Get revenue by month for the last 12 months
    const monthlyRevenue = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { 
        _id: { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        total: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }},
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]).toArray()

    // Format revenue data
    const formattedRevenue = monthlyRevenue.map(item => {
      const date = new Date(item._id.year, item._id.month - 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      
      return {
        period: monthName,
        total: item.total,
        orderCount: item.orderCount,
        averageOrder: item.total / item.orderCount,
        change: 0 // Will be calculated below
      }
    })

    // Calculate month-over-month changes
    for (let i = 1; i < formattedRevenue.length; i++) {
      const current = formattedRevenue[i].total
      const previous = formattedRevenue[i - 1].total
      if (previous > 0) {
        formattedRevenue[i].change = ((current - previous) / previous) * 100
      }
    }

    res.json({
      success: true,
      data: formattedRevenue
    })

  } catch (error) {
    console.error('Revenue API error:', error)
    res.status(500).json({ error: 'Failed to fetch revenue data' })
  }
})

export default router
