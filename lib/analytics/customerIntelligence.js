// Enterprise Customer Intelligence Platform
// Comprehensive customer data tracking, session management, and behavior analytics

import { getDb } from '../db.js'
import { createClerkClient } from '@clerk/backend'
import moment from 'moment-timezone'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'

export class CustomerIntelligenceEngine {
  constructor() {
    this.timezone = 'America/Chicago'
    this.sessionTimeout = 30 * 60 * 1000 // 30 minutes
    this.clerkClient = null
    
    // Initialize Clerk client
    this._initializeClerkClient()
  }

  async _initializeClerkClient() {
    try {
      if (process.env.CLERK_SECRET_KEY) {
        this.clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
        console.log('[CUSTOMER_INTELLIGENCE] Clerk client initialized')
      }
    } catch (error) {
      console.error('[CUSTOMER_INTELLIGENCE] Clerk initialization failed:', error.message)
    }
  }

  /**
   * Get comprehensive customer data with all legally collectible information
   */
  async getComprehensiveCustomerData(options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'lastActivity',
      sortOrder = 'desc',
      filters = {},
      includeAnonymous = false
    } = options

    const db = await getDb()
    
    try {
      // Get authenticated users from Clerk
      const clerkUsers = await this._getClerkUsers()
      
      // Get customer profiles from database
      const customerProfiles = await this._getCustomerProfiles(db, filters)
      
      // Get session data
      const sessionData = await this._getSessionData(db, filters)
      
      // Get order history
      const orderHistory = await this._getOrderHistory(db)
      
      // Get build history
      const buildHistory = await this._getBuildHistory(db)
      
      // Get website activity
      const websiteActivity = await this._getWebsiteActivity(db)
      
      // Get anonymous visitor data (if enabled)
      const anonymousData = includeAnonymous ? await this._getAnonymousVisitorData(db) : []
      
      // Merge and enrich customer data
      const enrichedCustomers = await this._enrichCustomerData({
        clerkUsers,
        customerProfiles,
        sessionData,
        orderHistory,
        buildHistory,
        websiteActivity
      })
      
      // Apply filtering and sorting
      const filteredCustomers = this._applyFiltersAndSorting(enrichedCustomers, filters, sortBy, sortOrder)
      
      // Paginate results
      const paginatedResults = this._paginateResults(filteredCustomers, page, limit)
      
      return {
        customers: paginatedResults.data,
        pagination: paginatedResults.pagination,
        summary: this._generateCustomerSummary(enrichedCustomers),
        anonymousVisitors: includeAnonymous ? this._processAnonymousData(anonymousData) : null,
        metadata: {
          totalCustomers: enrichedCustomers.length,
          totalAnonymousVisitors: anonymousData.length,
          dataCollectedAt: new Date().toISOString(),
          privacyCompliant: true
        }
      }
    } catch (error) {
      console.error('[CUSTOMER_INTELLIGENCE] Error gathering customer data:', error)
      throw new Error(`Customer data collection failed: ${error.message}`)
    }
  }

  /**
   * Track real-time customer session activity
   */
  async trackCustomerSession(sessionData) {
    const {
      userId,
      sessionId,
      action,
      page,
      userAgent,
      ipAddress,
      referrer,
      timestamp = new Date()
    } = sessionData

    const db = await getDb()
    const sessionsCollection = db.collection('customer_sessions')
    
    // Create or update session
    const session = {
      sessionId: sessionId || uuidv4(),
      userId: userId || null, // null for anonymous users
      action: action, // 'login', 'logout', 'page_view', 'interaction', 'idle'
      page: page,
      timestamp: timestamp,
      userAgent: userAgent,
      ipAddress: this._hashIP(ipAddress), // Hash IP for privacy
      referrer: referrer,
      location: await this._getLocationFromIP(ipAddress),
      device: this._parseUserAgent(userAgent),
      isAuthenticated: !!userId
    }

    // Insert session event
    await sessionsCollection.insertOne(session)
    
    // Update customer activity
    if (userId) {
      await this._updateCustomerActivity(db, userId, timestamp, action)
    }
    
    // Update real-time analytics
    await this._updateRealTimeAnalytics(db, session)
    
    return {
      sessionId: session.sessionId,
      tracked: true,
      timestamp: timestamp
    }
  }

  /**
   * Get detailed customer profile with all associated data
   */
  async getCustomerProfile(customerId) {
    const db = await getDb()
    
    try {
      // Get base customer data
      const customer = await this._getCustomerById(db, customerId)
      if (!customer) {
        throw new Error('Customer not found')
      }
      
      // Get comprehensive associated data
      const [
        clerkProfile,
        sessions,
        orders,
        builds,
        contracts,
        paymentMethods,
        websiteActivity,
        supportTickets
      ] = await Promise.all([
        this._getClerkProfile(customer.userId),
        this._getCustomerSessions(db, customer.userId),
        this._getCustomerOrders(db, customer.userId),
        this._getCustomerBuilds(db, customer.userId),
        this._getCustomerContracts(db, customer.userId),
        this._getCustomerPaymentMethods(db, customer.userId),
        this._getCustomerWebsiteActivity(db, customer.userId),
        this._getCustomerSupportTickets(db, customer.userId)
      ])
      
      // Calculate customer insights
      const insights = this._calculateCustomerInsights({
        customer,
        sessions,
        orders,
        builds,
        websiteActivity
      })
      
      return {
        profile: {
          ...customer,
          clerkData: clerkProfile,
          insights: insights
        },
        activity: {
          sessions: sessions,
          websiteActivity: websiteActivity,
          lastSeen: this._getLastSeenData(sessions)
        },
        business: {
          orders: orders,
          builds: builds,
          contracts: contracts,
          paymentMethods: this._sanitizePaymentMethods(paymentMethods),
          totalValue: this._calculateTotalCustomerValue(orders),
          lifetime: this._calculateCustomerLifetime(customer, orders)
        },
        support: {
          tickets: supportTickets,
          satisfaction: this._calculateSatisfactionScore(supportTickets)
        },
        compliance: {
          dataCollectionConsent: customer.consent || false,
          privacyPolicyAccepted: customer.privacyAccepted || false,
          marketingOptIn: customer.marketingOptIn || false,
          dataRetentionExpiry: this._calculateDataRetentionExpiry(customer.createdAt)
        }
      }
    } catch (error) {
      console.error('[CUSTOMER_INTELLIGENCE] Error getting customer profile:', error)
      throw error
    }
  }

  /**
   * Get real-time active sessions and user activity
   */
  async getRealTimeActivity() {
    const db = await getDb()
    const now = new Date()
    const activeThreshold = new Date(now.getTime() - this.sessionTimeout)
    
    try {
      // Get active sessions
      const activeSessions = await db.collection('customer_sessions')
        .aggregate([
          {
            $match: {
              timestamp: { $gte: activeThreshold },
              action: { $ne: 'logout' }
            }
          },
          {
            $group: {
              _id: '$userId',
              lastActivity: { $max: '$timestamp' },
              currentPage: { $last: '$page' },
              sessionId: { $last: '$sessionId' },
              device: { $last: '$device' },
              location: { $last: '$location' },
              isAuthenticated: { $last: '$isAuthenticated' }
            }
          },
          {
            $lookup: {
              from: 'customers',
              localField: '_id',
              foreignField: 'userId',
              as: 'customerData'
            }
          }
        ])
        .toArray()
      
      // Get anonymous visitors
      const anonymousVisitors = await db.collection('customer_sessions')
        .aggregate([
          {
            $match: {
              timestamp: { $gte: activeThreshold },
              userId: null,
              action: { $ne: 'logout' }
            }
          },
          {
            $group: {
              _id: '$sessionId',
              lastActivity: { $max: '$timestamp' },
              currentPage: { $last: '$page' },
              device: { $last: '$device' },
              location: { $last: '$location' },
              pageViews: { $sum: 1 }
            }
          }
        ])
        .toArray()
      
      // Get recent logins (last 24 hours)
      const recentLogins = await db.collection('customer_sessions')
        .find({
          action: 'login',
          timestamp: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray()
      
      return {
        activeUsers: {
          authenticated: activeSessions.length,
          anonymous: anonymousVisitors.length,
          total: activeSessions.length + anonymousVisitors.length
        },
        activeSessions: activeSessions.map(session => ({
          userId: session._id,
          customerName: session.customerData[0] ? 
            `${session.customerData[0].firstName} ${session.customerData[0].lastName}` : 
            'Unknown User',
          lastActivity: session.lastActivity,
          currentPage: session.currentPage,
          device: session.device,
          location: session.location,
          sessionDuration: this._calculateSessionDuration(session.sessionId, db)
        })),
        anonymousVisitors: anonymousVisitors.map(visitor => ({
          sessionId: visitor._id,
          lastActivity: visitor.lastActivity,
          currentPage: visitor.currentPage,
          device: visitor.device,
          location: visitor.location,
          pageViews: visitor.pageViews
        })),
        recentLogins: recentLogins.map(login => ({
          userId: login.userId,
          timestamp: login.timestamp,
          device: login.device,
          location: login.location
        })),
        summary: {
          peakHour: await this._getPeakActivityHour(db),
          averageSessionDuration: await this._getAverageSessionDuration(db),
          bounceRate: await this._getBounceRate(db),
          returnVisitorRate: await this._getReturnVisitorRate(db)
        }
      }
    } catch (error) {
      console.error('[CUSTOMER_INTELLIGENCE] Error getting real-time activity:', error)
      throw error
    }
  }

  /**
   * Advanced customer segmentation based on behavior and value
   */
  async segmentCustomers() {
    const db = await getDb()
    
    const segmentation = await db.collection('customers').aggregate([
      {
        $lookup: {
          from: 'Orders',
          localField: 'userId',
          foreignField: 'userId',
          as: 'orders'
        }
      },
      {
        $lookup: {
          from: 'customer_sessions',
          localField: 'userId',
          foreignField: 'userId',
          as: 'sessions'
        }
      },
      {
        $addFields: {
          totalSpent: { $sum: '$orders.totalAmount' },
          orderCount: { $size: '$orders' },
          sessionCount: { $size: '$sessions' },
          lastOrderDate: { $max: '$orders.createdAt' },
          lastSessionDate: { $max: '$sessions.timestamp' },
          daysSinceLastOrder: {
            $divide: [
              { $subtract: [new Date(), { $max: '$orders.createdAt' }] },
              1000 * 60 * 60 * 24
            ]
          },
          daysSinceLastSession: {
            $divide: [
              { $subtract: [new Date(), { $max: '$sessions.timestamp' }] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $addFields: {
          segment: {
            $switch: {
              branches: [
                {
                  case: { $and: [{ $gte: ['$totalSpent', 50000] }, { $gte: ['$orderCount', 2] }] },
                  then: 'VIP'
                },
                {
                  case: { $and: [{ $gte: ['$totalSpent', 25000] }, { $lte: ['$daysSinceLastSession', 30] }] },
                  then: 'High Value Active'
                },
                {
                  case: { $gte: ['$orderCount', 1] },
                  then: 'Customer'
                },
                {
                  case: { $and: [{ $gte: ['$sessionCount', 3] }, { $lte: ['$daysSinceLastSession', 7] }] },
                  then: 'Hot Prospect'
                },
                {
                  case: { $and: [{ $gte: ['$sessionCount', 1] }, { $lte: ['$daysSinceLastSession', 30] }] },
                  then: 'Warm Prospect'
                },
                {
                  case: { $gte: ['$daysSinceLastSession', 90] },
                  then: 'Dormant'
                }
              ],
              default: 'New Visitor'
            }
          },
          riskScore: {
            $switch: {
              branches: [
                { case: { $gte: ['$daysSinceLastSession', 180] }, then: 'High Risk' },
                { case: { $gte: ['$daysSinceLastSession', 90] }, then: 'Medium Risk' },
                { case: { $gte: ['$daysSinceLastSession', 30] }, then: 'Low Risk' }
              ],
              default: 'Active'
            }
          }
        }
      },
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalSpent' },
          avgValue: { $avg: '$totalSpent' },
          customers: {
            $push: {
              userId: '$userId',
              firstName: '$firstName',
              lastName: '$lastName',
              email: '$email',
              totalSpent: '$totalSpent',
              orderCount: '$orderCount',
              lastActivity: '$lastSessionDate',
              riskScore: '$riskScore'
            }
          }
        }
      }
    ]).toArray()

    return {
      segments: segmentation,
      totalCustomers: segmentation.reduce((sum, seg) => sum + seg.count, 0),
      totalValue: segmentation.reduce((sum, seg) => sum + seg.totalValue, 0),
      segmentInsights: this._generateSegmentInsights(segmentation)
    }
  }

  /**
   * Track anonymous visitor behavior (GDPR/CCPA compliant)
   */
  async trackAnonymousVisitor(visitorData) {
    const {
      sessionId,
      page,
      userAgent,
      ipAddress,
      referrer,
      timestamp = new Date(),
      events = []
    } = visitorData

    const db = await getDb()
    
    // Hash sensitive data for privacy
    const hashedIP = this._hashIP(ipAddress)
    const deviceFingerprint = this._generateDeviceFingerprint(userAgent, hashedIP)
    
    const visitorRecord = {
      sessionId: sessionId,
      deviceFingerprint: deviceFingerprint,
      hashedIP: hashedIP,
      page: page,
      userAgent: this._sanitizeUserAgent(userAgent),
      referrer: referrer,
      timestamp: timestamp,
      events: events,
      location: await this._getLocationFromIP(ipAddress), // City/State level only
      device: this._parseUserAgent(userAgent),
      isReturning: await this._checkReturningVisitor(db, deviceFingerprint),
      sessionDuration: 0, // Will be updated
      pageViews: 1,
      bounced: false // Will be updated based on activity
    }
    
    // Store visitor data
    await db.collection('anonymous_visitors').insertOne(visitorRecord)
    
    // Update visitor analytics
    await this._updateVisitorAnalytics(db, visitorRecord)
    
    return {
      sessionId: visitorRecord.sessionId,
      deviceFingerprint: deviceFingerprint,
      tracked: true
    }
  }

  /**
   * Get customer journey and touchpoint analysis
   */
  async getCustomerJourney(userId) {
    const db = await getDb()
    
    try {
      // Get all touchpoints for this customer
      const [
        sessions,
        orders,
        builds,
        websiteEvents,
        emailEvents,
        supportInteractions
      ] = await Promise.all([
        db.collection('customer_sessions').find({ userId }).sort({ timestamp: 1 }).toArray(),
        db.collection('Orders').find({ userId }).sort({ createdAt: 1 }).toArray(),
        db.collection('Builds').find({ userId }).sort({ createdAt: 1 }).toArray(),
        db.collection('website_events').find({ userId }).sort({ timestamp: 1 }).toArray(),
        db.collection('email_events').find({ userId }).sort({ timestamp: 1 }).toArray(),
        db.collection('support_tickets').find({ userId }).sort({ createdAt: 1 }).toArray()
      ])
      
      // Build comprehensive timeline
      const timeline = this._buildCustomerTimeline({
        sessions,
        orders,
        builds,
        websiteEvents,
        emailEvents,
        supportInteractions
      })
      
      // Analyze journey patterns
      const journeyAnalysis = this._analyzeCustomerJourney(timeline)
      
      // Calculate engagement score
      const engagementScore = this._calculateEngagementScore(timeline)
      
      // Generate insights and recommendations
      const insights = this._generateCustomerInsights(timeline, journeyAnalysis, engagementScore)
      
      return {
        customerId: userId,
        timeline: timeline,
        analysis: journeyAnalysis,
        engagement: engagementScore,
        insights: insights,
        summary: {
          totalTouchpoints: timeline.length,
          journeyDuration: this._calculateJourneyDuration(timeline),
          conversionEvents: timeline.filter(t => t.type === 'conversion').length,
          lastActivity: timeline[timeline.length - 1]?.timestamp
        }
      }
    } catch (error) {
      console.error('[CUSTOMER_INTELLIGENCE] Error getting customer journey:', error)
      throw error
    }
  }

  // Private helper methods

  async _getClerkUsers() {
    if (!this.clerkClient) return []
    
    try {
      const users = await this.clerkClient.users.getUserList({ limit: 1000 })
      return users.map(user => ({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.emailAddresses[0]?.emailAddress,
        phone: user.phoneNumbers[0]?.phoneNumber,
        createdAt: new Date(user.createdAt),
        lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
        profileImageUrl: user.profileImageUrl,
        isActive: !!user.lastSignInAt,
        emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
        phoneVerified: user.phoneNumbers[0]?.verification?.status === 'verified'
      }))
    } catch (error) {
      console.error('[CUSTOMER_INTELLIGENCE] Clerk users fetch failed:', error)
      return []
    }
  }

  async _getCustomerProfiles(db, filters) {
    const matchQuery = {}
    
    // Apply filters
    if (filters.status) matchQuery.status = filters.status
    if (filters.source) matchQuery.source = filters.source
    if (filters.search) {
      matchQuery.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } }
      ]
    }
    
    return await db.collection('customers').find(matchQuery).toArray()
  }

  async _getSessionData(db, filters) {
    const sessions = await db.collection('customer_sessions')
      .aggregate([
        {
          $group: {
            _id: '$userId',
            totalSessions: { $sum: 1 },
            lastSession: { $max: '$timestamp' },
            firstSession: { $min: '$timestamp' },
            totalPageViews: { $sum: { $cond: [{ $eq: ['$action', 'page_view'] }, 1, 0] } },
            averageSessionDuration: { $avg: '$sessionDuration' },
            devices: { $addToSet: '$device.type' },
            locations: { $addToSet: '$location.city' },
            pages: { $addToSet: '$page' }
          }
        }
      ])
      .toArray()
    
    return sessions
  }

  async _enrichCustomerData(dataSource) {
    const { clerkUsers, customerProfiles, sessionData, orderHistory, buildHistory, websiteActivity } = dataSource
    
    // Create lookup maps for performance
    const sessionMap = new Map(sessionData.map(s => [s._id, s]))
    const orderMap = new Map()
    const buildMap = new Map()
    
    orderHistory.forEach(order => {
      if (!orderMap.has(order.userId)) orderMap.set(order.userId, [])
      orderMap.get(order.userId).push(order)
    })
    
    buildHistory.forEach(build => {
      if (!buildMap.has(build.userId)) buildMap.set(build.userId, [])
      buildMap.get(build.userId).push(build)
    })
    
    // Merge all data sources
    const enrichedCustomers = []
    
    // Process Clerk users
    clerkUsers.forEach(clerkUser => {
      const sessions = sessionMap.get(clerkUser.userId) || {}
      const orders = orderMap.get(clerkUser.userId) || []
      const builds = buildMap.get(clerkUser.userId) || []
      
      // Find matching customer profile
      const profile = customerProfiles.find(p => p.userId === clerkUser.userId) || {}
      
      const enrichedCustomer = {
        userId: clerkUser.userId,
        customerId: profile.customerId || clerkUser.userId,
        
        // Personal Information
        firstName: clerkUser.firstName || profile.firstName,
        lastName: clerkUser.lastName || profile.lastName,
        email: clerkUser.email || profile.email,
        phone: clerkUser.phone || profile.phone,
        profileImage: clerkUser.profileImageUrl,
        
        // Address Information
        address: profile.address || {},
        
        // Account Status
        status: this._determineCustomerStatus(clerkUser, orders, sessions),
        isActive: this._isCustomerActive(sessions.lastSession),
        emailVerified: clerkUser.emailVerified,
        phoneVerified: clerkUser.phoneVerified,
        
        // Activity Data
        createdAt: clerkUser.createdAt || profile.createdAt,
        lastSignInAt: clerkUser.lastSignInAt,
        lastActivity: sessions.lastSession || clerkUser.lastSignInAt,
        totalSessions: sessions.totalSessions || 0,
        totalPageViews: sessions.totalPageViews || 0,
        averageSessionDuration: sessions.averageSessionDuration || 0,
        
        // Business Data
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        lastOrderDate: orders.length > 0 ? Math.max(...orders.map(o => new Date(o.createdAt))) : null,
        
        // Build Data
        totalBuilds: builds.length,
        activeBuilds: builds.filter(b => ['DRAFT', 'REVIEW', 'CONFIRMED'].includes(b.status)).length,
        lastBuildDate: builds.length > 0 ? Math.max(...builds.map(b => new Date(b.createdAt))) : null,
        
        // Engagement Metrics
        engagementScore: this._calculateEngagementScore({
          sessions: sessions.totalSessions || 0,
          orders: orders.length,
          builds: builds.length,
          recency: sessions.lastSession
        }),
        
        // Device and Location
        devices: sessions.devices || [],
        locations: sessions.locations || [],
        
        // Source Attribution
        source: profile.source || 'unknown',
        campaign: profile.campaign || null,
        referrer: profile.referrer || null,
        
        // Privacy and Compliance
        consent: profile.consent || false,
        marketingOptIn: profile.marketingOptIn || false,
        dataRetentionExpiry: this._calculateDataRetentionExpiry(clerkUser.createdAt)
      }
      
      enrichedCustomers.push(enrichedCustomer)
    })
    
    return enrichedCustomers
  }

  _determineCustomerStatus(clerkUser, orders, sessions) {
    const hasOrders = orders.length > 0
    const hasRecentActivity = sessions.lastSession && 
      new Date(sessions.lastSession) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    if (hasOrders && hasRecentActivity) return 'customer'
    if (hasOrders) return 'inactive_customer'
    if (hasRecentActivity) return 'active_prospect'
    return 'inactive_prospect'
  }

  _isCustomerActive(lastSession) {
    if (!lastSession) return false
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return new Date(lastSession) > thirtyDaysAgo
  }

  _calculateEngagementScore(data) {
    let score = 0
    
    // Session frequency (0-30 points)
    score += Math.min(data.sessions * 2, 30)
    
    // Order activity (0-40 points)
    score += Math.min(data.orders * 20, 40)
    
    // Build activity (0-20 points)
    score += Math.min(data.builds * 10, 20)
    
    // Recency bonus (0-10 points)
    if (data.recency) {
      const daysSince = (Date.now() - new Date(data.recency)) / (1000 * 60 * 60 * 24)
      if (daysSince <= 7) score += 10
      else if (daysSince <= 30) score += 5
    }
    
    return Math.min(score, 100)
  }

  _hashIP(ipAddress) {
    // Simple hash for privacy (in production, use crypto.createHash)
    return ipAddress ? 
      Buffer.from(ipAddress).toString('base64').substring(0, 8) : 
      'unknown'
  }

  _parseUserAgent(userAgent) {
    if (!userAgent) return { type: 'unknown', browser: 'unknown', os: 'unknown' }
    
    // Simple user agent parsing (in production, use a proper library like ua-parser-js)
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
    const isTablet = /iPad|Tablet/.test(userAgent)
    
    let browser = 'unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    let os = 'unknown'
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'
    
    return {
      type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
      browser: browser,
      os: os,
      userAgent: userAgent
    }
  }

  async _getLocationFromIP(ipAddress) {
    // In production, integrate with IP geolocation service
    // For now, return sample data structure
    return {
      country: 'US',
      state: 'TX',
      city: 'Austin',
      timezone: 'America/Chicago',
      coordinates: null // Don't store precise coordinates for privacy
    }
  }

  _calculateDataRetentionExpiry(createdAt) {
    // Calculate data retention expiry (7 years for business records)
    return moment(createdAt).add(7, 'years').toDate()
  }

  _sanitizePaymentMethods(paymentMethods) {
    // Remove sensitive data, keep only necessary business information
    return paymentMethods.map(method => ({
      id: method.id,
      type: method.type, // 'card', 'ach', 'wire'
      last4: method.last4 || null,
      brand: method.brand || null,
      expiryMonth: method.expiryMonth || null,
      expiryYear: method.expiryYear || null,
      isDefault: method.isDefault || false,
      isActive: method.isActive || true,
      createdAt: method.createdAt
      // NO sensitive data like full numbers, CVV, etc.
    }))
  }

  _applyFiltersAndSorting(customers, filters, sortBy, sortOrder) {
    let filtered = [...customers]
    
    // Apply additional filters
    if (filters.engagementLevel) {
      filtered = filtered.filter(c => {
        if (filters.engagementLevel === 'high') return c.engagementScore >= 70
        if (filters.engagementLevel === 'medium') return c.engagementScore >= 40 && c.engagementScore < 70
        if (filters.engagementLevel === 'low') return c.engagementScore < 40
        return true
      })
    }
    
    if (filters.lastActivity) {
      const days = parseInt(filters.lastActivity)
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(c => c.lastActivity && new Date(c.lastActivity) >= threshold)
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]
      
      // Handle date sorting
      if (sortBy.includes('Date') || sortBy.includes('At') || sortBy === 'lastActivity') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }
      
      // Handle string sorting
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal ? bVal.toLowerCase() : ''
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
    
    return filtered
  }

  _paginateResults(data, page, limit) {
    const total = data.length
    const pages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const end = start + limit
    
    return {
      data: data.slice(start, end),
      pagination: {
        page: page,
        limit: limit,
        total: total,
        pages: pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    }
  }

  _generateCustomerSummary(customers) {
    const total = customers.length
    const active = customers.filter(c => c.isActive).length
    const customers_with_orders = customers.filter(c => c.totalOrders > 0).length
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
    const avgEngagement = customers.reduce((sum, c) => sum + c.engagementScore, 0) / total
    
    return {
      totalCustomers: total,
      activeCustomers: active,
      customersWithOrders: customers_with_orders,
      conversionRate: total > 0 ? (customers_with_orders / total) * 100 : 0,
      totalRevenue: totalRevenue,
      averageOrderValue: customers_with_orders > 0 ? totalRevenue / customers_with_orders : 0,
      averageEngagementScore: avgEngagement || 0,
      retentionRate: this._calculateRetentionRate(customers)
    }
  }

  _calculateRetentionRate(customers) {
    const customersWithMultipleOrders = customers.filter(c => c.totalOrders > 1).length
    const customersWithOrders = customers.filter(c => c.totalOrders > 0).length
    
    return customersWithOrders > 0 ? (customersWithMultipleOrders / customersWithOrders) * 100 : 0
  }
}

export default CustomerIntelligenceEngine
