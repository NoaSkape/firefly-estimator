// User Management API
// Provides comprehensive user management with role-based access control

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { createClerkClient } from '@clerk/backend'
import { adminAuth, ADMIN_ROLES, PERMISSIONS } from '../../lib/adminAuth.js'

const router = express.Router()

// Admin authentication middleware for all routes
router.use(adminAuth.validateAdminAccess.bind(adminAuth))

// Initialize Clerk client
let clerkClient
try {
  if (process.env.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  }
} catch (e) {
  console.error('[ADMIN][users] Clerk init failed:', e?.message || e)
}

// User update schema
const userUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(['customer', 'admin', 'staff', 'manager']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).optional()
})

// Role update schema
const roleUpdateSchema = z.object({
  role: z.enum(Object.values(ADMIN_ROLES))
})

// Get all users with advanced filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
      role,
      status,
      search,
      dateFrom,
      dateTo,
      hasOrders,
      orderValue
    } = req.query

    const db = await getDb()
    const usersCollection = db.collection('users')
    const ordersCollection = db.collection('orders')

    // Build filter
    const filter = {}
    
    if (role) filter.role = role
    if (status) filter.status = status
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {}
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
      if (dateTo) filter.createdAt.$lte = new Date(dateTo)
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get users with pagination
    const users = await usersCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await usersCollection.countDocuments(filter)

    // Get user statistics
    const userStats = await usersCollection.aggregate([
      { $group: {
        _id: '$role',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    const statusStats = await usersCollection.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get order statistics for users
    const userOrderStats = await ordersCollection.aggregate([
      { $group: {
        _id: '$customerId',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        lastOrderDate: { $max: '$createdAt' }
      }},
      { $group: {
        _id: null,
        avgOrdersPerUser: { $avg: '$totalOrders' },
        avgSpentPerUser: { $avg: '$totalSpent' },
        totalUsersWithOrders: { $sum: 1 }
      }}
    ]).toArray()

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        statistics: {
          byRole: userStats,
          byStatus: statusStats,
          orderStats: userOrderStats[0] || {}
        }
      }
    })
  } catch (error) {
    console.error('Users API error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Get single user with detailed information
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const db = await getDb()
    const usersCollection = db.collection('users')
    const ordersCollection = db.collection('orders')

    // Get user from database
    const user = await usersCollection.findOne({ _id: userId })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get user's orders
    const orders = await ordersCollection
      .find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    // Get order statistics
    const orderStats = await ordersCollection.aggregate([
      { $match: { customerId: userId } },
      { $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        firstOrderDate: { $min: '$createdAt' },
        lastOrderDate: { $max: '$createdAt' }
      }}
    ]).toArray()

    // Get order status distribution
    const orderStatusDistribution = await ordersCollection.aggregate([
      { $match: { customerId: userId } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get user's audit logs
    const auditLogs = await db.collection('audit_logs')
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray()

    // Get Clerk user data if available
    let clerkUser = null
    if (clerkClient) {
      try {
        clerkUser = await clerkClient.users.getUser(userId)
      } catch (e) {
        console.warn('Could not fetch Clerk user data:', e.message)
      }
    }

    res.json({
      success: true,
      data: {
        user,
        clerkUser,
        orders,
        orderStats: orderStats[0] || {},
        orderStatusDistribution,
        auditLogs
      }
    })
  } catch (error) {
    console.error('User detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch user details' })
  }
})

// Update user information
router.patch('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const updateData = await validateRequest(req, userUpdateSchema)
    
    const db = await getDb()
    const usersCollection = db.collection('users')

    // Check if user exists
    const existingUser = await usersCollection.findOne({ _id: userId })
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prepare update
    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    }

    // Update user in database
    const result = await usersCollection.updateOne(
      { _id: userId },
      { $set: updateFields }
    )

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'No changes made to user' })
    }

    // Update user in Clerk if available
    if (clerkClient && (updateData.firstName || updateData.lastName || updateData.email)) {
      try {
        const clerkUpdateData = {}
        if (updateData.firstName) clerkUpdateData.firstName = updateData.firstName
        if (updateData.lastName) clerkUpdateData.lastName = updateData.lastName
        if (updateData.email) clerkUpdateData.emailAddress = [updateData.email]
        
        await clerkClient.users.updateUser(userId, clerkUpdateData)
      } catch (e) {
        console.warn('Could not update Clerk user:', e.message)
      }
    }

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'user',
      resourceId: userId,
      action: 'update',
      changes: updateData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    // Get updated user
    const updatedUser = await usersCollection.findOne({ _id: userId })

    res.json({
      success: true,
      data: updatedUser
    })
  } catch (error) {
    console.error('User update API error:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Suspend or activate user
router.patch('/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params
    const { status, reason } = req.body
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const db = await getDb()
    const usersCollection = db.collection('users')

    // Check if user exists
    const user = await usersCollection.findOne({ _id: userId })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update user status
    await usersCollection.updateOne(
      { _id: userId },
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          statusReason: reason
        }
      }
    )

    // Update Clerk user if available
    if (clerkClient) {
      try {
        if (status === 'suspended') {
          await clerkClient.users.banUser(userId)
        } else if (status === 'active') {
          await clerkClient.users.unbanUser(userId)
        }
      } catch (e) {
        console.warn('Could not update Clerk user status:', e.message)
      }
    }

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'user',
      resourceId: userId,
      action: 'status_change',
      changes: { status, reason },
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: status === 'suspended' ? 'warning' : 'info'
    })

    res.json({
      success: true,
      message: `User ${status} successfully`
    })
  } catch (error) {
    console.error('User status update API error:', error)
    res.status(500).json({ error: 'Failed to update user status' })
  }
})

// Get user analytics
router.get('/analytics/overview', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const db = await getDb()
    const usersCollection = db.collection('users')
    const ordersCollection = db.collection('orders')

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)

    // Get user registration trends
    const registrationTrends = await usersCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]).toArray()

    // Get user role distribution
    const roleDistribution = await usersCollection.aggregate([
      { $group: {
        _id: '$role',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get user status distribution
    const statusDistribution = await usersCollection.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get user engagement metrics
    const engagementMetrics = await ordersCollection.aggregate([
      { $group: {
        _id: '$customerId',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        lastOrderDate: { $max: '$createdAt' }
      }},
      { $group: {
        _id: null,
        totalUsersWithOrders: { $sum: 1 },
        avgOrdersPerUser: { $avg: '$orderCount' },
        avgSpentPerUser: { $avg: '$totalSpent' },
        highValueUsers: {
          $sum: { $cond: [{ $gte: ['$totalSpent', 100000] }, 1, 0] }
        }
      }}
    ]).toArray()

    // Get new vs returning customers
    const customerAnalysis = await ordersCollection.aggregate([
      { $group: {
        _id: '$customerId',
        firstOrderDate: { $min: '$createdAt' },
        orderCount: { $sum: 1 }
      }},
      { $addFields: {
        isNewCustomer: {
          $cond: [
            { $gte: ['$firstOrderDate', startDate] },
            'new',
            'returning'
          ]
        }
      }},
      { $group: {
        _id: '$isNewCustomer',
        count: { $sum: 1 }
      }}
    ]).toArray()

    res.json({
      success: true,
      data: {
        timeRange: range,
        registrationTrends,
        roleDistribution,
        statusDistribution,
        engagementMetrics: engagementMetrics[0] || {},
        customerAnalysis
      }
    })
  } catch (error) {
    console.error('User analytics API error:', error)
    res.status(500).json({ error: 'Failed to fetch user analytics' })
  }
})

// Get user activity logs
router.get('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 50 } = req.query
    
    const db = await getDb()
    const auditLogsCollection = db.collection('audit_logs')

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Get user activity logs
    const activityLogs = await auditLogsCollection
      .find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await auditLogsCollection.countDocuments({ userId })

    res.json({
      success: true,
      data: {
        activityLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    console.error('User activity API error:', error)
    res.status(500).json({ error: 'Failed to fetch user activity' })
  }
})

// Bulk user operations
router.patch('/bulk/update', async (req, res) => {
  try {
    const { userIds, updates } = req.body
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' })
    }

    const db = await getDb()
    const usersCollection = db.collection('users')

    // Validate updates
    const validatedUpdates = await validateRequest(
      { body: updates },
      userUpdateSchema
    )

    const updateFields = {
      ...validatedUpdates,
      updatedAt: new Date()
    }

    // Bulk update
    const result = await usersCollection.updateMany(
      { _id: { $in: userIds } },
      { $set: updateFields }
    )

    // Create audit logs for each user
    const auditLogs = userIds.map(userId => ({
      resource: 'user',
      resourceId: userId,
      action: 'bulk_update',
      changes: validatedUpdates,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    }))

    await db.collection('audit_logs').insertMany(auditLogs)

    res.json({
      success: true,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        userIds
      }
    })
  } catch (error) {
    console.error('Bulk user update API error:', error)
    res.status(500).json({ error: 'Failed to bulk update users' })
  }
})

export default router

// Role management endpoint
router.patch('/:userId/role', adminAuth.validatePermission(PERMISSIONS.USERS_EDIT), async (req, res) => {
  try {
    const { userId } = req.params
    const { role } = roleUpdateSchema.parse(req.body)

    // Update role in Clerk public metadata
    if (!clerkClient) {
      return res.status(500).json({ error: 'Clerk client not initialized' })
    }

    // Fetch user first to ensure existence
    await clerkClient.users.getUser(userId)

    await clerkClient.users.updateUser(userId, {
      publicMetadata: { role }
    })

    // Update local users collection role if present
    try {
      const db = await getDb()
      await db.collection('users').updateOne(
        { _id: userId },
        { $set: { role, updatedAt: new Date() } },
        { upsert: false }
      )
      await db.collection('audit_logs').insertOne({
        resource: 'user',
        resourceId: userId,
        action: 'role_update',
        changes: { role },
        userId: req.adminUser?.userId || 'system',
        timestamp: new Date(),
        severity: 'info'
      })
    } catch (e) {
      console.warn('[users.role] local role update/audit failed:', e?.message)
    }

    // Clear auth caches so new role is effective immediately
    try { adminAuth.clearUserCaches(userId) } catch {}

    res.json({ success: true, data: { userId, role } })
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('User role update API error:', error)
    res.status(500).json({ error: 'Failed to update user role' })
  }
})
