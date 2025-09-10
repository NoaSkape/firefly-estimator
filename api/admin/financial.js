// Financial Dashboard API
// Provides comprehensive financial analytics, revenue tracking, and forecasting

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'

const router = express.Router()

// Financial report schema
const financialReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeProjections: z.boolean().optional().default(false)
})

// Get comprehensive financial dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { range = '30d', includeProjections = false } = req.query
    const db = await getDb()
    const ordersCollection = db.collection('orders')

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

    // Get revenue metrics
    const revenueMetrics = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' },
        minOrderValue: { $min: '$totalAmount' },
        maxOrderValue: { $max: '$totalAmount' }
      }}
    ]).toArray()

    // Get previous period for comparison
    const previousRevenue = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: previousStartDate, $lt: startDate }
      }},
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }}
    ]).toArray()

    // Get daily revenue trends
    const dailyRevenue = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]).toArray()

    // Get revenue by payment status
    const revenueByPaymentStatus = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: '$paymentStatus',
        revenue: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }},
      { $sort: { revenue: -1 } }
    ]).toArray()

    // Get revenue by model
    const revenueByModel = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: '$modelId',
        modelName: { $first: '$modelName' },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        averageValue: { $avg: '$totalAmount' }
      }},
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]).toArray()

    // Calculate growth metrics
    const currentMetrics = revenueMetrics[0] || {}
    const previousMetrics = previousRevenue[0] || {}
    
    const revenueGrowth = previousMetrics.totalRevenue > 0 ? 
      ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100 : 0
    
    const orderGrowth = previousMetrics.orderCount > 0 ? 
      ((currentMetrics.orderCount - previousMetrics.orderCount) / previousMetrics.orderCount) * 100 : 0

    // Get cash flow analysis
    const cashFlow = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray()

    const response = {
      success: true,
      data: {
        timeRange: range,
        period: {
          current: { start: startDate, end: now },
          previous: { start: previousStartDate, end: startDate }
        },
        metrics: {
          current: currentMetrics,
          previous: previousMetrics,
          growth: {
            revenue: revenueGrowth,
            orders: orderGrowth
          }
        },
        trends: {
          daily: dailyRevenue,
          monthly: cashFlow
        },
        breakdown: {
          byPaymentStatus: revenueByPaymentStatus,
          byModel: revenueByModel
        }
      }
    }

    // Add projections if requested
    if (includeProjections === 'true') {
      response.data.projections = await generateRevenueProjections(dailyRevenue, range)
    }

    res.json(response)
  } catch (error) {
    console.error('Financial dashboard API error:', error)
    res.status(500).json({ error: 'Failed to fetch financial dashboard data' })
  }
})

// Get detailed revenue analytics
router.get('/revenue', async (req, res) => {
  try {
    const { 
      range = '30d', 
      groupBy = 'day',
      modelId,
      paymentStatus,
      includeProjections = false
    } = req.query

    const db = await getDb()
    const ordersCollection = db.collection('orders')

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

    // Build match filter
    const matchFilter = {
      status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
      createdAt: { $gte: startDate }
    }
    
    if (modelId) matchFilter.modelId = modelId
    if (paymentStatus) matchFilter.paymentStatus = paymentStatus

    // Set date format based on groupBy
    let dateFormat
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d-%H'
        break
      case 'day':
        dateFormat = '%Y-%m-%d'
        break
      case 'week':
        dateFormat = '%Y-%U'
        break
      case 'month':
        dateFormat = '%Y-%m'
        break
      default:
        dateFormat = '%Y-%m-%d'
    }

    // Get revenue data
    const revenueData = await ordersCollection.aggregate([
      { $match: matchFilter },
      { $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' }
      }},
      { $sort: { '_id': 1 } }
    ]).toArray()

    // Get summary statistics
    const summary = await ordersCollection.aggregate([
      { $match: matchFilter },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' },
        minOrderValue: { $min: '$totalAmount' },
        maxOrderValue: { $max: '$totalAmount' }
      }}
    ]).toArray()

    const response = {
      success: true,
      data: {
        timeRange: range,
        groupBy,
        filters: { modelId, paymentStatus },
        summary: summary[0] || {},
        data: revenueData
      }
    }

    // Add projections if requested
    if (includeProjections === 'true') {
      response.data.projections = await generateRevenueProjections(revenueData, range)
    }

    res.json(response)
  } catch (error) {
    console.error('Revenue analytics API error:', error)
    res.status(500).json({ error: 'Failed to fetch revenue analytics' })
  }
})

// Get profit margin analysis
router.get('/profit-margins', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const db = await getDb()
    const ordersCollection = db.collection('orders')

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)

    // Get profit margin data by model
    const profitMargins = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: '$modelId',
        modelName: { $first: '$modelName' },
        totalRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' }
      }},
      { $sort: { totalRevenue: -1 } }
    ]).toArray()

    // Calculate estimated profit margins (assuming 30% average margin)
    const profitAnalysis = profitMargins.map(item => ({
      ...item,
      estimatedProfit: item.totalRevenue * 0.30,
      estimatedCost: item.totalRevenue * 0.70,
      profitMargin: 30 // This would come from actual cost data in a real system
    }))

    // Get overall profit metrics
    const totalRevenue = profitAnalysis.reduce((sum, item) => sum + item.totalRevenue, 0)
    const totalProfit = profitAnalysis.reduce((sum, item) => sum + item.estimatedProfit, 0)
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    res.json({
      success: true,
      data: {
        timeRange: range,
        overall: {
          totalRevenue,
          totalProfit,
          averageMargin,
          totalOrders: profitAnalysis.reduce((sum, item) => sum + item.orderCount, 0)
        },
        byModel: profitAnalysis
      }
    })
  } catch (error) {
    console.error('Profit margins API error:', error)
    res.status(500).json({ error: 'Failed to fetch profit margin analysis' })
  }
})

// Get financial forecasting
router.get('/forecast', async (req, res) => {
  try {
    const { months = 6, confidence = 'medium' } = req.query
    const db = await getDb()
    const ordersCollection = db.collection('orders')

    // Get historical data for the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const historicalData = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: twelveMonthsAgo }
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

    if (historicalData.length < 3) {
      return res.json({
        success: true,
        data: {
          forecast: [],
          confidence: 'low',
          message: 'Insufficient historical data for forecasting'
        }
      })
    }

    // Generate forecast using simple linear regression
    const forecast = generateFinancialForecast(historicalData, parseInt(months), confidence)

    res.json({
      success: true,
      data: {
        historical: historicalData,
        forecast,
        confidence,
        model: {
          method: 'linear_regression',
          dataPoints: historicalData.length
        }
      }
    })
  } catch (error) {
    console.error('Financial forecast API error:', error)
    res.status(500).json({ error: 'Failed to generate financial forecast' })
  }
})

// Generate financial report
router.post('/report', async (req, res) => {
  try {
    const { startDate, endDate, includeProjections } = await validateRequest(req, financialReportSchema)
    
    const db = await getDb()
    const ordersCollection = db.collection('orders')

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get comprehensive financial data for the period
    const financialData = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: start, $lte: end }
      }},
      { $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray()

    // Get summary metrics
    const summary = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: start, $lte: end }
      }},
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' },
        minOrderValue: { $min: '$totalAmount' },
        maxOrderValue: { $max: '$totalAmount' }
      }}
    ]).toArray()

    // Get top performing models
    const topModels = await ordersCollection.aggregate([
      { $match: { 
        status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
        createdAt: { $gte: start, $lte: end }
      }},
      { $group: {
        _id: '$modelId',
        modelName: { $first: '$modelName' },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }},
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]).toArray()

    const report = {
      success: true,
      data: {
        period: { start, end },
        summary: summary[0] || {},
        monthlyData: financialData,
        topModels,
        generatedAt: new Date(),
        generatedBy: req.adminUser?.userId || 'system'
      }
    }

    // Add projections if requested
    if (includeProjections) {
      report.data.projections = await generateRevenueProjections(financialData, '1y')
    }

    res.json(report)
  } catch (error) {
    console.error('Financial report API error:', error)
    res.status(500).json({ error: 'Failed to generate financial report' })
  }
})

// Helper function to generate revenue projections
async function generateRevenueProjections(historicalData, range) {
  if (historicalData.length < 3) {
    return { confidence: 'low', message: 'Insufficient data for projections' }
  }

  // Simple linear regression for projections
  const dataPoints = historicalData.map((item, index) => ({
    x: index,
    y: item.revenue || item.totalRevenue || 0
  }))

  const n = dataPoints.length
  const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0)
  const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0)
  const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0)
  const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Generate projections for next 3 periods
  const projections = []
  for (let i = 1; i <= 3; i++) {
    const projectedValue = slope * (n + i - 1) + intercept
    projections.push({
      period: i,
      projectedRevenue: Math.max(0, projectedValue),
      confidence: i === 1 ? 'high' : i === 2 ? 'medium' : 'low'
    })
  }

  return {
    projections,
    model: { slope, intercept },
    confidence: 'medium'
  }
}

// Helper function to generate financial forecast
function generateFinancialForecast(historicalData, months, confidence) {
  const dataPoints = historicalData.map(item => ({
    x: item._id.year * 12 + item._id.month,
    y: item.revenue
  }))

  const n = dataPoints.length
  const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0)
  const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0)
  const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0)
  const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const forecast = []
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  for (let i = 1; i <= months; i++) {
    const futureMonth = currentMonth + i
    const futureYear = currentYear + Math.floor((futureMonth - 1) / 12)
    const adjustedMonth = ((futureMonth - 1) % 12) + 1
    const x = futureYear * 12 + adjustedMonth
    const predictedRevenue = slope * x + intercept

    forecast.push({
      year: futureYear,
      month: adjustedMonth,
      predictedRevenue: Math.max(0, predictedRevenue),
      confidence: i <= 3 ? 'high' : i <= 6 ? 'medium' : 'low'
    })
  }

  return forecast
}

export default router
