// Admin Real-Time Monitor API
// Enterprise real-time analytics and customer management

import { getDb } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { createClerkClient } from '@clerk/backend'
import { 
  SESSIONS_COLLECTION, 
  PAGEVIEWS_COLLECTION, 
  USER_ANALYTICS_COLLECTION 
} from '../lib/analytics/sessionTracker.js'

export const runtime = 'nodejs'

// Initialize Clerk client
let clerkClient
try {
  if (process.env.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  }
} catch (error) {
  console.error('[ADMIN_REALTIME] Clerk init failed:', error.message)
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Require admin authentication
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Check if user is admin (simplified check)
  if (process.env.ADMIN_AUTH_DISABLED !== 'true') {
    // Add proper admin check here if needed
  }

  const { pathname } = new URL(req.url, `https://${req.headers.host}`)
  const action = pathname.split('/').pop()

  try {
    switch (action) {
      case 'realtime-monitor':
        return await handleRealtimeMonitor(req, res)
      case 'add':
        return await handleAddCustomer(req, res)
      default:
        return res.status(404).json({ error: 'Endpoint not found' })
    }
  } catch (error) {
    console.error('[ADMIN_REALTIME] Error:', error)
    return res.status(500).json({ 
      error: 'Operation failed',
      message: error.message 
    })
  }
}

async function handleRealtimeMonitor(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const db = await getDb()
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

  // Get active sessions (sessions that haven't ended and were active in last 5 minutes)
  const activeSessions = await db.collection(SESSIONS_COLLECTION)
    .find({
      isActive: true,
      updatedAt: { $gte: fiveMinutesAgo }
    })
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray()

  // Enrich sessions with user data
  const enrichedSessions = await Promise.all(
    activeSessions.map(async (session) => {
      let userEmail = null
      
      if (session.userId && clerkClient) {
        try {
          const user = await clerkClient.users.getUser(session.userId)
          userEmail = user.emailAddresses[0]?.emailAddress
        } catch (error) {
          console.warn('[REALTIME_MONITOR] Failed to fetch user:', session.userId)
        }
      }

      // Calculate session duration
      const duration = session.endTime 
        ? (new Date(session.endTime) - new Date(session.startTime)) / 1000
        : (now - new Date(session.startTime)) / 1000

      return {
        sessionId: session.sessionId,
        userId: session.userId,
        userEmail,
        device: session.device,
        currentPage: session.landingPage, // Would be updated with current page in real implementation
        duration: Math.round(duration),
        location: session.location ? {
          city: session.location.city,
          region: session.location.region,
          country: session.location.country
        } : null,
        startTime: session.startTime
      }
    })
  )

  // Get recent activity (last 30 minutes)
  const recentPageViews = await db.collection(PAGEVIEWS_COLLECTION)
    .find({ timestamp: { $gte: thirtyMinutesAgo } })
    .sort({ timestamp: -1 })
    .limit(20)
    .toArray()

  const recentSessions = await db.collection(SESSIONS_COLLECTION)
    .find({ 
      startTime: { $gte: thirtyMinutesAgo }
    })
    .sort({ startTime: -1 })
    .limit(10)
    .toArray()

  // Build recent activity timeline
  const recentActivity = []

  // Add session starts
  recentSessions.forEach(session => {
    recentActivity.push({
      type: 'session_start',
      description: `New session started`,
      user: session.userId ? 'Registered User' : 'Anonymous',
      timeAgo: getTimeAgo(session.startTime),
      timestamp: session.startTime
    })
  })

  // Add page views
  recentPageViews.slice(0, 10).forEach(pageView => {
    recentActivity.push({
      type: 'pageview',
      description: `Viewed ${pageView.page}`,
      user: pageView.userId ? 'Registered User' : 'Anonymous',
      timeAgo: getTimeAgo(pageView.timestamp),
      timestamp: pageView.timestamp
    })
  })

  // Sort by timestamp
  recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  // Calculate stats
  const stats = {
    currentVisitors: enrichedSessions.length,
    avgSessionTime: enrichedSessions.length > 0 
      ? enrichedSessions.reduce((sum, s) => sum + s.duration, 0) / enrichedSessions.length 
      : 0,
    topPages: await getTopPages(db, thirtyMinutesAgo),
    devices: await getDeviceBreakdown(db, thirtyMinutesAgo)
  }

  console.log('[REALTIME_MONITOR] Returning data:', {
    activeSessions: enrichedSessions.length,
    recentActivity: recentActivity.length,
    stats
  })

  return res.status(200).json({
    success: true,
    activeSessions: enrichedSessions,
    recentActivity: recentActivity.slice(0, 15),
    stats
  })
}

async function handleAddCustomer(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  
  // Validate required fields
  const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip']
  for (const field of required) {
    if (!body[field]?.trim()) {
      return res.status(400).json({ 
        error: 'validation_failed',
        message: `${field} is required` 
      })
    }
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ 
      error: 'validation_failed',
      message: 'Invalid email format' 
    })
  }

  const db = await getDb()
  
  // Check if customer already exists
  const existingCustomer = await db.collection('ManualCustomers')
    .findOne({ email: body.email })

  if (existingCustomer) {
    return res.status(400).json({ 
      error: 'customer_exists',
      message: 'Customer with this email already exists' 
    })
  }

  // Create customer record
  const customer = {
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    address: {
      address: body.address.trim(),
      city: body.city.trim(),
      state: body.state.trim(),
      zip: body.zip.trim(),
      country: 'US'
    },
    source: body.source || 'in_person',
    notes: body.notes?.trim() || '',
    createdBy: 'admin',
    createdByUserId: req.auth?.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'prospect',
    tags: ['manual_entry'],
    // Analytics placeholders
    totalSessions: 0,
    totalPageViews: 0,
    averageSessionDuration: 0,
    engagementScore: 25, // Base score for manual entries
    lastActivity: new Date()
  }

  // Insert customer
  const result = await db.collection('ManualCustomers').insertOne(customer)
  customer._id = result.insertedId

  // Create Clerk account if requested
  if (body.createAccount && clerkClient) {
    try {
      const clerkUser = await clerkClient.users.createUser({
        firstName: customer.firstName,
        lastName: customer.lastName,
        emailAddress: [customer.email],
        phoneNumber: customer.phone ? [customer.phone] : undefined,
        skipPasswordRequirement: true,
        skipPasswordChecks: true
      })
      
      // Update customer with Clerk ID
      await db.collection('ManualCustomers').updateOne(
        { _id: customer._id },
        { 
          $set: { 
            clerkUserId: clerkUser.id,
            hasOnlineAccount: true,
            updatedAt: new Date()
          } 
        }
      )
      
      customer.clerkUserId = clerkUser.id
      customer.hasOnlineAccount = true
      
      console.log('[ADD_CUSTOMER] Created Clerk account:', clerkUser.id)
    } catch (clerkError) {
      console.error('[ADD_CUSTOMER] Failed to create Clerk account:', clerkError)
      // Continue without Clerk account - customer still created
    }
  }

  console.log('[ADD_CUSTOMER] Customer created:', customer._id, customer.email)

  return res.status(200).json({
    success: true,
    customer: {
      id: customer._id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      source: customer.source,
      hasOnlineAccount: customer.hasOnlineAccount || false,
      createdAt: customer.createdAt
    }
  })
}

// Helper functions
async function getTopPages(db, since) {
  const topPages = await db.collection(PAGEVIEWS_COLLECTION)
    .aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$page', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 5 }
    ])
    .toArray()

  return topPages.map(page => ({
    path: page._id,
    views: page.views
  }))
}

async function getDeviceBreakdown(db, since) {
  const devices = await db.collection(SESSIONS_COLLECTION)
    .aggregate([
      { $match: { startTime: { $gte: since } } },
      { $group: { _id: '$device', count: { $sum: 1 } } }
    ])
    .toArray()

  const breakdown = { desktop: 0, mobile: 0, tablet: 0 }
  devices.forEach(device => {
    const deviceType = device._id || 'desktop'
    if (breakdown.hasOwnProperty(deviceType)) {
      breakdown[deviceType] = device.count
    } else {
      breakdown.desktop += device.count // Default unknown to desktop
    }
  })

  return breakdown
}

function getTimeAgo(timestamp) {
  const now = new Date()
  const diff = Math.floor((now - new Date(timestamp)) / 1000)
  
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
