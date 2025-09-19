// Direct admin dashboard endpoint to bypass router issues
// This bypasses all the complex Express router mounting and middleware

export const runtime = 'nodejs'

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://www.fireflyestimator.com')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[DIRECT_DASHBOARD] Request received:', {
    method: req.method,
    url: req.url,
    query: req.query,
    adminAuthDisabled: process.env.ADMIN_AUTH_DISABLED === 'true'
  })

  try {
    // Return safe fallback data immediately
    const response = {
      success: true,
      data: {
        metrics: {
          totalUsers: 0,
          activeBuilds: 0,
          totalOrders: 0,
          totalRevenue: 0,
          revenueChange: 0,
          newUsers: 0
        },
        growth: {
          userGrowth: 0,
          revenueGrowth: 0
        },
        trends: {
          dailyRevenue: [],
          orderStatus: []
        },
        recentActivity: {
          orders: [],
          builds: []
        },
        topModels: [],
        timeRange: req.query.range || '30d',
        databaseAvailable: false,
        message: 'DIRECT ENDPOINT - Bypassing Express router issues'
      }
    }

    console.log('[DIRECT_DASHBOARD] Returning response successfully')
    return res.status(200).json(response)

  } catch (error) {
    console.error('[DIRECT_DASHBOARD] Error:', error)
    return res.status(500).json({ 
      error: 'Direct dashboard endpoint failed',
      message: error.message 
    })
  }
}
