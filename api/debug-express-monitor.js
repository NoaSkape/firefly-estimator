// REAL-TIME EXPRESS ROUTER MONITOR
// This creates a detailed trace of Express router execution to catch undefined.apply errors

export const runtime = 'nodejs'

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const logs = []
  const errors = []
  const startTime = Date.now()

  function log(message, data = {}) {
    const entry = {
      timestamp: Date.now() - startTime,
      message,
      data,
      stack: new Error().stack.split('\n').slice(2, 5) // Get caller info
    }
    logs.push(entry)
    console.log(`[EXPRESS_MONITOR] ${message}`, data)
  }

  function captureError(error, phase) {
    const errorEntry = {
      phase,
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: Date.now() - startTime
    }
    errors.push(errorEntry)
    console.error(`[EXPRESS_MONITOR] ERROR in ${phase}:`, error)
  }

  try {
    log('Starting Express router monitoring')

    // STEP 1: Import Express and create test router
    log('Importing Express')
    const express = (await import('express')).default
    log('Express imported successfully', { type: typeof express })

    log('Creating test router')
    const testRouter = express.Router()
    log('Test router created', { 
      type: typeof testRouter,
      hasStack: Array.isArray(testRouter.stack),
      stackLength: testRouter.stack?.length || 0
    })

    // STEP 2: Test basic route registration
    log('Testing basic route registration')
    testRouter.get('/test-route', (req, res) => {
      res.json({ success: true, message: 'Test route works' })
    })
    log('Basic route registered', { stackLength: testRouter.stack?.length })

    // STEP 3: Test middleware registration
    log('Testing middleware registration')
    testRouter.use((req, res, next) => {
      log('Test middleware executed')
      next()
    })
    log('Middleware registered', { stackLength: testRouter.stack?.length })

    // STEP 4: Import and test admin router components
    log('Testing admin router imports')
    
    const adminRouterTests = {}
    const adminRouterNames = [
      'analytics', 'dashboard', 'reports', 'orders', 'financial', 
      'content', 'users', 'notifications', 'ai-insights', 'integrations',
      'security', 'workflows', 'monitoring', 'export', 'settings'
    ]

    for (const routerName of adminRouterNames) {
      try {
        log(`Importing ${routerName} router`)
        const routerModule = await import(`../admin/${routerName}.js`)
        const router = routerModule.default
        
        adminRouterTests[routerName] = {
          importSuccess: true,
          type: typeof router,
          isFunction: typeof router === 'function',
          hasStack: router && Array.isArray(router.stack),
          stackLength: router?.stack?.length || 0,
          stackDetails: router?.stack?.map((layer, idx) => ({
            index: idx,
            name: layer.name || '<anonymous>',
            hasHandle: typeof layer.handle === 'function',
            handleType: typeof layer.handle,
            route: layer.route?.path,
            regexp: layer.regexp?.toString()
          })) || []
        }
        
        log(`${routerName} router imported successfully`, adminRouterTests[routerName])
        
        // Test mounting the router
        try {
          const parentRouter = express.Router()
          parentRouter.use(`/${routerName}`, router)
          adminRouterTests[routerName].mountTest = { success: true }
          log(`${routerName} router mounted successfully`)
        } catch (mountError) {
          adminRouterTests[routerName].mountTest = { 
            success: false, 
            error: mountError.message 
          }
          captureError(mountError, `mount_${routerName}`)
        }
        
      } catch (importError) {
        adminRouterTests[routerName] = {
          importSuccess: false,
          error: importError.message,
          stack: importError.stack
        }
        captureError(importError, `import_${routerName}`)
      }
    }

    debugData.routers = adminRouterTests
    debugData.performance.phases.routerTesting = Date.now() - routerStart

    // STEP 5: Test main admin router import
    log('Testing main admin router import')
    const mainAdminStart = Date.now()
    
    try {
      const adminIndexModule = await import('../admin/index.js')
      const mainAdminRouter = adminIndexModule.default
      
      debugData.mainAdminRouter = {
        importSuccess: true,
        type: typeof mainAdminRouter,
        isFunction: typeof mainAdminRouter === 'function',
        hasStack: mainAdminRouter && Array.isArray(mainAdminRouter.stack),
        stackLength: mainAdminRouter?.stack?.length || 0
      }
      
      log('Main admin router imported successfully', debugData.mainAdminRouter)
      
      // Test creating an Express app and mounting the admin router
      try {
        const testApp = express()
        testApp.use('/admin', mainAdminRouter)
        
        debugData.mainAdminRouter.appMountTest = { success: true }
        log('Main admin router mounted to test app successfully')
        
      } catch (appMountError) {
        debugData.mainAdminRouter.appMountTest = { 
          success: false, 
          error: appMountError.message 
        }
        captureError(appMountError, 'main_admin_mount')
      }
      
    } catch (mainImportError) {
      debugData.mainAdminRouter = {
        importSuccess: false,
        error: mainImportError.message,
        stack: mainImportError.stack
      }
      captureError(mainImportError, 'main_admin_import')
    }

    debugData.performance.phases.mainAdmin = Date.now() - mainAdminStart

    // STEP 6: Memory and Performance Analysis
    log('Performing memory and performance analysis')
    const memoryAfter = process.memoryUsage()
    
    debugData.performance.memory = {
      before: debugData.environment.memoryUsage,
      after: memoryAfter,
      delta: {
        rss: memoryAfter.rss - debugData.environment.memoryUsage.rss,
        heapUsed: memoryAfter.heapUsed - debugData.environment.memoryUsage.heapUsed,
        heapTotal: memoryAfter.heapTotal - debugData.environment.memoryUsage.heapTotal,
        external: memoryAfter.external - debugData.environment.memoryUsage.external
      }
    }

    debugData.performance.totalTime = Date.now() - startTime

    // FINAL ANALYSIS
    const analysis = {
      overallHealth: errors.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
      criticalIssues: errors.filter(e => 
        e.phase.includes('import') || e.phase.includes('mount')
      ),
      performanceIssues: debugData.performance.totalTime > 10000,
      memoryIssues: debugData.performance.memory.delta.heapUsed > 50 * 1024 * 1024, // 50MB
      suspectedCauses: []
    }

    if (analysis.criticalIssues.length > 0) {
      analysis.suspectedCauses.push('Module import/export issues')
    }
    
    if (analysis.performanceIssues) {
      analysis.suspectedCauses.push('Performance/timeout issues')
    }
    
    if (analysis.memoryIssues) {
      analysis.suspectedCauses.push('Memory consumption issues')
    }

    if (Object.values(debugData.routers).some(r => !r.success)) {
      analysis.suspectedCauses.push('Router import failures')
    }

    log('Analysis complete', analysis)

    return res.status(200).json({
      success: true,
      message: 'Express router monitoring complete',
      analysis,
      debugData,
      logs,
      errors,
      executionTime: Date.now() - startTime
    })

  } catch (fatalError) {
    captureError(fatalError, 'fatal')
    
    return res.status(500).json({
      success: false,
      error: 'Express monitor failed',
      message: fatalError.message,
      stack: fatalError.stack,
      logs,
      errors,
      partialData: debugData
    })
  }
}
