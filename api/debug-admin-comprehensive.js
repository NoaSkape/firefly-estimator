// COMPREHENSIVE ADMIN DEBUG SYSTEM
// This endpoint provides detailed diagnostics for the admin router issues
// Call this to get complete visibility into what's failing

export const runtime = 'nodejs'

export default async function handler(req, res) {
  const startTime = Date.now()
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const debugData = {
    timestamp: new Date().toISOString(),
    requestId: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    environment: {},
    imports: {},
    routers: {},
    middleware: {},
    errors: [],
    performance: {
      startTime,
      phases: {}
    }
  }

  try {
    // PHASE 1: Environment Variables
    console.log('[DEBUG_COMPREHENSIVE] Phase 1: Environment Variables')
    const envStart = Date.now()
    
    debugData.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        ADMIN_AUTH_DISABLED: process.env.ADMIN_AUTH_DISABLED,
        DEBUG_ADMIN: process.env.DEBUG_ADMIN,
        hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
        clerkKeyPrefix: process.env.CLERK_SECRET_KEY ? process.env.CLERK_SECRET_KEY.substring(0, 8) + '...' : 'missing',
        hasMongoUri: !!process.env.MONGODB_URI,
        mongoUriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'missing',
        hasMongoDb: !!process.env.MONGODB_DB,
        mongoDb: process.env.MONGODB_DB || 'missing'
      }
    }
    debugData.performance.phases.environment = Date.now() - envStart

    // PHASE 2: Module Import Testing
    console.log('[DEBUG_COMPREHENSIVE] Phase 2: Module Import Testing')
    const importStart = Date.now()
    
    try {
      const express = await import('express')
      debugData.imports.express = { success: true, type: typeof express.default }
    } catch (e) {
      debugData.imports.express = { success: false, error: e.message }
      debugData.errors.push({ phase: 'import', module: 'express', error: e.message })
    }

    try {
      const adminAuth = await import('../../lib/adminAuth.js')
      debugData.imports.adminAuth = { 
        success: true, 
        type: typeof adminAuth.adminAuth,
        hasValidateAdminAccess: typeof adminAuth.adminAuth?.validateAdminAccess === 'function'
      }
    } catch (e) {
      debugData.imports.adminAuth = { success: false, error: e.message }
      debugData.errors.push({ phase: 'import', module: 'adminAuth', error: e.message })
    }

    try {
      const db = await import('../../lib/db.js')
      debugData.imports.db = { success: true, type: typeof db.getDb }
    } catch (e) {
      debugData.imports.db = { success: false, error: e.message }
      debugData.errors.push({ phase: 'import', module: 'db', error: e.message })
    }

    debugData.performance.phases.imports = Date.now() - importStart

    // PHASE 3: Admin Router Import Testing
    console.log('[DEBUG_COMPREHENSIVE] Phase 3: Admin Router Import Testing')
    const routerStart = Date.now()

    const adminRouters = [
      'analytics', 'dashboard', 'reports', 'orders', 'financial', 
      'content', 'users', 'notifications', 'ai-insights', 'integrations',
      'security', 'workflows', 'monitoring', 'export', 'settings'
    ]

    for (const routerName of adminRouters) {
      try {
        const routerModule = await import(`../../api/admin/${routerName}.js`)
        const router = routerModule.default
        debugData.routers[routerName] = {
          success: true,
          type: typeof router,
          isFunction: typeof router === 'function',
          hasStack: router && Array.isArray(router.stack),
          stackLength: router?.stack?.length || 0
        }
      } catch (e) {
        debugData.routers[routerName] = {
          success: false,
          error: e.message,
          stack: e.stack
        }
        debugData.errors.push({ phase: 'router_import', router: routerName, error: e.message })
      }
    }

    debugData.performance.phases.routers = Date.now() - routerStart

    // PHASE 4: Express Router Stack Analysis
    console.log('[DEBUG_COMPREHENSIVE] Phase 4: Express Router Stack Analysis')
    const stackStart = Date.now()

    try {
      const express = (await import('express')).default
      const testRouter = express.Router()
      
      // Test basic router functionality
      testRouter.get('/test', (req, res) => res.json({ test: 'ok' }))
      
      debugData.middleware.basicRouter = {
        success: true,
        stackLength: testRouter.stack?.length || 0,
        stackTypes: testRouter.stack?.map(layer => ({
          name: layer.name,
          hasHandle: typeof layer.handle === 'function',
          route: layer.route?.path
        })) || []
      }

      // Test router mounting
      const parentRouter = express.Router()
      try {
        parentRouter.use('/test', testRouter)
        debugData.middleware.routerMounting = { success: true }
      } catch (e) {
        debugData.middleware.routerMounting = { success: false, error: e.message }
        debugData.errors.push({ phase: 'router_mounting', error: e.message })
      }

    } catch (e) {
      debugData.middleware.expressRouter = { success: false, error: e.message }
      debugData.errors.push({ phase: 'express_router', error: e.message })
    }

    debugData.performance.phases.middleware = Date.now() - stackStart

    // PHASE 5: Database Connection Testing
    console.log('[DEBUG_COMPREHENSIVE] Phase 5: Database Connection Testing')
    const dbStart = Date.now()

    try {
      const { getDb } = await import('../../lib/db.js')
      const db = await getDb()
      debugData.database = {
        connectionSuccess: true,
        dbName: db.databaseName,
        collections: await db.listCollections().toArray()
      }
    } catch (e) {
      debugData.database = {
        connectionSuccess: false,
        error: e.message,
        stack: e.stack
      }
      debugData.errors.push({ phase: 'database', error: e.message })
    }

    debugData.performance.phases.database = Date.now() - dbStart

    // PHASE 6: Clerk Client Testing
    console.log('[DEBUG_COMPREHENSIVE] Phase 6: Clerk Client Testing')
    const clerkStart = Date.now()

    try {
      const { createClerkClient } = await import('@clerk/backend')
      const clerkClient = createClerkClient({ 
        secretKey: process.env.CLERK_SECRET_KEY 
      })
      
      // Test a simple Clerk operation
      const testUser = await clerkClient.users.getUserList({ limit: 1 })
      
      debugData.clerk = {
        clientCreation: true,
        apiTest: true,
        userCount: testUser.totalCount || 0
      }
    } catch (e) {
      debugData.clerk = {
        clientCreation: false,
        error: e.message,
        stack: e.stack
      }
      debugData.errors.push({ phase: 'clerk', error: e.message })
    }

    debugData.performance.phases.clerk = Date.now() - clerkStart

    // PHASE 7: Simulated Dashboard Request
    console.log('[DEBUG_COMPREHENSIVE] Phase 7: Simulated Dashboard Request')
    const dashboardStart = Date.now()

    try {
      // Simulate the exact operations the dashboard does
      const range = req.query.range || '30d'
      
      // Test date calculations
      const now = new Date()
      const startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      
      debugData.dashboard = {
        rangeCalculation: true,
        range,
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }

      // Test database operations if DB is available
      if (debugData.database.connectionSuccess) {
        const { getDb } = await import('../../lib/db.js')
        const db = await getDb()
        
        const ordersCollection = db.collection('Orders')
        const orderCount = await ordersCollection.countDocuments()
        
        debugData.dashboard.databaseOperations = {
          success: true,
          orderCount
        }
      }

    } catch (e) {
      debugData.dashboard = {
        success: false,
        error: e.message,
        stack: e.stack
      }
      debugData.errors.push({ phase: 'dashboard_simulation', error: e.message })
    }

    debugData.performance.phases.dashboard = Date.now() - dashboardStart

    // PHASE 8: Performance Summary
    debugData.performance.totalTime = Date.now() - startTime
    debugData.performance.summary = {
      slowestPhase: Object.entries(debugData.performance.phases)
        .sort(([,a], [,b]) => b - a)[0],
      totalErrors: debugData.errors.length,
      criticalErrors: debugData.errors.filter(e => 
        e.phase === 'import' || e.phase === 'router_import'
      ).length
    }

    // FINAL RESPONSE
    console.log('[DEBUG_COMPREHENSIVE] Analysis complete:', {
      totalErrors: debugData.errors.length,
      totalTime: debugData.performance.totalTime,
      criticalErrors: debugData.performance.summary.criticalErrors
    })

    return res.status(200).json({
      success: true,
      message: 'Comprehensive admin debugging complete',
      data: debugData,
      recommendations: generateRecommendations(debugData)
    })

  } catch (error) {
    console.error('[DEBUG_COMPREHENSIVE] Fatal error:', error)
    return res.status(500).json({
      success: false,
      error: 'Debug system failed',
      message: error.message,
      stack: error.stack,
      partialData: debugData
    })
  }
}

function generateRecommendations(debugData) {
  const recommendations = []

  if (debugData.errors.length === 0) {
    recommendations.push('✅ No errors detected - issue may be in request timing or concurrency')
  }

  if (debugData.performance.totalTime > 5000) {
    recommendations.push('⚠️ Function execution time > 5s - consider optimizing imports')
  }

  if (debugData.errors.some(e => e.phase === 'import')) {
    recommendations.push('🚨 Import errors detected - check module resolution and dependencies')
  }

  if (debugData.errors.some(e => e.phase === 'router_import')) {
    recommendations.push('🚨 Router import errors - check admin router files for syntax/export issues')
  }

  if (!debugData.database?.connectionSuccess) {
    recommendations.push('⚠️ Database connection failed - check MongoDB configuration')
  }

  if (!debugData.clerk?.clientCreation) {
    recommendations.push('⚠️ Clerk client failed - check CLERK_SECRET_KEY configuration')
  }

  const failedRouters = Object.entries(debugData.routers || {})
    .filter(([name, status]) => !status.success)
    .map(([name]) => name)

  if (failedRouters.length > 0) {
    recommendations.push(`🚨 Failed router imports: ${failedRouters.join(', ')}`)
  }

  return recommendations
}
