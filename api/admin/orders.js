// Advanced Order Management API
// Provides comprehensive order management with workflow automation

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'

const router = express.Router()

// Order status workflow schema
const ORDER_STATUS_WORKFLOW = {
  'quote': ['confirmed', 'cancelled'],
  'confirmed': ['production', 'cancelled'],
  'production': ['ready', 'delayed', 'cancelled'],
  'ready': ['delivered', 'cancelled'],
  'delivered': ['completed', 'returned'],
  'delayed': ['production', 'cancelled'],
  'cancelled': [],
  'returned': ['production', 'cancelled'],
  'completed': []
}

// Order update schema
const orderUpdateSchema = z.object({
  status: z.enum(['quote', 'confirmed', 'production', 'ready', 'delivered', 'delayed', 'cancelled', 'returned', 'completed']),
  notes: z.string().optional(),
  estimatedDelivery: z.string().datetime().optional(),
  actualDelivery: z.string().datetime().optional(),
  productionStartDate: z.string().datetime().optional(),
  productionEndDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional()
})

// Get orders with advanced filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
      status,
      stage,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      modelId,
      customerId,
      priority
    } = req.query

    const db = await getDb()
    const ordersCollection = db.collection('orders')

    // Build filter object
    const filter = {}
    
    if (status) filter.status = status
    if (stage) filter.stage = stage
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (modelId) filter.modelId = modelId
    if (customerId) filter.customerId = customerId
    if (priority) filter.priority = priority
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {}
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
      if (dateTo) filter.createdAt.$lte = new Date(dateTo)
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { modelName: { $regex: search, $options: 'i' } }
      ]
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get orders with pagination
    const orders = await ordersCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count for pagination
    const total = await ordersCollection.countDocuments(filter)

    // Get status distribution for summary
    const statusDistribution = await ordersCollection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()

    // Get priority distribution
    const priorityDistribution = await ordersCollection.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary: {
          statusDistribution,
          priorityDistribution
        }
      }
    })
  } catch (error) {
    console.error('Orders API error:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// Get single order with full details
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const db = await getDb()
    const ordersCollection = db.collection('orders')

    const order = await ordersCollection.findOne({ _id: orderId })
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Get order history/audit trail
    const auditLogs = await db.collection('audit_logs')
      .find({ resourceId: orderId, resource: 'order' })
      .sort({ timestamp: -1 })
      .toArray()

    // Get related documents
    const documents = await db.collection('documents')
      .find({ orderId })
      .sort({ createdAt: -1 })
      .toArray()

    res.json({
      success: true,
      data: {
        order,
        auditLogs,
        documents,
        workflow: {
          currentStatus: order.status,
          availableTransitions: ORDER_STATUS_WORKFLOW[order.status] || [],
          workflow: ORDER_STATUS_WORKFLOW
        }
      }
    })
  } catch (error) {
    console.error('Order detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch order details' })
  }
})

// Update order status and details
router.patch('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const updateData = await validateRequest(req, orderUpdateSchema)
    
    const db = await getDb()
    const ordersCollection = db.collection('orders')

    // Get current order
    const currentOrder = await ordersCollection.findOne({ _id: orderId })
    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Validate status transition
    if (updateData.status && updateData.status !== currentOrder.status) {
      const allowedTransitions = ORDER_STATUS_WORKFLOW[currentOrder.status] || []
      if (!allowedTransitions.includes(updateData.status)) {
        return res.status(400).json({ 
          error: `Invalid status transition from ${currentOrder.status} to ${updateData.status}`,
          allowedTransitions
        })
      }
    }

    // Prepare update object
    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    }

    // Add status-specific timestamps
    if (updateData.status === 'production' && !currentOrder.productionStartDate) {
      updateFields.productionStartDate = new Date()
    }
    if (updateData.status === 'ready' && !currentOrder.productionEndDate) {
      updateFields.productionEndDate = new Date()
    }
    if (updateData.status === 'delivered' && !currentOrder.actualDelivery) {
      updateFields.actualDelivery = new Date()
    }

    // Update order
    const result = await ordersCollection.updateOne(
      { _id: orderId },
      { $set: updateFields }
    )

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'No changes made to order' })
    }

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'order',
      resourceId: orderId,
      action: 'update',
      changes: updateData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    // Get updated order
    const updatedOrder = await ordersCollection.findOne({ _id: orderId })

    res.json({
      success: true,
      data: updatedOrder
    })
  } catch (error) {
    console.error('Order update API error:', error)
    res.status(500).json({ error: 'Failed to update order' })
  }
})

// Bulk update orders
router.patch('/bulk/update', async (req, res) => {
  try {
    const { orderIds, updates } = req.body
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'orderIds must be a non-empty array' })
    }

    const db = await getDb()
    const ordersCollection = db.collection('orders')

    // Validate updates
    const validatedUpdates = await validateRequest(
      { body: updates },
      orderUpdateSchema
    )

    const updateFields = {
      ...validatedUpdates,
      updatedAt: new Date()
    }

    // Bulk update
    const result = await ordersCollection.updateMany(
      { _id: { $in: orderIds } },
      { $set: updateFields }
    )

    // Create audit logs for each order
    const auditLogs = orderIds.map(orderId => ({
      resource: 'order',
      resourceId: orderId,
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
        orderIds
      }
    })
  } catch (error) {
    console.error('Bulk order update API error:', error)
    res.status(500).json({ error: 'Failed to bulk update orders' })
  }
})

// Get order analytics and insights
router.get('/analytics/insights', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const db = await getDb()
    const ordersCollection = db.collection('orders')

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)

    // Get order volume trends
    const volumeTrends = await ordersCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }},
      { $sort: { '_id': 1 } }
    ]).toArray()

    // Get average processing times by status
    const processingTimes = await ordersCollection.aggregate([
      { $match: { 
        createdAt: { $gte: startDate },
        productionStartDate: { $exists: true },
        productionEndDate: { $exists: true }
      }},
      { $addFields: {
        productionDays: {
          $divide: [
            { $subtract: ['$productionEndDate', '$productionStartDate'] },
            1000 * 60 * 60 * 24
          ]
        }
      }},
      { $group: {
        _id: '$status',
        avgProductionDays: { $avg: '$productionDays' },
        minProductionDays: { $min: '$productionDays' },
        maxProductionDays: { $max: '$productionDays' },
        count: { $sum: 1 }
      }}
    ]).toArray()

    // Get bottleneck analysis
    const bottleneckAnalysis = await ordersCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgAge: {
          $avg: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }},
      { $sort: { avgAge: -1 } }
    ]).toArray()

    // Get customer satisfaction metrics (based on order completion rates)
    const satisfactionMetrics = await ordersCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        returnedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
        }
      }}
    ]).toArray()

    const metrics = satisfactionMetrics[0] || {}
    const completionRate = metrics.totalOrders > 0 ? 
      (metrics.completedOrders / metrics.totalOrders) * 100 : 0
    const cancellationRate = metrics.totalOrders > 0 ? 
      (metrics.cancelledOrders / metrics.totalOrders) * 100 : 0

    res.json({
      success: true,
      data: {
        timeRange: range,
        volumeTrends,
        processingTimes,
        bottleneckAnalysis,
        satisfactionMetrics: {
          completionRate,
          cancellationRate,
          returnRate: metrics.totalOrders > 0 ? 
            (metrics.returnedOrders / metrics.totalOrders) * 100 : 0,
          totalOrders: metrics.totalOrders
        }
      }
    })
  } catch (error) {
    console.error('Order analytics API error:', error)
    res.status(500).json({ error: 'Failed to fetch order analytics' })
  }
})

// Get overdue orders and alerts
router.get('/alerts/overdue', async (req, res) => {
  try {
    const db = await getDb()
    const ordersCollection = db.collection('orders')

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get overdue orders (in production for more than expected time)
    const overdueOrders = await ordersCollection.find({
      status: { $in: ['production', 'ready'] },
      productionStartDate: { $lt: sevenDaysAgo },
      estimatedDelivery: { $lt: now }
    }).toArray()

    // Get orders approaching deadline
    const approachingDeadline = await ordersCollection.find({
      status: { $in: ['production', 'ready'] },
      estimatedDelivery: { 
        $gte: now,
        $lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    }).toArray()

    // Get high priority orders
    const highPriorityOrders = await ordersCollection.find({
      priority: { $in: ['high', 'urgent'] },
      status: { $nin: ['completed', 'cancelled'] }
    }).toArray()

    res.json({
      success: true,
      data: {
        overdue: overdueOrders,
        approachingDeadline,
        highPriority: highPriorityOrders,
        summary: {
          overdueCount: overdueOrders.length,
          approachingCount: approachingDeadline.length,
          highPriorityCount: highPriorityOrders.length
        }
      }
    })
  } catch (error) {
    console.error('Order alerts API error:', error)
    res.status(500).json({ error: 'Failed to fetch order alerts' })
  }
})

export default router
