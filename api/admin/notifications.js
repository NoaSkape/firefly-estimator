// Notification System API
// Provides comprehensive notification management for admin alerts and updates

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { validateAdminAccess } from '../../lib/adminAuth.js'

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
router.use((req,res,next)=>{ if(process.env.ADMIN_AUTH_DISABLED==='true'){ return next() } return validateAdminAccess(req,res,next) })

// Notification schema
const notificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'warning', 'error', 'success', 'urgent']),
  category: z.enum(['system', 'order', 'user', 'financial', 'inventory', 'maintenance', 'security']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  targetUsers: z.array(z.string()).optional(), // Specific user IDs, empty means all admins
  targetRoles: z.array(z.enum(['admin', 'staff', 'manager'])).optional(),
  actionUrl: z.string().url().optional(),
  actionText: z.string().max(50).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
})

// Get all notifications with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      priority,
      status = 'unread', // unread, read, all
      sort = 'createdAt',
      order = 'desc'
    } = req.query

    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    // Build filter
    const filter = {}
    
    if (type) filter.type = type
    if (category) filter.category = category
    if (priority) filter.priority = priority
    
    // Status filter
    if (status === 'unread') {
      filter.readBy = { $nin: [req.adminUser?.userId] }
    } else if (status === 'read') {
      filter.readBy = { $in: [req.adminUser?.userId] }
    }
    
    // Don't show expired notifications
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get notifications
    const notifications = await notificationsCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await notificationsCollection.countDocuments(filter)

    // Get notification statistics
    const stats = await notificationsCollection.aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    const categoryStats = await notificationsCollection.aggregate([
      { $group: {
        _id: '$category',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get unread count for current user
    const unreadCount = await notificationsCollection.countDocuments({
      readBy: { $nin: [req.adminUser?.userId] },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    })

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        statistics: {
          byType: stats,
          byCategory: categoryStats,
          unreadCount
        }
      }
    })
  } catch (error) {
    console.error('Notifications API error:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// Get single notification
router.get('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params
    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    const notification = await notificationsCollection.findOne({ _id: notificationId })
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    // Check if notification is expired
    if (notification.expiresAt && new Date(notification.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Notification has expired' })
    }

    res.json({
      success: true,
      data: notification
    })
  } catch (error) {
    console.error('Notification detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch notification' })
  }
})

// Create new notification
router.post('/', async (req, res) => {
  try {
    const notificationData = await validateRequest(req, notificationSchema)
    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    // Add metadata
    const newNotification = {
      ...notificationData,
      createdBy: req.adminUser?.userId || 'system',
      createdAt: new Date(),
      readBy: [],
      status: 'active'
    }

    // Set expiration if provided
    if (notificationData.expiresAt) {
      newNotification.expiresAt = new Date(notificationData.expiresAt)
    }

    const result = await notificationsCollection.insertOne(newNotification)

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'notification',
      resourceId: result.insertedId,
      action: 'create',
      changes: notificationData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newNotification }
    })
  } catch (error) {
    console.error('Notification creation API error:', error)
    res.status(500).json({ error: 'Failed to create notification' })
  }
})

// Mark notification as read
router.patch('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params
    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    const notification = await notificationsCollection.findOne({ _id: notificationId })
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    // Check if already read by this user
    if (notification.readBy?.includes(req.adminUser?.userId)) {
      return res.json({
        success: true,
        message: 'Notification already marked as read'
      })
    }

    // Add user to readBy array
    await notificationsCollection.updateOne(
      { _id: notificationId },
      { 
        $addToSet: { readBy: req.adminUser?.userId },
        $set: { lastReadAt: new Date() }
      }
    )

    res.json({
      success: true,
      message: 'Notification marked as read'
    })
  } catch (error) {
    console.error('Mark notification read API error:', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
  try {
    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    // Update all unread notifications for this user
    const result = await notificationsCollection.updateMany(
      { 
        readBy: { $nin: [req.adminUser?.userId] },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      },
      { 
        $addToSet: { readBy: req.adminUser?.userId },
        $set: { lastReadAt: new Date() }
      }
    )

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    })
  } catch (error) {
    console.error('Mark all notifications read API error:', error)
    res.status(500).json({ error: 'Failed to mark all notifications as read' })
  }
})

// Delete notification
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params
    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    const notification = await notificationsCollection.findOne({ _id: notificationId })
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    await notificationsCollection.deleteOne({ _id: notificationId })

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'notification',
      resourceId: notificationId,
      action: 'delete',
      changes: { deleted: true },
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    })
  } catch (error) {
    console.error('Notification deletion API error:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

// Get notification analytics
router.get('/analytics/overview', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)

    // Get notification trends
    const trends = await notificationsCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        errors: { $sum: { $cond: [{ $eq: ['$type', 'error'] }, 1, 0] } }
      }},
      { $sort: { '_id': 1 } }
    ]).toArray()

    // Get type distribution
    const typeDistribution = await notificationsCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: '$type',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get category distribution
    const categoryDistribution = await notificationsCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: '$category',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get priority distribution
    const priorityDistribution = await notificationsCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    // Get read rate analytics
    const readRateAnalytics = await notificationsCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $addFields: {
        readCount: { $size: { $ifNull: ['$readBy', []] } }
      }},
      { $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        totalReads: { $sum: '$readCount' },
        avgReadsPerNotification: { $avg: '$readCount' }
      }}
    ]).toArray()

    res.json({
      success: true,
      data: {
        timeRange: range,
        trends,
        typeDistribution,
        categoryDistribution,
        priorityDistribution,
        readRateAnalytics: readRateAnalytics[0] || {}
      }
    })
  } catch (error) {
    console.error('Notification analytics API error:', error)
    res.status(500).json({ error: 'Failed to fetch notification analytics' })
  }
})

// Create system notification (for automated alerts)
router.post('/system', async (req, res) => {
  try {
    const { 
      title, 
      message, 
      type = 'info', 
      category = 'system',
      priority = 'normal',
      metadata = {}
    } = req.body

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' })
    }

    const db = await getDb()
    const notificationsCollection = db.collection('notifications')

    const systemNotification = {
      title,
      message,
      type,
      category,
      priority,
      metadata,
      createdBy: 'system',
      createdAt: new Date(),
      readBy: [],
      status: 'active',
      isSystemGenerated: true
    }

    const result = await notificationsCollection.insertOne(systemNotification)

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...systemNotification }
    })
  } catch (error) {
    console.error('System notification creation API error:', error)
    res.status(500).json({ error: 'Failed to create system notification' })
  }
})

// Get notification settings
router.get('/settings', async (req, res) => {
  try {
    const db = await getDb()
    const settingsCollection = db.collection('notification_settings')

    const settings = await settingsCollection.findOne({ 
      userId: req.adminUser?.userId 
    }) || {
      userId: req.adminUser?.userId,
      emailNotifications: true,
      pushNotifications: true,
      categories: {
        system: true,
        order: true,
        user: true,
        financial: true,
        inventory: true,
        maintenance: true,
        security: true
      },
      types: {
        info: true,
        warning: true,
        error: true,
        success: true,
        urgent: true
      },
      frequency: 'immediate', // immediate, daily, weekly
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    }

    res.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('Notification settings API error:', error)
    res.status(500).json({ error: 'Failed to fetch notification settings' })
  }
})

// Update notification settings
router.patch('/settings', async (req, res) => {
  try {
    const settingsData = req.body
    const db = await getDb()
    const settingsCollection = db.collection('notification_settings')

    const updatedSettings = {
      ...settingsData,
      userId: req.adminUser?.userId,
      updatedAt: new Date()
    }

    await settingsCollection.updateOne(
      { userId: req.adminUser?.userId },
      { $set: updatedSettings },
      { upsert: true }
    )

    res.json({
      success: true,
      data: updatedSettings
    })
  } catch (error) {
    console.error('Notification settings update API error:', error)
    res.status(500).json({ error: 'Failed to update notification settings' })
  }
})

export default router



