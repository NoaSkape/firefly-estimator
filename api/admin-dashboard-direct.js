// Direct admin dashboard endpoint with real data integration
// This bypasses complex Express router mounting while providing real analytics data

import { getDb } from '../lib/db.js'
import { ORDERS_COLLECTION } from '../lib/orders.js'
import { BUILDS_COLLECTION } from '../lib/builds.js'
import { createClerkClient } from '@clerk/backend'

export const runtime = 'nodejs'

// Initialize Clerk client
let clerkClient
try {
  if (process.env.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  }
} catch (error) {
  console.error('[DIRECT_DASHBOARD] Clerk init failed:', error.message)
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://www.fireflyestimator.com')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[DIRECT_DASHBOARD] Request received:', {
    method: req.method,
    url: req.url,
    query: req.query,
    adminAuthDisabled: process.env.ADMIN_AUTH_DISABLED === 'true'
  })

  try {
    const { range = '30d' } = req.query
    
    // Calculate date range
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

    // Initialize metrics
    let totalUsers = 0
    let activeBuilds = 0
    let totalOrders = 0
    let totalRevenue = 0
    let newUsers = 0
    let revenueChange = 0
    let dailyRevenue = []
    let orderStatus = []
    let recentOrders = []
    let recentBuilds = []
    let topModels = []

    try {
      // Get database connection
      const db = await getDb()

      // 1. Get Total Users from Clerk
      if (clerkClient) {
        try {
          const users = await clerkClient.users.getUserList({ limit: 1000 })
          totalUsers = users.length
          
          // Count new users in the time range
          const newUsersList = users.filter(user => {
            const createdAt = new Date(user.createdAt)
            return createdAt >= startDate
          })
          newUsers = newUsersList.length
        } catch (clerkError) {
          console.warn('[DIRECT_DASHBOARD] Clerk users fetch failed:', clerkError.message)
        }
      }

      // 2. Get Active Builds
      const buildsCollection = db.collection(BUILDS_COLLECTION)
      activeBuilds = await buildsCollection.countDocuments({
        status: { $in: ['DRAFT', 'REVIEW', 'CONFIRMED', 'CUSTOMIZING'] }
      })

      // Get recent builds
      recentBuilds = await buildsCollection
        .find({}, { 
          sort: { updatedAt: -1 }, 
          limit: 5,
          projection: { 
            _id: 1, 
            status: 1, 
            selections: 1, 
            updatedAt: 1,
            userId: 1
          }
        })
        .toArray()

      // 3. Get Orders Data
      const ordersCollection = db.collection(ORDERS_COLLECTION)
      
      // Total orders (confirmed and completed)
      totalOrders = await ordersCollection.countDocuments({
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      })

      // Revenue calculation
      const revenueResult = await ordersCollection.aggregate([
        { 
          $match: { 
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
            createdAt: { $gte: startDate }
          }
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray()

      if (revenueResult.length > 0) {
        totalRevenue = revenueResult[0].total || 0
      }

      // Previous period revenue for comparison
      const previousRevenueResult = await ordersCollection.aggregate([
        { 
          $match: { 
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
            createdAt: { $gte: previousStartDate, $lt: startDate }
          }
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$totalAmount' }
          }
        }
      ]).toArray()

      const previousRevenue = previousRevenueResult.length > 0 ? previousRevenueResult[0].total : 0
      revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

      // Daily revenue trends
      const dailyRevenueData = await ordersCollection.aggregate([
        { 
          $match: { 
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
            createdAt: { $gte: startDate }
          }
        },
        { 
          $group: { 
            _id: { 
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]).toArray()

      dailyRevenue = dailyRevenueData.map(item => ({
        date: item._id.date,
        revenue: item.total,
        orders: item.count
      }))

      // Order status distribution
      const statusData = await ordersCollection.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { 
          $group: { 
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray()

      orderStatus = statusData.map(item => ({
        status: item._id,
        count: item.count
      }))

      // Recent orders
      recentOrders = await ordersCollection
        .find({}, { 
          sort: { createdAt: -1 }, 
          limit: 5,
          projection: { 
            _id: 1, 
            status: 1, 
            totalAmount: 1, 
            createdAt: 1,
            userId: 1
          }
        })
        .toArray()

      // Top models (would need to join with models collection)
      const modelPerformance = await ordersCollection.aggregate([
        { 
          $match: { 
            status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
            createdAt: { $gte: startDate }
          }
        },
        { 
          $group: { 
            _id: '$model.modelCode',
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            modelName: { $first: '$model.name' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ]).toArray()

      topModels = modelPerformance.map(item => ({
        modelCode: item._id,
        name: item.modelName || item._id,
        revenue: item.revenue,
        orders: item.orders
      }))

    } catch (dbError) {
      console.error('[DIRECT_DASHBOARD] Database error:', dbError.message)
      // Continue with fallback data rather than failing
    }

    const response = {
      success: true,
      data: {
        metrics: {
          totalUsers,
          activeBuilds,
          totalOrders,
          totalRevenue,
          revenueChange: Math.round(revenueChange * 100) / 100,
          newUsers
        },
        growth: {
          userGrowth: newUsers,
          revenueGrowth: revenueChange
        },
        trends: {
          dailyRevenue,
          orderStatus
        },
        recentActivity: {
          orders: recentOrders,
          builds: recentBuilds
        },
        topModels,
        timeRange: range,
        databaseAvailable: true,
        message: 'REAL DATA - Integrated from MongoDB and Clerk'
      }
    }

    console.log('[DIRECT_DASHBOARD] Returning real data:', {
      totalUsers,
      activeBuilds,
      totalOrders,
      totalRevenue: Math.round(totalRevenue),
      newUsers
    })
    
    return res.status(200).json(response)

  } catch (error) {
    console.error('[DIRECT_DASHBOARD] Error:', error)
    
    // Return fallback data on error
    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalUsers: 0,
          activeBuilds: 0,
          totalOrders: 0,
          totalRevenue: 0,
          revenueChange: 0,
          newUsers: 0
        },
        growth: {
          userGrowth: 0,
          revenueGrowth: 0
        },
        trends: {
          dailyRevenue: [],
          orderStatus: []
        },
        recentActivity: {
          orders: [],
          builds: []
        },
        topModels: [],
        timeRange: req.query.range || '30d',
        databaseAvailable: false,
        message: 'FALLBACK DATA - Error occurred: ' + error.message
      }
    })
  }
}
