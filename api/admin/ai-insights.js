// AI-Powered Business Insights API
// Provides intelligent business recommendations and predictive analytics

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { adminAuth } from '../../lib/adminAuth.js'

const router = express.Router()

// Admin authentication middleware for all routes
router.use((req, res, next) => adminAuth.validateAdminAccess(req, res, next))

// AI insight schema
const aiInsightSchema = z.object({
  type: z.enum(['revenue', 'customer', 'inventory', 'marketing', 'operational', 'financial']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  recommendation: z.string().min(1).max(1000),
  impact: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(100),
  data: z.record(z.any()).optional(),
  actionItems: z.array(z.string()).optional(),
  estimatedValue: z.number().optional()
})

// Get AI-powered business insights
router.get('/insights', async (req, res) => {
  try {
    const { type, priority, limit = 20 } = req.query
    const db = await getDb()
    const ordersCollection = db.collection('orders')
    const usersCollection = db.collection('users')
    const modelsCollection = db.collection('models')

    // Generate AI insights based on current data
    const insights = await generateAIInsights(db, { type, priority, limit })

    res.json({
      success: true,
      data: {
        insights,
        generatedAt: new Date(),
        totalInsights: insights.length
      }
    })
  } catch (error) {
    console.error('AI insights API error:', error)
    res.status(500).json({ error: 'Failed to generate AI insights' })
  }
})

// Get specific AI insight
router.get('/insights/:insightId', async (req, res) => {
  try {
    const { insightId } = req.params
    const db = await getDb()
    const insightsCollection = db.collection('ai_insights')

    const insight = await insightsCollection.findOne({ _id: insightId })
    
    if (!insight) {
      return res.status(404).json({ error: 'AI insight not found' })
    }

    res.json({
      success: true,
      data: insight
    })
  } catch (error) {
    console.error('AI insight detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch AI insight' })
  }
})

// Generate AI insights based on business data using real AI
async function generateAIInsights(db, filters = {}) {
  const insights = []
  const ordersCollection = db.collection('orders')
  const usersCollection = db.collection('users')
  const modelsCollection = db.collection('models')

  // Get business data for AI analysis
  const businessData = await gatherBusinessData(db)
  
  // Use real AI to generate insights
  const aiInsights = await generateAIInsightsWithClaude(businessData, filters)
  
  // Also include some rule-based insights for comparison
  const ruleBasedInsights = await generateRuleBasedInsights(db, filters)
  
  // Combine AI and rule-based insights
  insights.push(...aiInsights, ...ruleBasedInsights)

  // Filter by priority if specified
  if (filters.priority) {
    return insights.filter(insight => insight.priority === filters.priority)
  }

  // Sort by priority and confidence
  return insights
}

// Gather comprehensive business data for AI analysis
async function gatherBusinessData(db) {
  const ordersCollection = db.collection('orders')
  const usersCollection = db.collection('users')
  const modelsCollection = db.collection('models')

  // Get data for the last 90 days
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [orders, users, models, revenueData, customerData] = await Promise.all([
    ordersCollection.find({ createdAt: { $gte: ninetyDaysAgo } }).toArray(),
    usersCollection.find({}).toArray(),
    modelsCollection.find({}).toArray(),
    ordersCollection.aggregate([
      { $match: { createdAt: { $gte: ninetyDaysAgo } }},
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' },
        uniqueCustomers: { $addToSet: '$customerId' }
      }},
      { $addFields: { uniqueCustomerCount: { $size: '$uniqueCustomers' }}}
    ]).toArray(),
    ordersCollection.aggregate([
      { $match: { createdAt: { $gte: ninetyDaysAgo } }},
      { $group: {
        _id: '$customerId',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        lastOrderDate: { $max: '$createdAt' }
      }}
    ]).toArray()
  ])

  return {
    orders: orders.slice(0, 100), // Limit for AI processing
    users: users.slice(0, 100),
    models: models.slice(0, 50),
    revenueData: revenueData[0] || {},
    customerData: customerData.slice(0, 100),
    timeRange: '90 days',
    analysisDate: new Date().toISOString()
  }
}

// Generate AI insights using Claude
async function generateAIInsightsWithClaude(businessData, filters) {
  try {
    // Check if AI API is configured
    const apiKey = process.env.AI_API_KEY
    if (!apiKey) {
      console.log('AI API key not configured, using rule-based insights only')
      return []
    }

    const apiUrl = process.env.AI_API_URL || 'https://api.anthropic.com/v1'
    const model = process.env.AI_MODEL || 'claude-sonnet-4-20250514'

    // Prepare data summary for AI
    const dataSummary = {
      totalRevenue: businessData.revenueData.totalRevenue || 0,
      totalOrders: businessData.revenueData.totalOrders || 0,
      averageOrderValue: businessData.revenueData.averageOrderValue || 0,
      uniqueCustomers: businessData.revenueData.uniqueCustomerCount || 0,
      topModels: businessData.models.slice(0, 5).map(m => ({ name: m.name, price: m.basePrice })),
      customerSegments: businessData.customerData.slice(0, 10).map(c => ({ 
        orderCount: c.orderCount, 
        totalSpent: c.totalSpent,
        daysSinceLastOrder: Math.floor((new Date() - new Date(c.lastOrderDate)) / (1000 * 60 * 60 * 24))
      }))
    }

    const prompt = `
You are a business intelligence AI analyzing a tiny home dealership's performance data. 

BUSINESS CONTEXT:
- Company: Firefly Tiny Homes (Texas-based tiny home dealership)
- Business Model: Online tiny home sales and customization
- Time Period: Last 90 days
- Data Summary: ${JSON.stringify(dataSummary, null, 2)}

ANALYSIS REQUEST:
Generate 3-5 actionable business insights with the following structure for each insight:

{
  "id": "unique-id",
  "type": "revenue|customer|inventory|marketing|operational|financial",
  "priority": "low|medium|high|critical",
  "title": "Clear, actionable title",
  "description": "Brief description of the insight",
  "recommendation": "Specific, actionable recommendation",
  "impact": "low|medium|high",
  "confidence": 85,
  "actionItems": ["Action 1", "Action 2", "Action 3"],
  "estimatedValue": 50000
}

REQUIREMENTS:
- Focus on actionable insights that can drive revenue or efficiency
- Consider the tiny home industry context
- Include specific recommendations with clear next steps
- Provide realistic confidence scores (70-95%)
- Estimate potential value impact where applicable
- Consider seasonal factors and market trends
- Think about customer acquisition, retention, and lifetime value

Return ONLY a valid JSON array of insights, no additional text.
    `.trim()

    const response = await fetch(`${apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      console.error('AI API error:', response.status, response.statusText)
      return []
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || ''
    
    // Parse AI response
    try {
      const aiInsights = JSON.parse(content)
      if (Array.isArray(aiInsights)) {
        return aiInsights.map(insight => ({
          ...insight,
          aiGenerated: true,
          generatedAt: new Date().toISOString()
        }))
      }
    } catch (parseError) {
      console.error('Failed to parse AI insights:', parseError)
    }

    return []
  } catch (error) {
    console.error('AI insights generation error:', error)
    return []
  }
}

// Generate rule-based insights (fallback when AI is not available)
async function generateRuleBasedInsights(db, filters) {
  const insights = []
  const ordersCollection = db.collection('orders')
  const usersCollection = db.collection('users')
  const modelsCollection = db.collection('models')

  // 1. Revenue Optimization Insights
  if (!filters.type || filters.type === 'revenue') {
    const revenueInsights = await generateRevenueInsights(ordersCollection, modelsCollection)
    insights.push(...revenueInsights)
  }

  // 2. Customer Behavior Insights
  if (!filters.type || filters.type === 'customer') {
    const customerInsights = await generateCustomerInsights(ordersCollection, usersCollection)
    insights.push(...customerInsights)
  }

  // 3. Inventory Management Insights
  if (!filters.type || filters.type === 'inventory') {
    const inventoryInsights = await generateInventoryInsights(ordersCollection, modelsCollection)
    insights.push(...inventoryInsights)
  }

  // 4. Marketing Optimization Insights
  if (!filters.type || filters.type === 'marketing') {
    const marketingInsights = await generateMarketingInsights(ordersCollection, usersCollection)
    insights.push(...marketingInsights)
  }

  // 5. Operational Efficiency Insights
  if (!filters.type || filters.type === 'operational') {
    const operationalInsights = await generateOperationalInsights(ordersCollection)
    insights.push(...operationalInsights)
  }

  // 6. Financial Health Insights
  if (!filters.type || filters.type === 'financial') {
    const financialInsights = await generateFinancialInsights(ordersCollection)
    insights.push(...financialInsights)
  }

  return insights
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return b.confidence - a.confidence
    })
    .slice(0, parseInt(filters.limit) || 20)
}

// Generate revenue optimization insights
async function generateRevenueInsights(ordersCollection, modelsCollection) {
  const insights = []

  // Get revenue data for the last 90 days
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const revenueData = await ordersCollection.aggregate([
    { $match: { 
      status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
      createdAt: { $gte: ninetyDaysAgo }
    }},
    { $group: {
      _id: '$modelId',
      totalRevenue: { $sum: '$totalAmount' },
      orderCount: { $sum: 1 },
      averageOrderValue: { $avg: '$totalAmount' }
    }},
    { $sort: { totalRevenue: -1 } }
  ]).toArray()

  // Get model details
  const modelIds = revenueData.map(item => item._id)
  const models = await modelsCollection.find({ _id: { $in: modelIds } }).toArray()
  const modelMap = models.reduce((acc, model) => {
    acc[model._id] = model
    return acc
  }, {})

  // Insight 1: Top performing model recommendation
  if (revenueData.length > 0) {
    const topModel = revenueData[0]
    const modelInfo = modelMap[topModel._id]
    
    insights.push({
      id: `revenue-top-model-${Date.now()}`,
      type: 'revenue',
      priority: 'high',
      title: 'Focus on Top Performing Model',
      description: `${modelInfo?.name || 'Unknown Model'} is generating ${((topModel.totalRevenue / revenueData.reduce((sum, item) => sum + item.totalRevenue, 0)) * 100).toFixed(1)}% of total revenue.`,
      recommendation: 'Increase marketing spend and inventory for this model. Consider creating variations or premium versions.',
      impact: 'high',
      confidence: 95,
      data: {
        modelId: topModel._id,
        modelName: modelInfo?.name,
        revenue: topModel.totalRevenue,
        orderCount: topModel.orderCount,
        averageOrderValue: topModel.averageOrderValue
      },
      actionItems: [
        'Increase marketing budget for top model',
        'Ensure adequate inventory levels',
        'Consider premium variations',
        'Analyze customer feedback for improvements'
      ],
      estimatedValue: topModel.totalRevenue * 0.15 // 15% potential increase
    })
  }

  // Insight 2: Underperforming model analysis
  if (revenueData.length > 3) {
    const bottomModel = revenueData[revenueData.length - 1]
    const modelInfo = modelMap[bottomModel._id]
    
    insights.push({
      id: `revenue-bottom-model-${Date.now()}`,
      type: 'revenue',
      priority: 'medium',
      title: 'Underperforming Model Needs Attention',
      description: `${modelInfo?.name || 'Unknown Model'} has the lowest revenue performance with only ${bottomModel.orderCount} orders.`,
      recommendation: 'Analyze why this model is underperforming. Consider price adjustments, marketing improvements, or discontinuation.',
      impact: 'medium',
      confidence: 85,
      data: {
        modelId: bottomModel._id,
        modelName: modelInfo?.name,
        revenue: bottomModel.totalRevenue,
        orderCount: bottomModel.orderCount,
        averageOrderValue: bottomModel.averageOrderValue
      },
      actionItems: [
        'Analyze customer feedback',
        'Review pricing strategy',
        'Improve marketing materials',
        'Consider product improvements'
      ],
      estimatedValue: bottomModel.totalRevenue * 0.25 // 25% potential increase
    })
  }

  return insights
}

// Generate customer behavior insights
async function generateCustomerInsights(ordersCollection, usersCollection) {
  const insights = []

  // Get customer data for the last 90 days
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const customerData = await ordersCollection.aggregate([
    { $match: { createdAt: { $gte: ninetyDaysAgo } }},
    { $group: {
      _id: '$customerId',
      orderCount: { $sum: 1 },
      totalSpent: { $sum: '$totalAmount' },
      averageOrderValue: { $avg: '$totalAmount' },
      lastOrderDate: { $max: '$createdAt' }
    }},
    { $addFields: {
      daysSinceLastOrder: {
        $divide: [
          { $subtract: [new Date(), '$lastOrderDate'] },
          1000 * 60 * 60 * 24
        ]
      }
    }}
  ]).toArray()

  // Insight 1: High-value customer retention
  const highValueCustomers = customerData.filter(customer => customer.totalSpent > 100000)
  if (highValueCustomers.length > 0) {
    insights.push({
      id: `customer-high-value-${Date.now()}`,
      type: 'customer',
      priority: 'high',
      title: 'High-Value Customer Retention Opportunity',
      description: `You have ${highValueCustomers.length} high-value customers (spent >$100k). Focus on retention strategies.`,
      recommendation: 'Implement VIP customer program with exclusive benefits, priority support, and personalized offers.',
      impact: 'high',
      confidence: 90,
      data: {
        highValueCustomerCount: highValueCustomers.length,
        totalHighValueRevenue: highValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
        averageHighValueSpend: highValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / highValueCustomers.length
      },
      actionItems: [
        'Create VIP customer program',
        'Implement personalized communication',
        'Offer exclusive benefits',
        'Provide priority support'
      ],
      estimatedValue: highValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0) * 0.20 // 20% retention increase
    })
  }

  // Insight 2: Customer churn risk
  const atRiskCustomers = customerData.filter(customer => 
    customer.daysSinceLastOrder > 90 && customer.totalSpent > 50000
  )
  if (atRiskCustomers.length > 0) {
    insights.push({
      id: `customer-churn-risk-${Date.now()}`,
      type: 'customer',
      priority: 'critical',
      title: 'Customer Churn Risk Alert',
      description: `${atRiskCustomers.length} valuable customers haven't ordered in 90+ days. Immediate action needed.`,
      recommendation: 'Launch re-engagement campaign with special offers and personalized outreach.',
      impact: 'high',
      confidence: 95,
      data: {
        atRiskCustomerCount: atRiskCustomers.length,
        totalAtRiskRevenue: atRiskCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
        averageDaysSinceLastOrder: atRiskCustomers.reduce((sum, c) => sum + c.daysSinceLastOrder, 0) / atRiskCustomers.length
      },
      actionItems: [
        'Launch re-engagement email campaign',
        'Create special offers for returning customers',
        'Implement customer success outreach',
        'Analyze reasons for churn'
      ],
      estimatedValue: atRiskCustomers.reduce((sum, c) => sum + c.totalSpent, 0) * 0.30 // 30% recovery rate
    })
  }

  return insights
}

// Generate inventory management insights
async function generateInventoryInsights(ordersCollection, modelsCollection) {
  const insights = []

  // Get order data for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const inventoryData = await ordersCollection.aggregate([
    { $match: { 
      status: { $in: ['confirmed', 'production', 'ready'] },
      createdAt: { $gte: thirtyDaysAgo }
    }},
    { $group: {
      _id: '$modelId',
      orderCount: { $sum: 1 },
      totalValue: { $sum: '$totalAmount' }
    }},
    { $sort: { orderCount: -1 } }
  ]).toArray()

  // Insight 1: High demand model inventory
  if (inventoryData.length > 0) {
    const topDemandModel = inventoryData[0]
    const modelInfo = await modelsCollection.findOne({ _id: topDemandModel._id })
    
    insights.push({
      id: `inventory-high-demand-${Date.now()}`,
      type: 'inventory',
      priority: 'high',
      title: 'High Demand Model - Inventory Planning',
      description: `${modelInfo?.name || 'Unknown Model'} has ${topDemandModel.orderCount} orders in production. Ensure adequate inventory.`,
      recommendation: 'Increase production capacity and inventory levels for this model. Consider pre-building popular configurations.',
      impact: 'high',
      confidence: 90,
      data: {
        modelId: topDemandModel._id,
        modelName: modelInfo?.name,
        orderCount: topDemandModel.orderCount,
        totalValue: topDemandModel.totalValue
      },
      actionItems: [
        'Increase production capacity',
        'Pre-build popular configurations',
        'Optimize supply chain',
        'Monitor inventory levels closely'
      ],
      estimatedValue: topDemandModel.totalValue * 0.10 // 10% efficiency gain
    })
  }

  return insights
}

// Generate marketing optimization insights
async function generateMarketingInsights(ordersCollection, usersCollection) {
  const insights = []

  // Get order data for the last 60 days
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const marketingData = await ordersCollection.aggregate([
    { $match: { createdAt: { $gte: sixtyDaysAgo } }},
    { $group: {
      _id: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      },
      orderCount: { $sum: 1 },
      totalRevenue: { $sum: '$totalAmount' }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]).toArray()

  // Insight 1: Seasonal trends
  if (marketingData.length > 30) {
    const avgDailyOrders = marketingData.reduce((sum, day) => sum + day.orderCount, 0) / marketingData.length
    const highVolumeDays = marketingData.filter(day => day.orderCount > avgDailyOrders * 1.5)
    
    if (highVolumeDays.length > 0) {
      insights.push({
        id: `marketing-seasonal-${Date.now()}`,
        type: 'marketing',
        priority: 'medium',
        title: 'Seasonal Marketing Opportunities',
        description: `Identified ${highVolumeDays.length} high-volume days with ${(avgDailyOrders * 1.5).toFixed(1)}+ orders.`,
        recommendation: 'Analyze what drives high-volume days and replicate successful marketing strategies.',
        impact: 'medium',
        confidence: 80,
        data: {
          highVolumeDayCount: highVolumeDays.length,
          averageDailyOrders: avgDailyOrders,
          highVolumeThreshold: avgDailyOrders * 1.5
        },
        actionItems: [
          'Analyze high-volume day patterns',
          'Replicate successful marketing campaigns',
          'Plan seasonal promotions',
          'Optimize ad spend timing'
        ],
        estimatedValue: highVolumeDays.reduce((sum, day) => sum + day.totalRevenue, 0) * 0.15 // 15% increase
      })
    }
  }

  return insights
}

// Generate operational efficiency insights
async function generateOperationalInsights(ordersCollection) {
  const insights = []

  // Get order processing data
  const processingData = await ordersCollection.aggregate([
    { $match: { 
      status: { $in: ['production', 'ready', 'delivered'] },
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
      _id: null,
      avgProductionDays: { $avg: '$productionDays' },
      maxProductionDays: { $max: '$productionDays' },
      minProductionDays: { $min: '$productionDays' },
      totalOrders: { $sum: 1 }
    }}
  ]).toArray()

  // Insight 1: Production efficiency
  if (processingData.length > 0) {
    const data = processingData[0]
    
    insights.push({
      id: `operational-production-${Date.now()}`,
      type: 'operational',
      priority: 'medium',
      title: 'Production Efficiency Optimization',
      description: `Average production time is ${data.avgProductionDays.toFixed(1)} days. Range: ${data.minProductionDays.toFixed(1)} - ${data.maxProductionDays.toFixed(1)} days.`,
      recommendation: 'Standardize production processes and identify bottlenecks to reduce average production time.',
      impact: 'medium',
      confidence: 85,
      data: {
        averageProductionDays: data.avgProductionDays,
        maxProductionDays: data.maxProductionDays,
        minProductionDays: data.minProductionDays,
        totalOrders: data.totalOrders
      },
      actionItems: [
        'Analyze production bottlenecks',
        'Standardize processes',
        'Implement quality control',
        'Train production staff'
      ],
      estimatedValue: data.avgProductionDays * 1000 * 0.20 // 20% time reduction
    })
  }

  return insights
}

// Generate financial health insights
async function generateFinancialInsights(ordersCollection) {
  const insights = []

  // Get financial data for the last 90 days
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const financialData = await ordersCollection.aggregate([
    { $match: { 
      status: { $in: ['confirmed', 'production', 'ready', 'delivered', 'completed'] },
      createdAt: { $gte: ninetyDaysAgo }
    }},
    { $group: {
      _id: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      },
      monthlyRevenue: { $sum: '$totalAmount' },
      orderCount: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]).toArray()

  // Insight 1: Revenue growth analysis
  if (financialData.length >= 2) {
    const currentMonth = financialData[financialData.length - 1]
    const previousMonth = financialData[financialData.length - 2]
    const growthRate = ((currentMonth.monthlyRevenue - previousMonth.monthlyRevenue) / previousMonth.monthlyRevenue) * 100
    
    if (growthRate < 0) {
      insights.push({
        id: `financial-decline-${Date.now()}`,
        type: 'financial',
        priority: 'critical',
        title: 'Revenue Decline Alert',
        description: `Revenue declined by ${Math.abs(growthRate).toFixed(1)}% compared to previous month.`,
        recommendation: 'Immediate action required to reverse revenue decline. Analyze market conditions and adjust strategy.',
        impact: 'high',
        confidence: 95,
        data: {
          currentMonthRevenue: currentMonth.monthlyRevenue,
          previousMonthRevenue: previousMonth.monthlyRevenue,
          growthRate: growthRate
        },
        actionItems: [
          'Analyze market conditions',
          'Review pricing strategy',
          'Increase marketing efforts',
          'Improve customer retention'
        ],
        estimatedValue: Math.abs(growthRate) * currentMonth.monthlyRevenue / 100 // Potential recovery
      })
    } else if (growthRate > 20) {
      insights.push({
        id: `financial-growth-${Date.now()}`,
        type: 'financial',
        priority: 'medium',
        title: 'Strong Revenue Growth',
        description: `Revenue grew by ${growthRate.toFixed(1)}% compared to previous month.`,
        recommendation: 'Capitalize on growth momentum with increased investment in marketing and capacity.',
        impact: 'medium',
        confidence: 90,
        data: {
          currentMonthRevenue: currentMonth.monthlyRevenue,
          previousMonthRevenue: previousMonth.monthlyRevenue,
          growthRate: growthRate
        },
        actionItems: [
          'Increase marketing investment',
          'Expand production capacity',
          'Hire additional staff',
          'Invest in technology'
        ],
        estimatedValue: growthRate * currentMonth.monthlyRevenue / 100 // Potential additional growth
      })
    }
  }

  return insights
}

// Save AI insight
router.post('/insights', async (req, res) => {
  try {
    const insightData = await validateRequest(req, aiInsightSchema)
    const db = await getDb()
    const insightsCollection = db.collection('ai_insights')

    const newInsight = {
      ...insightData,
      createdAt: new Date(),
      createdBy: req.adminUser?.userId || 'system',
      status: 'active'
    }

    const result = await insightsCollection.insertOne(newInsight)

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newInsight }
    })
  } catch (error) {
    console.error('AI insight creation API error:', error)
    res.status(500).json({ error: 'Failed to create AI insight' })
  }
})

// Mark insight as implemented
router.patch('/insights/:insightId/implement', async (req, res) => {
  try {
    const { insightId } = req.params
    const { implementationNotes, actualValue } = req.body
    
    const db = await getDb()
    const insightsCollection = db.collection('ai_insights')

    const insight = await insightsCollection.findOne({ _id: insightId })
    if (!insight) {
      return res.status(404).json({ error: 'AI insight not found' })
    }

    await insightsCollection.updateOne(
      { _id: insightId },
      { 
        $set: { 
          status: 'implemented',
          implementedAt: new Date(),
          implementedBy: req.adminUser?.userId || 'system',
          implementationNotes,
          actualValue
        }
      }
    )

    res.json({
      success: true,
      message: 'AI insight marked as implemented'
    })
  } catch (error) {
    console.error('AI insight implementation API error:', error)
    res.status(500).json({ error: 'Failed to mark insight as implemented' })
  }
})

export default router
