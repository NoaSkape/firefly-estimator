// Enterprise Session Tracking System
// Real-time session analytics with MongoDB persistence

import { getDb } from '../db.js'

export const SESSIONS_COLLECTION = 'Sessions'
export const PAGEVIEWS_COLLECTION = 'PageViews'
export const USER_ANALYTICS_COLLECTION = 'UserAnalytics'

/**
 * Initialize analytics collections and indexes
 */
export async function ensureAnalyticsIndexes() {
  const db = await getDb()
  
  // Sessions collection indexes
  const sessionsCol = db.collection(SESSIONS_COLLECTION)
  await Promise.all([
    sessionsCol.createIndex({ userId: 1, sessionId: 1 }, { unique: true }),
    sessionsCol.createIndex({ userId: 1, startTime: -1 }),
    sessionsCol.createIndex({ startTime: -1 }),
    sessionsCol.createIndex({ endTime: -1 }),
    sessionsCol.createIndex({ isActive: 1 })
  ])
  
  // PageViews collection indexes
  const pageViewsCol = db.collection(PAGEVIEWS_COLLECTION)
  await Promise.all([
    pageViewsCol.createIndex({ userId: 1, timestamp: -1 }),
    pageViewsCol.createIndex({ sessionId: 1, timestamp: -1 }),
    pageViewsCol.createIndex({ page: 1, timestamp: -1 }),
    pageViewsCol.createIndex({ timestamp: -1 })
  ])
  
  // User Analytics collection indexes
  const userAnalyticsCol = db.collection(USER_ANALYTICS_COLLECTION)
  await Promise.all([
    userAnalyticsCol.createIndex({ userId: 1 }, { unique: true }),
    userAnalyticsCol.createIndex({ lastActivity: -1 }),
    userAnalyticsCol.createIndex({ totalSessions: -1 }),
    userAnalyticsCol.createIndex({ totalPageViews: -1 })
  ])
  
  console.log('[ANALYTICS] Indexes ensured for enterprise session tracking')
}

/**
 * Start a new user session
 */
export async function startSession(userId, sessionData = {}) {
  const db = await getDb()
  const sessionsCol = db.collection(SESSIONS_COLLECTION)
  
  const sessionId = generateSessionId()
  const startTime = new Date()
  
  const session = {
    sessionId,
    userId: userId || null,
    startTime,
    endTime: null,
    duration: null,
    isActive: true,
    userAgent: sessionData.userAgent || null,
    ipAddress: sessionData.ipAddress || null,
    referrer: sessionData.referrer || null,
    landingPage: sessionData.landingPage || null,
    device: detectDevice(sessionData.userAgent),
    browser: detectBrowser(sessionData.userAgent),
    location: sessionData.location || null,
    pageViews: 0,
    createdAt: startTime,
    updatedAt: startTime
  }
  
  try {
    await sessionsCol.insertOne(session)
    console.log('[ANALYTICS] Session started:', sessionId, 'for user:', userId)
    return sessionId
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate session - update existing
      await sessionsCol.updateOne(
        { userId, sessionId },
        { $set: { startTime, isActive: true, updatedAt: startTime } }
      )
      return sessionId
    }
    throw error
  }
}

/**
 * End a user session
 */
export async function endSession(sessionId, userId = null) {
  const db = await getDb()
  const sessionsCol = db.collection(SESSIONS_COLLECTION)
  
  const endTime = new Date()
  const session = await sessionsCol.findOne({ 
    sessionId,
    ...(userId ? { userId } : {})
  })
  
  if (!session) {
    console.warn('[ANALYTICS] Session not found for ending:', sessionId)
    return null
  }
  
  const duration = Math.round((endTime - session.startTime) / 1000) // Duration in seconds
  
  await sessionsCol.updateOne(
    { sessionId },
    {
      $set: {
        endTime,
        duration,
        isActive: false,
        updatedAt: endTime
      }
    }
  )
  
  // Update user analytics
  if (session.userId) {
    await updateUserAnalytics(session.userId)
  }
  
  console.log('[ANALYTICS] Session ended:', sessionId, 'duration:', duration, 'seconds')
  return duration
}

/**
 * Track a page view
 */
export async function trackPageView(sessionId, userId, pageData) {
  const db = await getDb()
  const pageViewsCol = db.collection(PAGEVIEWS_COLLECTION)
  const sessionsCol = db.collection(SESSIONS_COLLECTION)
  
  const timestamp = new Date()
  
  const pageView = {
    sessionId,
    userId: userId || null,
    page: pageData.page || window?.location?.pathname || '/',
    title: pageData.title || document?.title || '',
    url: pageData.url || window?.location?.href || '',
    referrer: pageData.referrer || document?.referrer || '',
    timestamp,
    timeOnPage: null, // Will be calculated on next page view
    userAgent: pageData.userAgent || null,
    screenResolution: pageData.screenResolution || null,
    viewportSize: pageData.viewportSize || null
  }
  
  // Insert page view
  await pageViewsCol.insertOne(pageView)
  
  // Update session page view count
  await sessionsCol.updateOne(
    { sessionId },
    { 
      $inc: { pageViews: 1 },
      $set: { updatedAt: timestamp }
    }
  )
  
  // Update user analytics
  if (userId) {
    await updateUserAnalytics(userId)
  }
  
  console.log('[ANALYTICS] Page view tracked:', pageData.page, 'for session:', sessionId)
}

/**
 * Update user analytics aggregates
 */
export async function updateUserAnalytics(userId) {
  if (!userId) return
  
  const db = await getDb()
  const userAnalyticsCol = db.collection(USER_ANALYTICS_COLLECTION)
  const sessionsCol = db.collection(SESSIONS_COLLECTION)
  const pageViewsCol = db.collection(PAGEVIEWS_COLLECTION)
  
  // Get user's session data
  const sessionStats = await sessionsCol.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        averageDuration: { $avg: '$duration' },
        totalPageViews: { $sum: '$pageViews' },
        lastActivity: { $max: '$updatedAt' },
        firstActivity: { $min: '$startTime' }
      }
    }
  ]).toArray()
  
  const pageViewCount = await pageViewsCol.countDocuments({ userId })
  
  const stats = sessionStats[0] || {
    totalSessions: 0,
    totalDuration: 0,
    averageDuration: 0,
    totalPageViews: 0,
    lastActivity: new Date(),
    firstActivity: new Date()
  }
  
  // Calculate engagement score based on real data
  const engagementScore = calculateRealEngagementScore({
    totalSessions: stats.totalSessions,
    totalPageViews: Math.max(stats.totalPageViews, pageViewCount),
    averageDuration: stats.averageDuration || 0,
    accountAge: stats.firstActivity
  })
  
  const userAnalytics = {
    userId,
    totalSessions: stats.totalSessions,
    totalPageViews: Math.max(stats.totalPageViews, pageViewCount),
    averageSessionDuration: Math.round((stats.averageDuration || 0) / 60), // Convert to minutes
    totalTimeOnSite: Math.round((stats.totalDuration || 0) / 60), // Convert to minutes
    engagementScore: Math.round(engagementScore),
    lastActivity: stats.lastActivity,
    firstActivity: stats.firstActivity,
    updatedAt: new Date()
  }
  
  await userAnalyticsCol.replaceOne(
    { userId },
    userAnalytics,
    { upsert: true }
  )
  
  console.log('[ANALYTICS] User analytics updated for:', userId, userAnalytics)
  return userAnalytics
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(userId) {
  if (!userId) return null
  
  const db = await getDb()
  const userAnalyticsCol = db.collection(USER_ANALYTICS_COLLECTION)
  
  const analytics = await userAnalyticsCol.findOne({ userId })
  
  if (!analytics) {
    // Create initial analytics
    return await updateUserAnalytics(userId)
  }
  
  return analytics
}

/**
 * Get session history for a user
 */
export async function getUserSessions(userId, limit = 50) {
  if (!userId) return []
  
  const db = await getDb()
  const sessionsCol = db.collection(SESSIONS_COLLECTION)
  
  return await sessionsCol
    .find({ userId })
    .sort({ startTime: -1 })
    .limit(limit)
    .toArray()
}

/**
 * Get page view history for a user
 */
export async function getUserPageViews(userId, limit = 100) {
  if (!userId) return []
  
  const db = await getDb()
  const pageViewsCol = db.collection(PAGEVIEWS_COLLECTION)
  
  return await pageViewsCol
    .find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray()
}

/**
 * Calculate real engagement score based on actual data
 */
function calculateRealEngagementScore({ totalSessions, totalPageViews, averageDuration, accountAge }) {
  let score = 0
  
  // Session frequency (0-30 points)
  if (totalSessions >= 50) score += 30
  else if (totalSessions >= 20) score += 25
  else if (totalSessions >= 10) score += 20
  else if (totalSessions >= 5) score += 15
  else if (totalSessions >= 1) score += 10
  
  // Page engagement (0-25 points)
  if (totalPageViews >= 200) score += 25
  else if (totalPageViews >= 100) score += 20
  else if (totalPageViews >= 50) score += 15
  else if (totalPageViews >= 20) score += 10
  else if (totalPageViews >= 5) score += 5
  
  // Session quality (0-25 points)
  const avgMinutes = averageDuration / 60
  if (avgMinutes >= 30) score += 25
  else if (avgMinutes >= 15) score += 20
  else if (avgMinutes >= 10) score += 15
  else if (avgMinutes >= 5) score += 10
  else if (avgMinutes >= 2) score += 5
  
  // Account longevity (0-20 points)
  if (accountAge) {
    const daysSinceCreation = (Date.now() - new Date(accountAge)) / (1000 * 60 * 60 * 24)
    if (daysSinceCreation >= 365) score += 20
    else if (daysSinceCreation >= 180) score += 15
    else if (daysSinceCreation >= 90) score += 10
    else if (daysSinceCreation >= 30) score += 5
  }
  
  return Math.min(score, 100)
}

/**
 * Utility functions
 */
function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function detectDevice(userAgent) {
  if (!userAgent) return 'unknown'
  
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'mobile'
  if (/Tablet|iPad/.test(userAgent)) return 'tablet'
  return 'desktop'
}

function detectBrowser(userAgent) {
  if (!userAgent) return 'unknown'
  
  if (userAgent.includes('Chrome')) return 'chrome'
  if (userAgent.includes('Firefox')) return 'firefox'
  if (userAgent.includes('Safari')) return 'safari'
  if (userAgent.includes('Edge')) return 'edge'
  return 'other'
}
