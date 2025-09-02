// Enhanced Admin Dashboard API
// Integrates with Clerk and MongoDB to provide real-time business metrics

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
router.use((req, res, next) => adminAuth.validateAdminAccess(req, res, next))

// Get comprehensive dashboard data
router.get('/', adminAuth.validatePermission(PERMISSIONS.FINANCIAL_VIEW), async (req, res) => {
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
    const [ordersCollection, customersCollection, modelsCollection, usersCollection] = await Promise.all([
      getCollection(COLLECTIONS.ORDERS),
      getCollection(COLLECTIONS.CUSTOMERS),
      getCollection(COLLECTIONS.MODELS),
      getCollection(COLLECTIONS.USERS)
    ])

    // Get Clerk users (total count and recent signups)
    let clerkUsers = []
    let totalClerkUsers = 0
    try {
      const clerkResponse = await clerkClient.users.getUserList({
        limit: 1000 // Get up to 1000 users
      })
      clerkUsers = clerkResponse.data || []
      totalClerkUsers = clerkResponse.total_count || 0
    } catch (clerkError) {
      console.warn('Could not fetch Clerk users:', clerkError.message)
    }

    // Get local MongoDB users
    const localUsers = await usersCollection.find({}).toArray()
    const totalLocalUsers = localUsers.length

    // Calculate total users (Clerk + Local)
    const totalUsers = totalClerkUsers + totalLocalUsers

    // Get active builds (orders in production stages)
    const activeBuilds = await ordersCollection.countDocuments({
      status: { $in: ['confirmed', 'production', 'ready'] },
      stage: { $in: ['design', 'production', 'quality'] }
    })

    // Get total orders (paid orders only)
    const totalOrders = await ordersCollection.countDocuments({
      status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
    })

    // Get total revenue from paid orders
    const revenueData = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { _id: null, total: { $sum: '$totalAmount' } }}
    ]).toArray()
    
    const totalRevenue = revenueData[0]?.total || 0

    // Get daily revenue trend for the selected period
    const dailyRevenue = await ordersCollection.aggregate([
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

    // Get previous period data for comparison
    const previousRevenueData = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: previousStartDate, $lt: startDate }
      }},
      { $group: { _id: null, total: { $sum: '$totalAmount' } }}
    ]).toArray()
    
    const previousRevenue = previousRevenueData[0]?.total || 0
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Get order status distribution
    const orderStatusDistribution = await ordersCollection.aggregate([
      { $group: { 
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$totalAmount' }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get customer acquisition sources
    const customerSources = await customersCollection.aggregate([
      { $group: { 
        _id: '$source',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get recent activity
    const recentOrders = await ordersCollection.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()

    const recentCustomers = await customersCollection.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()

    // Get top models by orders
    const topModels = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { 
        _id: '$modelId',
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }},
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]).toArray()

    // Get model details for top models
    const modelIds = topModels.map(item => item._id)
    const models = await modelsCollection.find({ _id: { $in: modelIds } }).toArray()
    const modelMap = models.reduce((acc, model) => {
      acc[model._id] = model
      return acc
    }, {})

    // Format top models data
    const formattedTopModels = topModels.map(item => ({
      modelId: item._id,
      modelName: modelMap[item._id]?.name || 'Unknown Model',
      orderCount: item.orderCount,
      totalRevenue: item.totalRevenue,
      averageOrder: item.totalRevenue / item.orderCount
    }))

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          activeBuilds,
          totalOrders,
          totalRevenue,
          revenueChange
        },
        trends: {
          dailyRevenue,
          previousRevenue,
          revenueChange
        },
        distribution: {
          orderStatus: orderStatusDistribution,
          customerSources
        },
        recentActivity: {
          orders: recentOrders,
          customers: recentCustomers
        },
        topModels: formattedTopModels
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

// Get detailed user information (Clerk + MongoDB)
router.get('/users/detailed', adminAuth.validatePermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
  try {
    const usersCollection = await getCollection(COLLECTIONS.USERS)
    
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
router.get('/builds/active', adminAuth.validatePermission(PERMISSIONS.ORDERS_VIEW), async (req, res) => {
  try {
    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    const modelsCollection = await getCollection(COLLECTIONS.MODELS)
    
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
router.get('/orders/paid', adminAuth.validatePermission(PERMISSIONS.ORDERS_VIEW), async (req, res) => {
  try {
    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    const modelsCollection = await getCollection(COLLECTIONS.MODELS)
    
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
router.get('/financial/revenue', adminAuth.validatePermission(PERMISSIONS.FINANCIAL_REPORTS), async (req, res) => {
  try {
    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    
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
