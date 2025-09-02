// Enhanced Admin Reports API
// Provides comprehensive reporting capabilities with filtering and export options

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

// Get comprehensive report data
router.get('/:report', adminAuth.validatePermission(PERMISSIONS.FINANCIAL_REPORTS), async (req, res) => {
  try {
    const { report } = req.params
    const { dateRange = '30d', category, status, format = 'json' } = req.query
    
    // Calculate date range
    const now = new Date()
    let startDate
    
    switch (dateRange) {
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

    let reportData = null
    let reportTitle = ''

    switch (report) {
      case 'revenue':
        reportTitle = 'Revenue Report'
        const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
        
        // Build filter
        const revenueFilter = { 
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
        }
        if (category) revenueFilter['model.category'] = category
        
        reportData = await ordersCollection.aggregate([
          { $match: revenueFilter },
          { $group: { 
            _id: { 
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              category: '$model.category'
            },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }},
          { $sort: { '_id.date': 1 } }
        ]).toArray()
        break

      case 'orders':
        reportTitle = 'Orders Report'
        const ordersReportCollection = await getCollection(COLLECTIONS.ORDERS)
        
        // Build filter
        const orderFilter = { createdAt: { $gte: startDate } }
        if (status) orderFilter.status = status
        if (category) orderFilter['model.category'] = category
        
        reportData = await ordersReportCollection.aggregate([
          { $match: orderFilter },
          { $group: { 
            _id: { 
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 },
            total: { $sum: '$totalAmount' }
          }},
          { $sort: { '_id.date': 1 } }
        ]).toArray()
        break

      case 'customers':
        reportTitle = 'Customers Report'
        const customersCollection = await getCollection(COLLECTIONS.CUSTOMERS)
        
        // Build filter
        const customerFilter = { createdAt: { $gte: startDate } }
        if (status) customerFilter.status = status
        if (category) customerFilter.source = category
        
        reportData = await customersCollection.aggregate([
          { $match: customerFilter },
          { $group: { 
            _id: { 
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              source: '$source'
            },
            count: { $sum: 1 }
          }},
          { $sort: { '_id.date': 1 } }
        ]).toArray()
        break

      case 'models':
        reportTitle = 'Models Report'
        const modelsCollection = await getCollection(COLLECTIONS.MODELS)
        const modelsOrdersCollection = await getCollection(COLLECTIONS.ORDERS)
        
        // Build filter
        const modelFilter = {}
        if (category) modelFilter.category = category
        if (status !== undefined) modelFilter.isActive = status === 'true'
        
        // Get model data
        const modelsData = await modelsCollection.find(modelFilter).toArray()
        
        // Get order data for models
        const modelIds = modelsData.map(m => m._id)
        const modelOrders = await modelsOrdersCollection.aggregate([
          { $match: { 
            modelId: { $in: modelIds },
            createdAt: { $gte: startDate }
          }},
          { $group: { 
            _id: '$modelId',
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' }
          }}
        ]).toArray()
        
        // Combine model and order data
        const orderMap = modelOrders.reduce((acc, item) => {
          acc[item._id] = item
          return acc
        }, {})
        
        reportData = modelsData.map(model => ({
          modelId: model._id,
          name: model.name,
          category: model.category,
          basePrice: model.basePrice,
          isActive: model.isActive,
          orderCount: orderMap[model._id]?.orderCount || 0,
          totalRevenue: orderMap[model._id]?.totalRevenue || 0,
          averageOrder: orderMap[model._id]?.orderCount > 0 
            ? orderMap[model._id].totalRevenue / orderMap[model._id].orderCount 
            : 0
        }))
        break

      case 'trends':
        reportTitle = 'Business Trends Report'
        const trendsCollection = await getCollection(COLLECTIONS.ORDERS)
        
        // Get daily trends for multiple metrics
        const trendsData = await trendsCollection.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { 
            _id: { 
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' }
          }},
          { $sort: { '_id.date': 1 } }
        ]).toArray()
        
        reportData = trendsData.map(item => ({
          date: item._id.date,
          orders: item.orders,
          revenue: item.revenue,
          avgOrderValue: item.avgOrderValue
        }))
        break

      default:
        return res.status(400).json({ error: 'Invalid report type specified' })
    }

    // Format response based on requested format
    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(reportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...reportData.map(row => 
          headers.map(header => {
            const value = row[header]
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          }).join(',')
        )
      ].join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${report}-${dateRange}-${Date.now()}.csv"`)
      res.send(csvContent)
    } else {
      // Return JSON
      res.json({
        success: true,
        data: {
          title: reportTitle,
          report,
          dateRange,
          filters: { category, status },
          data: reportData,
          summary: {
            totalRecords: reportData.length,
            generatedAt: new Date().toISOString()
          }
        }
      })
    }
  } catch (error) {
    console.error('Reports API error:', error)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// Export report data
router.post('/export', adminAuth.validatePermission(PERMISSIONS.FINANCIAL_REPORTS), async (req, res) => {
  try {
    const { report, dateRange, category, status, format = 'csv' } = req.body
    
    if (!report) {
      return res.status(400).json({ error: 'Report type is required' })
    }

    // Reuse the same logic as the GET endpoint
    const now = new Date()
    let startDate
    
    switch (dateRange) {
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

    let reportData = null
    let reportTitle = ''

    // Generate report data (simplified version for export)
    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    
    switch (report) {
      case 'revenue':
        reportTitle = 'Revenue Report'
        const revenueFilter = { 
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
        }
        if (category) revenueFilter['model.category'] = category
        
        reportData = await ordersCollection.aggregate([
          { $match: revenueFilter },
          { $group: { 
            _id: { 
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }},
          { $sort: { '_id.date': 1 } }
        ]).toArray()
        break

      case 'orders':
        reportTitle = 'Orders Report'
        const orderFilter = { createdAt: { $gte: startDate } }
        if (status) orderFilter.status = status
        
        reportData = await ordersCollection.aggregate([
          { $match: orderFilter },
          { $group: { 
            _id: { 
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 },
            total: { $sum: '$totalAmount' }
          }},
          { $sort: { '_id.date': 1 } }
        ]).toArray()
        break

      default:
        return res.status(400).json({ error: 'Invalid report type for export' })
    }

    // Format data for export
    const exportData = reportData.map(item => ({
      date: item._id.date || item._id,
      status: item._id.status || 'N/A',
      count: item.count || 0,
      total: item.total || 0
    }))

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header]
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          }).join(',')
        )
      ].join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${report}-${dateRange}-${Date.now()}.csv"`)
      res.send(csvContent)
    } else {
      // Return JSON
      res.json({
        success: true,
        data: {
          title: reportTitle,
          report,
          dateRange,
          filters: { category, status },
          data: exportData,
          summary: {
            totalRecords: exportData.length,
            generatedAt: new Date().toISOString()
          }
        }
      })
    }
  } catch (error) {
    console.error('Export API error:', error)
    res.status(500).json({ error: 'Failed to export report' })
  }
})

export default router
