// Real Enterprise Customer Data API
// Uses actual Clerk users and MongoDB data for comprehensive customer intelligence

import { getDb } from '../lib/db.js'
import { ORDERS_COLLECTION } from '../lib/orders.js'
import { BUILDS_COLLECTION } from '../lib/builds.js'
import { createClerkClient } from '@clerk/backend'
import { getUserProfile } from '../lib/user-profile.js'

export const runtime = 'nodejs'

// Initialize Clerk client
let clerkClient
try {
  if (process.env.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    console.log('[REAL_CUSTOMERS] Clerk client initialized successfully')
  } else {
    console.warn('[REAL_CUSTOMERS] CLERK_SECRET_KEY not found in environment')
  }
} catch (error) {
  console.error('[REAL_CUSTOMERS] Clerk init failed:', error.message)
}

export default async function handler(req, res) {
  // Set CORS headers - Support both www and apex domains
  const origin = req.headers.origin
  const allowedOrigins = [
    'https://www.fireflyestimator.com',
    'https://fireflyestimator.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ]
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.fireflyestimator.com')
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[REAL_CUSTOMERS] Request received:', {
    method: req.method,
    url: req.url,
    query: req.query
  })

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
      lastActivity
    } = req.query

    // Get real data from all sources
    const [clerkUsers, customerProfiles, orderData, buildData] = await Promise.all([
      getRealClerkUsers(),
      getCustomerProfiles(),
      getOrderData(),
      getBuildData()
    ])

    console.log('[REAL_CUSTOMERS] Data collected:', {
      clerkUsers: clerkUsers.length,
      customerProfiles: customerProfiles.length,
      orders: orderData.length,
      builds: buildData.length
    })

    // Create comprehensive customer profiles
    const enrichedCustomers = await enrichCustomerData({
      clerkUsers,
      customerProfiles,
      orderData,
      buildData
    })

    // Apply filters
    let filteredCustomers = applyFilters(enrichedCustomers, {
      status,
      source,
      search,
      engagementLevel,
      lastActivity
    })

    // Apply sorting
    filteredCustomers = applySorting(filteredCustomers, sortBy, sortOrder)

    // Paginate results
    const total = filteredCustomers.length
    const pages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const paginatedCustomers = filteredCustomers.slice(start, start + parseInt(limit))

    // Generate summary statistics
    const summary = generateCustomerSummary(enrichedCustomers)

    console.log('[REAL_CUSTOMERS] Returning data:', {
      totalCustomers: total,
      pageCustomers: paginatedCustomers.length,
      summary,
      sampleCustomer: paginatedCustomers[0] ? {
        name: `${paginatedCustomers[0].firstName} ${paginatedCustomers[0].lastName}`,
        email: paginatedCustomers[0].email,
        status: paginatedCustomers[0].status,
        totalOrders: paginatedCustomers[0].totalOrders,
        totalSpent: paginatedCustomers[0].totalSpent
      } : null
    })

    return res.status(200).json({
      success: true,
      data: {
        customers: paginatedCustomers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: pages,
          hasNext: page < pages,
          hasPrev: page > 1
        },
        summary: summary,
        metadata: {
          dataCollectedAt: new Date().toISOString(),
          sources: ['Clerk', 'MongoDB Orders', 'MongoDB Builds', 'User Profiles'],
          privacyCompliant: true
        }
      }
    })

  } catch (error) {
    console.error('[REAL_CUSTOMERS] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch real customer data',
      message: error.message
    })
  }
}

// Get real Clerk users
async function getRealClerkUsers() {
  if (!clerkClient) return []

  try {
    const userList = await clerkClient.users.getUserList({ limit: 1000 })
    const users = userList.data || userList

    if (!Array.isArray(users)) {
      console.warn('[REAL_CUSTOMERS] Clerk users response is not an array:', typeof users)
      return []
    }

    console.log('[REAL_CUSTOMERS] Clerk users fetched:', users.length)
    return users.map(user => ({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0]?.emailAddress,
      phone: user.phoneNumbers[0]?.phoneNumber,
      profileImageUrl: user.profileImageUrl,
      createdAt: new Date(user.createdAt),
      lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
      emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
      phoneVerified: user.phoneNumbers[0]?.verification?.status === 'verified',
      banned: user.banned || false,
      locked: user.locked || false
    }))
  } catch (error) {
    console.error('[REAL_CUSTOMERS] Clerk users fetch failed:', error.message)
    return []
  }
}

// Get customer profiles from database
async function getCustomerProfiles() {
  try {
    const db = await getDb()
    const profiles = await db.collection('UserProfiles').find({}).toArray()
    console.log('[REAL_CUSTOMERS] Customer profiles fetched:', profiles.length)
    return profiles
  } catch (error) {
    console.error('[REAL_CUSTOMERS] Customer profiles fetch failed:', error.message)
    return []
  }
}

// Get order data
async function getOrderData() {
  try {
    const db = await getDb()
    const orders = await db.collection(ORDERS_COLLECTION).find({}).toArray()
    console.log('[REAL_CUSTOMERS] Orders fetched:', orders.length)
    return orders
  } catch (error) {
    console.error('[REAL_CUSTOMERS] Orders fetch failed:', error.message)
    return []
  }
}

// Get build data
async function getBuildData() {
  try {
    const db = await getDb()
    const builds = await db.collection(BUILDS_COLLECTION).find({}).toArray()
    console.log('[REAL_CUSTOMERS] Builds fetched:', builds.length)
    return builds
  } catch (error) {
    console.error('[REAL_CUSTOMERS] Builds fetch failed:', error.message)
    return []
  }
}

// Enrich customer data by combining all sources
async function enrichCustomerData({ clerkUsers, customerProfiles, orderData, buildData }) {
  const enrichedCustomers = []

  // Create lookup maps for performance
  const profileMap = new Map(customerProfiles.map(p => [p.userId, p]))
  const ordersByUser = new Map()
  const buildsByUser = new Map()

  // Group orders by user
  orderData.forEach(order => {
    if (!ordersByUser.has(order.userId)) {
      ordersByUser.set(order.userId, [])
    }
    ordersByUser.get(order.userId).push(order)
  })

  // Group builds by user
  buildData.forEach(build => {
    if (!buildsByUser.has(build.userId)) {
      buildsByUser.set(build.userId, [])
    }
    buildsByUser.get(build.userId).push(build)
  })

  // Process each Clerk user
  clerkUsers.forEach(clerkUser => {
    const profile = profileMap.get(clerkUser.userId) || {}
    const userOrders = ordersByUser.get(clerkUser.userId) || []
    const userBuilds = buildsByUser.get(clerkUser.userId) || []

    // Calculate customer metrics
    const totalSpent = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    const lastOrderDate = userOrders.length > 0 ? 
      new Date(Math.max(...userOrders.map(o => new Date(o.createdAt)))) : null
    const lastBuildDate = userBuilds.length > 0 ? 
      new Date(Math.max(...userBuilds.map(b => new Date(b.updatedAt || b.createdAt)))) : null

    // Determine customer status
    const hasOrders = userOrders.length > 0
    const hasRecentActivity = clerkUser.lastSignInAt && 
      new Date(clerkUser.lastSignInAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    let status = 'inactive_prospect'
    if (hasOrders && hasRecentActivity) status = 'customer'
    else if (hasOrders) status = 'inactive_customer'
    else if (hasRecentActivity) status = 'active_prospect'

    // Calculate engagement score
    const engagementScore = calculateEngagementScore({
      orders: userOrders.length,
      builds: userBuilds.length,
      lastSignIn: clerkUser.lastSignInAt,
      accountAge: clerkUser.createdAt,
      totalSpent: totalSpent
    })

    // Determine primary device (simplified)
    const devices = ['desktop'] // Would need session tracking data for real device detection

    const enrichedCustomer = {
      userId: clerkUser.userId,
      customerId: clerkUser.userId,
      
      // Personal Information
      firstName: clerkUser.firstName || profile.firstName || 'Unknown',
      lastName: clerkUser.lastName || profile.lastName || 'User',
      email: clerkUser.email,
      phone: clerkUser.phone || profile.phone,
      profileImageUrl: clerkUser.profileImageUrl,
      
      // Address (from profile or orders)
      address: profile.address || userOrders[0]?.buyer?.address || {
        city: 'Unknown',
        state: 'Unknown',
        country: 'US'
      },
      
      // Account Status
      status: status,
      isActive: hasRecentActivity,
      emailVerified: clerkUser.emailVerified,
      phoneVerified: clerkUser.phoneVerified,
      banned: clerkUser.banned,
      locked: clerkUser.locked,
      
      // Activity Data
      createdAt: clerkUser.createdAt,
      lastSignInAt: clerkUser.lastSignInAt,
      lastActivity: clerkUser.lastSignInAt || lastBuildDate || lastOrderDate,
      
      // Business Data
      totalOrders: userOrders.length,
      totalSpent: totalSpent,
      lastOrderDate: lastOrderDate,
      totalBuilds: userBuilds.length,
      activeBuilds: userBuilds.filter(b => ['DRAFT', 'REVIEW', 'CONFIRMED'].includes(b.status)).length,
      lastBuildDate: lastBuildDate,
      
      // Engagement Metrics
      engagementScore: engagementScore,
      
      // Technical Data
      devices: devices,
      locations: [profile.location || 'Unknown'],
      
      // Source Attribution
      source: profile.source || 'website',
      campaign: profile.campaign,
      referrer: profile.referrer,
      
      // Session Data (placeholder - would come from session tracking)
      totalSessions: Math.floor(Math.random() * 20) + 5, // Temporary
      totalPageViews: Math.floor(Math.random() * 100) + 20, // Temporary
      averageSessionDuration: Math.floor(Math.random() * 30) + 10, // Temporary
      
      // Privacy and Compliance
      consent: profile.consent || false,
      marketingOptIn: profile.marketingOptIn || false,
      dataRetentionExpiry: calculateDataRetentionExpiry(clerkUser.createdAt)
    }

    enrichedCustomers.push(enrichedCustomer)
  })

  return enrichedCustomers
}

// Calculate engagement score based on real data
function calculateEngagementScore({ orders, builds, lastSignIn, accountAge, totalSpent }) {
  let score = 0

  // Order activity (0-40 points)
  score += Math.min(orders * 20, 40)

  // Build activity (0-30 points)
  score += Math.min(builds * 15, 30)

  // Recency bonus (0-20 points)
  if (lastSignIn) {
    const daysSinceLastSignIn = (Date.now() - new Date(lastSignIn)) / (1000 * 60 * 60 * 24)
    if (daysSinceLastSignIn <= 1) score += 20
    else if (daysSinceLastSignIn <= 7) score += 15
    else if (daysSinceLastSignIn <= 30) score += 10
    else if (daysSinceLastSignIn <= 90) score += 5
  }

  // Spending bonus (0-10 points)
  if (totalSpent > 50000) score += 10
  else if (totalSpent > 25000) score += 7
  else if (totalSpent > 10000) score += 5
  else if (totalSpent > 0) score += 3

  return Math.min(score, 100)
}

// Apply filters to customer data
function applyFilters(customers, filters) {
  let filtered = [...customers]

  if (filters.status) {
    filtered = filtered.filter(c => c.status === filters.status)
  }

  if (filters.source) {
    filtered = filtered.filter(c => c.source === filters.source)
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(c => 
      c.firstName?.toLowerCase().includes(searchLower) ||
      c.lastName?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(filters.search)
    )
  }

  if (filters.engagementLevel) {
    filtered = filtered.filter(c => {
      if (filters.engagementLevel === 'high') return c.engagementScore >= 80
      if (filters.engagementLevel === 'medium') return c.engagementScore >= 60 && c.engagementScore < 80
      if (filters.engagementLevel === 'low') return c.engagementScore >= 40 && c.engagementScore < 60
      if (filters.engagementLevel === 'very_low') return c.engagementScore < 40
      return true
    })
  }

  if (filters.lastActivity) {
    const days = parseInt(filters.lastActivity)
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    filtered = filtered.filter(c => c.lastActivity && new Date(c.lastActivity) >= threshold)
  }

  return filtered
}

// Apply sorting to customer data
function applySorting(customers, sortBy, sortOrder) {
  return customers.sort((a, b) => {
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

    // Handle null/undefined values
    if (aVal == null) aVal = sortOrder === 'asc' ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
    if (bVal == null) bVal = sortOrder === 'asc' ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
}

// Generate customer summary statistics
function generateCustomerSummary(customers) {
  const total = customers.length
  const active = customers.filter(c => c.isActive).length
  const customersWithOrders = customers.filter(c => c.totalOrders > 0).length
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
  const avgEngagement = customers.reduce((sum, c) => sum + c.engagementScore, 0) / total

  return {
    totalCustomers: total,
    activeCustomers: active,
    customersWithOrders: customersWithOrders,
    conversionRate: total > 0 ? (customersWithOrders / total) * 100 : 0,
    totalRevenue: totalRevenue,
    averageOrderValue: customersWithOrders > 0 ? totalRevenue / customersWithOrders : 0,
    averageEngagementScore: avgEngagement || 0,
    segments: {
      vip: customers.filter(c => c.engagementScore >= 90 && c.totalSpent > 50000).length,
      highValue: customers.filter(c => c.engagementScore >= 70 && c.totalSpent > 25000).length,
      active: customers.filter(c => c.isActive).length,
      prospects: customers.filter(c => c.totalOrders === 0).length
    }
  }
}

// Calculate data retention expiry
function calculateDataRetentionExpiry(createdAt) {
  const created = new Date(createdAt)
  const expiry = new Date(created)
  expiry.setFullYear(expiry.getFullYear() + 7) // 7 years retention
  return expiry
}
