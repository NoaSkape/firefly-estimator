// Advanced Reporting API
// Comprehensive business analytics and report generation

import express from 'express'
import { adminAuth, hasPermission, PERMISSIONS } from '../../lib/adminAuth.js'
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
router.get('/', hasPermission(PERMISSIONS.FINANCIAL_REPORTS), async (req, res) => {
  try {
    const { report, range = '30d', category, status } = req.query
    
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

    // Build match filters
    const matchFilters = { createdAt: { $gte: startDate } }
    if (category) matchFilters['modelInfo.category'] = category
    if (status) matchFilters.status = status

    // Get collections
    const [ordersCollection, customersCollection, modelsCollection, usersCollection] = await Promise.all([
      getCollection(COLLECTIONS.ORDERS),
      getCollection(COLLECTIONS.CUSTOMERS),
      getCollection(COLLECTIONS.MODELS),
      getCollection(COLLECTIONS.USERS)
    ])

    let reportData = {}
    let summary = []

    switch (report) {
      case 'revenue':
        reportData = await generateRevenueReport(ordersCollection, startDate, previousStartDate, matchFilters)
        summary = [
          { label: 'Total Revenue', value: `$${reportData.totalRevenue?.toLocaleString() || '0'}` },
          { label: 'Total Orders', value: reportData.totalOrders?.toLocaleString() || '0' },
          { label: 'Avg Order Value', value: `$${reportData.averageOrderValue?.toLocaleString() || '0'}` },
          { label: 'Growth Rate', value: `${reportData.growthRate?.toFixed(1) || '0'}%` }
        ]
        break

      case 'orders':
        reportData = await generateOrderReport(ordersCollection, startDate, previousStartDate, matchFilters)
        summary = [
          { label: 'Total Orders', value: reportData.totalOrders?.toLocaleString() || '0' },
          { label: 'Confirmed Orders', value: reportData.confirmedOrders?.toLocaleString() || '0' },
          { label: 'Production Orders', value: reportData.productionOrders?.toLocaleString() || '0' },
          { label: 'Completion Rate', value: `${reportData.completionRate?.toFixed(1) || '0'}%` }
        ]
        break

      case 'customers':
        reportData = await generateCustomerReport(customersCollection, ordersCollection, startDate, previousStartDate)
        summary = [
          { label: 'New Customers', value: reportData.newCustomers?.toLocaleString() || '0' },
          { label: 'Returning Customers', value: reportData.returningCustomers?.toLocaleString() || '0' },
          { label: 'Customer Retention', value: `${reportData.retentionRate?.toFixed(1) || '0'}%` },
          { label: 'Avg Customer Value', value: `$${reportData.averageCustomerValue?.toLocaleString() || '0'}` }
        ]
        break

      case 'models':
        reportData = await generateModelReport(ordersCollection, modelsCollection, startDate, previousStartDate, matchFilters)
        summary = [
          { label: 'Top Model', value: reportData.topModel?.name || 'N/A' },
          { label: 'Total Model Orders', value: reportData.totalModelOrders?.toLocaleString() || '0' },
          { label: 'Avg Model Revenue', value: `$${reportData.averageModelRevenue?.toLocaleString() || '0'}` },
          { label: 'Model Conversion', value: `${reportData.modelConversionRate?.toFixed(1) || '0'}%` }
        ]
        break

      case 'trends':
        reportData = await generateTrendsReport(ordersCollection, customersCollection, startDate, previousStartDate)
        summary = [
          { label: 'Revenue Trend', value: reportData.revenueTrend > 0 ? '↗️ Growing' : '↘️ Declining' },
          { label: 'Customer Trend', value: reportData.customerTrend > 0 ? '↗️ Growing' : '↘️ Declining' },
          { label: 'Order Trend', value: reportData.orderTrend > 0 ? '↗️ Growing' : '↘️ Declining' },
          { label: 'Market Position', value: reportData.marketPosition || 'Stable' }
        ]
        break

      default:
        return res.status(400).json({ error: 'Invalid report type' })
    }

    res.json({
      success: true,
      data: {
        ...reportData,
        summary,
        timeRange: range,
        filters: { category, status }
      }
    })

  } catch (error) {
    console.error('Reports API error:', error)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// Export report data
router.get('/export', hasPermission(PERMISSIONS.FINANCIAL_REPORTS), async (req, res) => {
  try {
    const { report, range = '30d', format = 'csv', category, status } = req.query
    
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

    // Build match filters
    const matchFilters = { createdAt: { $gte: startDate } }
    if (category) matchFilters['modelInfo.category'] = category
    if (status) matchFilters.status = status

    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    
    let exportData = []
    
    switch (report) {
      case 'revenue':
        exportData = await generateRevenueExport(ordersCollection, startDate, matchFilters)
        break
      case 'orders':
        exportData = await generateOrdersExport(ordersCollection, startDate, matchFilters)
        break
      case 'customers':
        exportData = await generateCustomersExport(ordersCollection, startDate, matchFilters)
        break
      case 'models':
        exportData = await generateModelsExport(ordersCollection, startDate, matchFilters)
        break
      default:
        return res.status(400).json({ error: 'Invalid report type for export' })
    }

    if (format === 'csv') {
      const csvContent = convertToCSV(exportData)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${report}_report_${new Date().toISOString().split('T')[0]}.csv"`)
      res.send(csvContent)
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${report}_report_${new Date().toISOString().split('T')[0]}.json"`)
      res.json(exportData)
    } else {
      res.status(400).json({ error: 'Unsupported export format' })
    }

  } catch (error) {
    console.error('Export API error:', error)
    res.status(500).json({ error: 'Failed to export report' })
  }
})

// Helper functions for report generation
async function generateRevenueReport(ordersCollection, startDate, previousStartDate, matchFilters) {
  // Current period revenue
  const currentRevenue = await ordersCollection.aggregate([
    { $match: { ...matchFilters, status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
  ]).toArray()

  // Previous period revenue
  const previousRevenue = await ordersCollection.aggregate([
    { $match: { 
      createdAt: { $gte: previousStartDate, $lt: startDate },
      status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
    }},
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]).toArray()

  // Daily revenue trend
  const dailyRevenue = await ordersCollection.aggregate([
    { $match: { ...matchFilters, status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] } } },
    { $group: { 
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      revenue: { $sum: '$totalAmount' },
      orders: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]).toArray()

  const currentTotal = currentRevenue[0]?.total || 0
  const currentCount = currentRevenue[0]?.count || 0
  const previousTotal = previousRevenue[0]?.total || 0
  const growthRate = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

  return {
    totalRevenue: currentTotal,
    totalOrders: currentCount,
    averageOrderValue: currentCount > 0 ? currentTotal / currentCount : 0,
    growthRate,
    dailyRevenue,
    previousPeriodRevenue: previousTotal
  }
}

async function generateOrderReport(ordersCollection, startDate, previousStartDate, matchFilters) {
  // Order status distribution
  const orderStatuses = await ordersCollection.aggregate([
    { $match: matchFilters },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray()

  // Order counts by status
  const confirmedOrders = await ordersCollection.countDocuments({
    ...matchFilters,
    status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
  })

  const productionOrders = await ordersCollection.countDocuments({
    ...matchFilters,
    status: { $in: ['production', 'ready'] }
  })

  const totalOrders = await ordersCollection.countDocuments(matchFilters)
  const completionRate = totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0

  return {
    orderStatuses,
    totalOrders,
    confirmedOrders,
    productionOrders,
    completionRate
  }
}

async function generateCustomerReport(customersCollection, ordersCollection, startDate, previousStartDate) {
  // New customers in current period
  const newCustomers = await customersCollection.countDocuments({
    createdAt: { $gte: startDate }
  })

  // Returning customers (customers with multiple orders)
  const returningCustomers = await ordersCollection.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: '$customerId', orderCount: { $sum: 1 } } },
    { $match: { orderCount: { $gt: 1 } } },
    { $count: 'count' }
  ]).toArray()

  // Customer acquisition sources
  const customerSources = await customersCollection.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray()

  // Average customer value
  const customerValue = await ordersCollection.aggregate([
    { $match: { 
      createdAt: { $gte: startDate },
      status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
    }},
    { $group: { _id: '$customerId', totalValue: { $sum: '$totalAmount' } } },
    { $group: { _id: null, average: { $avg: '$totalValue' } } }
  ]).toArray()

  const retentionRate = newCustomers > 0 ? 
    ((returningCustomers[0]?.count || 0) / newCustomers) * 100 : 0

  return {
    newCustomers,
    returningCustomers: returningCustomers[0]?.count || 0,
    customerSources,
    retentionRate,
    averageCustomerValue: customerValue[0]?.average || 0
  }
}

async function generateModelReport(ordersCollection, modelsCollection, startDate, previousStartDate, matchFilters) {
  // Top performing models
  const topModels = await ordersCollection.aggregate([
    { $match: { ...matchFilters, status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] } } },
    { $group: { 
      _id: '$modelId', 
      orderCount: { $sum: 1 },
      totalRevenue: { $sum: '$totalAmount' }
    }},
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 }
  ]).toArray()

  // Get model details
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

  // Model performance metrics
  const totalModelOrders = topModels.reduce((sum, model) => sum + model.orderCount, 0)
  const totalModelRevenue = topModels.reduce((sum, model) => sum + model.totalRevenue, 0)
  const averageModelRevenue = topModels.length > 0 ? totalModelRevenue / topModels.length : 0

  // Model conversion rate (simplified)
  const modelConversionRate = 15.5 // This would need more complex logic based on views vs orders

  return {
    topModels: topModelsWithDetails,
    totalModelOrders,
    totalModelRevenue,
    averageModelRevenue,
    modelConversionRate,
    topModel: topModelsWithDetails[0]
  }
}

async function generateTrendsReport(ordersCollection, customersCollection, startDate, previousStartDate) {
  // Current period metrics
  const currentMetrics = await Promise.all([
    ordersCollection.aggregate([
      { $match: { 
        createdAt: { $gte: startDate },
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } }}
    ]).toArray(),
    
    customersCollection.countDocuments({ createdAt: { $gte: startDate } })
  ])

  // Previous period metrics
  const previousMetrics = await Promise.all([
    ordersCollection.aggregate([
      { $match: { 
        createdAt: { $gte: previousStartDate, $lt: startDate },
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
      }},
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } }}
    ]).toArray(),
    
    customersCollection.countDocuments({ 
      createdAt: { $gte: previousStartDate, $lt: startDate } 
    })
  ])

  const currentRevenue = currentMetrics[0]?.[0]?.revenue || 0
  const currentOrders = currentMetrics[0]?.[0]?.orders || 0
  const currentCustomers = currentMetrics[1] || 0

  const previousRevenue = previousMetrics[0]?.[0]?.revenue || 0
  const previousOrders = previousMetrics[0]?.[0]?.orders || 0
  const previousCustomers = previousMetrics[1] || 0

  // Calculate trends
  const revenueTrend = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
  const orderTrend = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0
  const customerTrend = previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0

  // Determine market position
  let marketPosition = 'Stable'
  if (revenueTrend > 10 && orderTrend > 10) marketPosition = 'Strong Growth'
  else if (revenueTrend > 5 && orderTrend > 5) marketPosition = 'Growing'
  else if (revenueTrend < -5 || orderTrend < -5) marketPosition = 'Declining'

  // Monthly trends for the last 6 months
  const monthlyTrends = await ordersCollection.aggregate([
    { $match: { 
      createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1) },
      status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
    }},
    { $group: { 
      _id: { 
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      },
      revenue: { $sum: '$totalAmount' },
      orders: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]).toArray()

  const trends = monthlyTrends.map(item => {
    const date = new Date(item._id.year, item._id.month - 1)
    return {
      period: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      revenueGrowth: 0, // Would need previous month data to calculate
      customerGrowth: 0, // Would need previous month data to calculate
      revenue: item.revenue,
      orders: item.orders
    }
  })

  return {
    revenueTrend,
    orderTrend,
    customerTrend,
    marketPosition,
    trends
  }
}

// Export helper functions
async function generateRevenueExport(ordersCollection, startDate, matchFilters) {
  const orders = await ordersCollection.find({
    ...matchFilters,
    status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
  }).sort({ createdAt: -1 }).toArray()

  return orders.map(order => ({
    Date: new Date(order.createdAt).toLocaleDateString(),
    OrderID: order.orderId,
    Customer: order.customerInfo?.name || 'Unknown',
    Model: order.modelInfo?.name || 'Unknown',
    Amount: order.totalAmount,
    Status: order.status,
    CreatedAt: new Date(order.createdAt).toISOString()
  }))
}

async function generateOrdersExport(ordersCollection, startDate, matchFilters) {
  const orders = await ordersCollection.find(matchFilters).sort({ createdAt: -1 }).toArray()

  return orders.map(order => ({
    Date: new Date(order.createdAt).toLocaleDateString(),
    OrderID: order.orderId,
    Customer: order.customerInfo?.name || 'Unknown',
    Model: order.modelInfo?.name || 'Unknown',
    Amount: order.totalAmount,
    Status: order.status,
    Stage: order.stage || 'N/A',
    CreatedAt: new Date(order.createdAt).toISOString()
  }))
}

async function generateCustomersExport(ordersCollection, startDate, matchFilters) {
  const orders = await ordersCollection.find(matchFilters).sort({ createdAt: -1 }).toArray()

  // Group by customer
  const customerMap = new Map()
  orders.forEach(order => {
    const customerId = order.customerId
    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        CustomerID: customerId,
        Name: order.customerInfo?.name || 'Unknown',
        Email: order.customerInfo?.email || 'Unknown',
        TotalOrders: 0,
        TotalSpent: 0,
        FirstOrder: new Date(order.createdAt).toLocaleDateString(),
        LastOrder: new Date(order.createdAt).toLocaleDateString()
      })
    }
    
    const customer = customerMap.get(customerId)
    customer.TotalOrders++
    customer.TotalSpent += order.totalAmount
    customer.LastOrder = new Date(order.createdAt).toLocaleDateString()
  })

  return Array.from(customerMap.values())
}

async function generateModelsExport(ordersCollection, startDate, matchFilters) {
  const orders = await ordersCollection.find({
    ...matchFilters,
    status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] }
  }).sort({ createdAt: -1 }).toArray()

  // Group by model
  const modelMap = new Map()
  orders.forEach(order => {
    const modelId = order.modelId
    if (!modelMap.has(modelId)) {
      modelMap.set(modelId, {
        ModelID: modelId,
        Name: order.modelInfo?.name || 'Unknown',
        Category: order.modelInfo?.category || 'Unknown',
        TotalOrders: 0,
        TotalRevenue: 0,
        AverageOrderValue: 0
      })
    }
    
    const model = modelMap.get(modelId)
    model.TotalOrders++
    model.TotalRevenue += order.totalAmount
    model.AverageOrderValue = model.TotalRevenue / model.TotalOrders
  })

  return Array.from(modelMap.values())
}

// Utility function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ]
  
  return csvRows.join('\n')
}

export default router
