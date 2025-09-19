// Enterprise Customer Intelligence API
// Comprehensive customer data management with session tracking and behavior analytics

import CustomerIntelligenceEngine from '../lib/analytics/customerIntelligence.js'

export const runtime = 'nodejs'

// Initialize customer intelligence engine
let customerEngine
try {
  customerEngine = new CustomerIntelligenceEngine()
  console.log('[CUSTOMER_API] Customer Intelligence Engine initialized')
} catch (error) {
  console.error('[CUSTOMER_API] Engine initialization failed:', error.message)
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://www.fireflyestimator.com')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method, query } = req
  const { action } = query

  console.log('[CUSTOMER_API] Request:', {
    method,
    action,
    query: Object.keys(query)
  })

  try {
    switch (action) {
      case 'list':
        return await handleCustomerList(req, res)
      case 'profile':
        return await handleCustomerProfile(req, res)
      case 'sessions':
        return await handleRealTimeSessions(req, res)
      case 'journey':
        return await handleCustomerJourney(req, res)
      case 'segments':
        return await handleCustomerSegmentation(req, res)
      case 'track_session':
        return await handleSessionTracking(req, res)
      case 'track_anonymous':
        return await handleAnonymousTracking(req, res)
      default:
        return await handleCustomerList(req, res)
    }
  } catch (error) {
    console.error('[CUSTOMER_API] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Customer API error',
      message: error.message
    })
  }
}

/**
 * Get comprehensive customer list with all data
 */
async function handleCustomerList(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = 'lastActivity',
      sortOrder = 'desc',
      status,
      source,
      search,
      engagementLevel,
      lastActivity,
      includeAnonymous = false
    } = req.query

    const filters = {
      ...(status && { status }),
      ...(source && { source }),
      ...(search && { search }),
      ...(engagementLevel && { engagementLevel }),
      ...(lastActivity && { lastActivity })
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      filters,
      includeAnonymous: includeAnonymous === 'true'
    }

    const customerData = await customerEngine.getComprehensiveCustomerData(options)

    return res.json({
      success: true,
      data: customerData
    })
  } catch (error) {
    console.error('[CUSTOMER_API] Customer list error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer list',
      message: error.message
    })
  }
}

/**
 * Get detailed customer profile
 */
async function handleCustomerProfile(req, res) {
  try {
    const { customerId } = req.query
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID required'
      })
    }

    const customerProfile = await customerEngine.getCustomerProfile(customerId)

    return res.json({
      success: true,
      data: customerProfile
    })
  } catch (error) {
    console.error('[CUSTOMER_API] Customer profile error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer profile',
      message: error.message
    })
  }
}

/**
 * Get real-time active sessions and user activity
 */
async function handleRealTimeSessions(req, res) {
  try {
    const realTimeActivity = await customerEngine.getRealTimeActivity()

    return res.json({
      success: true,
      data: realTimeActivity
    })
  } catch (error) {
    console.error('[CUSTOMER_API] Real-time sessions error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time activity',
      message: error.message
    })
  }
}

/**
 * Get customer journey analysis
 */
async function handleCustomerJourney(req, res) {
  try {
    const { customerId } = req.query
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID required'
      })
    }

    const journey = await customerEngine.getCustomerJourney(customerId)

    return res.json({
      success: true,
      data: journey
    })
  } catch (error) {
    console.error('[CUSTOMER_API] Customer journey error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer journey',
      message: error.message
    })
  }
}

/**
 * Get customer segmentation analysis
 */
async function handleCustomerSegmentation(req, res) {
  try {
    const segmentation = await customerEngine.segmentCustomers()

    return res.json({
      success: true,
      data: segmentation
    })
  } catch (error) {
    console.error('[CUSTOMER_API] Customer segmentation error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to perform customer segmentation',
      message: error.message
    })
  }
}

/**
 * Track authenticated user session
 */
async function handleSessionTracking(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST method required' })
    }

    const sessionData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    
    const result = await customerEngine.trackCustomerSession(sessionData)

    return res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('[CUSTOMER_API] Session tracking error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to track session',
      message: error.message
    })
  }
}

/**
 * Track anonymous visitor (GDPR/CCPA compliant)
 */
async function handleAnonymousTracking(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST method required' })
    }

    const visitorData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    
    // Ensure privacy compliance
    if (!visitorData.consentGiven) {
      return res.json({
        success: true,
        data: { tracked: false, reason: 'No consent for anonymous tracking' }
      })
    }
    
    const result = await customerEngine.trackAnonymousVisitor(visitorData)

    return res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('[CUSTOMER_API] Anonymous tracking error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to track anonymous visitor',
      message: error.message
    })
  }
}
