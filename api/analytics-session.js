// Real Analytics Session API
// Enterprise-grade session tracking with MongoDB persistence

import { 
  startSession, 
  endSession, 
  trackPageView, 
  getUserAnalytics,
  ensureAnalyticsIndexes
} from '../lib/analytics/sessionTracker.js'
import { requireAuth } from '../lib/auth.js'

export const runtime = 'nodejs'

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Initialize analytics collections
  await ensureAnalyticsIndexes()

  const { pathname } = new URL(req.url, `https://${req.headers.host}`)
  const action = pathname.split('/').pop()

  try {
    switch (action) {
      case 'start':
        return await handleSessionStart(req, res)
      case 'end':
        return await handleSessionEnd(req, res)
      case 'pageview':
        return await handlePageView(req, res)
      case 'page-time':
        return await handlePageTime(req, res)
      case 'event':
        return await handleEvent(req, res)
      case 'analytics':
        return await handleGetAnalytics(req, res)
      default:
        return res.status(404).json({ error: 'Endpoint not found' })
    }
  } catch (error) {
    console.error('[ANALYTICS_API] Error:', error)
    return res.status(500).json({ 
      error: 'Analytics operation failed',
      message: error.message 
    })
  }
}

async function handleSessionStart(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get user ID if authenticated
  const auth = await requireAuth(req, res, false)
  const userId = auth?.userId || null

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const sessionData = {
    userAgent: body.userAgent,
    ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    referrer: body.referrer,
    landingPage: body.landingPage,
    location: body.timezone
  }

  const sessionId = await startSession(userId, sessionData)

  console.log('[ANALYTICS_API] Session started:', sessionId, 'for user:', userId)
  
  return res.status(200).json({
    success: true,
    sessionId,
    userId
  })
}

async function handleSessionEnd(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await requireAuth(req, res, false)
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  
  const duration = await endSession(body.sessionId, auth?.userId)

  console.log('[ANALYTICS_API] Session ended:', body.sessionId, 'duration:', duration)
  
  return res.status(200).json({
    success: true,
    duration
  })
}

async function handlePageView(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await requireAuth(req, res, false)
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  
  await trackPageView(body.sessionId, auth?.userId, {
    page: body.page,
    title: body.title,
    url: body.url,
    referrer: body.referrer,
    userAgent: body.userAgent || req.headers['user-agent'],
    screenResolution: body.screenResolution,
    viewportSize: body.viewportSize
  })

  console.log('[ANALYTICS_API] Page view tracked:', body.page, 'session:', body.sessionId)
  
  return res.status(200).json({
    success: true
  })
}

async function handlePageTime(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  
  // Update the most recent page view with time on page
  const { getDb } = await import('../lib/db.js')
  const { PAGEVIEWS_COLLECTION } = await import('../lib/analytics/sessionTracker.js')
  
  const db = await getDb()
  const pageViewsCol = db.collection(PAGEVIEWS_COLLECTION)
  
  await pageViewsCol.updateOne(
    { 
      sessionId: body.sessionId,
      page: body.page
    },
    { 
      $set: { 
        timeOnPage: body.timeOnPage,
        updatedAt: new Date()
      }
    },
    { sort: { timestamp: -1 } }
  )

  console.log('[ANALYTICS_API] Page time tracked:', body.page, body.timeOnPage, 'seconds')
  
  return res.status(200).json({
    success: true
  })
}

async function handleEvent(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await requireAuth(req, res, false)
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  
  // Store custom events (button clicks, form submissions, etc.)
  const { getDb } = await import('../lib/db.js')
  const db = await getDb()
  const eventsCol = db.collection('AnalyticsEvents')
  
  await eventsCol.insertOne({
    sessionId: body.sessionId,
    userId: auth?.userId || null,
    eventName: body.eventName,
    eventData: body.eventData,
    timestamp: new Date(body.timestamp),
    createdAt: new Date()
  })

  console.log('[ANALYTICS_API] Event tracked:', body.eventName, 'session:', body.sessionId)
  
  return res.status(200).json({
    success: true
  })
}

async function handleGetAnalytics(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const analytics = await getUserAnalytics(auth.userId)
  
  return res.status(200).json({
    success: true,
    analytics
  })
}
