// Debug Data Sources - Comprehensive investigation of dashboard data
// This endpoint will help us understand why dashboard shows zeros when real data exists

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
  console.error('[DEBUG_DATA] Clerk init failed:', error.message)
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const debugData = {
    timestamp: new Date().toISOString(),
    environment: {},
    clerk: {},
    database: {},
    collections: {},
    dataSamples: {},
    errors: []
  }

  try {
    // 1. Environment Variables Check
    debugData.environment = {
      clerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      clerkSecretKeyLength: process.env.CLERK_SECRET_KEY ? process.env.CLERK_SECRET_KEY.length : 0,
      mongodbUri: !!process.env.MONGODB_URI,
      mongodbDb: process.env.MONGODB_DB || 'not_set',
      ordersCollection: ORDERS_COLLECTION,
      buildsCollection: BUILDS_COLLECTION,
      adminAuthDisabled: process.env.ADMIN_AUTH_DISABLED === 'true',
      nodeEnv: process.env.NODE_ENV || 'not_set'
    }

    // 2. Clerk Integration Test
    if (clerkClient) {
      try {
        debugData.clerk.initialized = true
        const users = await clerkClient.users.getUserList({ limit: 10 })
        debugData.clerk.totalUsers = users.length
        debugData.clerk.sampleUsers = users.slice(0, 3).map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.emailAddresses[0]?.emailAddress,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt
        }))

        // Check for new users in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const newUsers = users.filter(user => new Date(user.createdAt) >= thirtyDaysAgo)
        debugData.clerk.newUsersLast30Days = newUsers.length

      } catch (clerkError) {
        debugData.clerk.error = clerkError.message
        debugData.errors.push(`Clerk error: ${clerkError.message}`)
      }
    } else {
      debugData.clerk.initialized = false
      debugData.errors.push('Clerk client not initialized')
    }

    // 3. Database Connection Test
    try {
      const db = await getDb()
      debugData.database.connected = true
      debugData.database.dbName = db.databaseName

      // List all collections
      const collections = await db.listCollections().toArray()
      debugData.database.allCollections = collections.map(c => c.name)
      debugData.database.totalCollections = collections.length

      // 4. Test specific collections
      const collectionsToTest = [
        { name: ORDERS_COLLECTION, key: 'orders' },
        { name: BUILDS_COLLECTION, key: 'builds' },
        { name: 'Models', key: 'models' },
        { name: 'models', key: 'modelsLower' },
        { name: 'customers', key: 'customers' },
        { name: 'Customers', key: 'customersUpper' }
      ]

      for (const { name, key } of collectionsToTest) {
        try {
          const collection = db.collection(name)
          const count = await collection.countDocuments()
          const sample = await collection.findOne()
          
          debugData.collections[key] = {
            name,
            exists: count > 0,
            count,
            sampleDocument: sample ? {
              _id: sample._id,
              keys: Object.keys(sample),
              hasStatus: 'status' in sample,
              hasCreatedAt: 'createdAt' in sample,
              hasUserId: 'userId' in sample,
              hasTotalAmount: 'totalAmount' in sample,
              status: sample.status,
              createdAt: sample.createdAt
            } : null
          }
        } catch (collectionError) {
          debugData.collections[key] = {
            name,
            error: collectionError.message
          }
          debugData.errors.push(`Collection ${name} error: ${collectionError.message}`)
        }
      }

      // 5. Specific Data Analysis
      if (debugData.collections.builds?.count > 0) {
        const buildsCollection = db.collection(BUILDS_COLLECTION)
        
        // Count by status
        const buildStatuses = await buildsCollection.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray()
        
        debugData.dataSamples.buildStatuses = buildStatuses
        
        // Count active builds (what should show in dashboard)
        const activeBuilds = await buildsCollection.countDocuments({
          status: { $in: ['DRAFT', 'REVIEW', 'CONFIRMED', 'CUSTOMIZING'] }
        })
        debugData.dataSamples.activeBuildCount = activeBuilds
      }

      if (debugData.collections.orders?.count > 0) {
        const ordersCollection = db.collection(ORDERS_COLLECTION)
        
        // Count by status
        const orderStatuses = await ordersCollection.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray()
        
        debugData.dataSamples.orderStatuses = orderStatuses
        
        // Count confirmed orders (what should show in dashboard)
        const confirmedOrders = await ordersCollection.countDocuments({
          status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
        })
        debugData.dataSamples.confirmedOrderCount = confirmedOrders
        
        // Calculate total revenue
        const revenueResult = await ordersCollection.aggregate([
          { 
            $match: { 
              status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
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
        
        debugData.dataSamples.totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0
        debugData.dataSamples.revenueOrderCount = revenueResult.length > 0 ? revenueResult[0].count : 0
      }

    } catch (dbError) {
      debugData.database.error = dbError.message
      debugData.errors.push(`Database error: ${dbError.message}`)
    }

    // 6. Final Analysis
    debugData.analysis = {
      shouldHaveUsers: debugData.clerk.totalUsers > 0,
      shouldHaveBuilds: debugData.collections.builds?.count > 0,
      shouldHaveOrders: debugData.collections.orders?.count > 0,
      dashboardShouldShow: {
        totalUsers: debugData.clerk.totalUsers || 0,
        activeBuilds: debugData.dataSamples.activeBuildCount || 0,
        totalOrders: debugData.dataSamples.confirmedOrderCount || 0,
        totalRevenue: debugData.dataSamples.totalRevenue || 0
      }
    }

    // 7. Recommendations
    debugData.recommendations = []
    
    if (debugData.errors.length === 0) {
      debugData.recommendations.push('✅ All connections working - data should be visible')
    }
    
    if (!debugData.clerk.initialized) {
      debugData.recommendations.push('🔧 Fix Clerk initialization - check CLERK_SECRET_KEY')
    }
    
    if (debugData.collections.builds?.count === 0) {
      debugData.recommendations.push('📝 No builds found - check collection name or add test data')
    }
    
    if (debugData.collections.orders?.count === 0) {
      debugData.recommendations.push('📝 No orders found - check collection name or add test data')
    }

    return res.status(200).json({
      success: true,
      debug: debugData
    })

  } catch (error) {
    debugData.errors.push(`Main error: ${error.message}`)
    return res.status(500).json({
      success: false,
      error: error.message,
      debug: debugData
    })
  }
}
