// MASTER DEBUG DASHBOARD
// This is the ultimate debugging endpoint that provides complete system visibility
// Use this to get definitive answers about what's causing the admin router issues

export const runtime = 'nodejs'

export default async function handler(req, res) {
  const debugId = `master-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()
  
  console.log(`[MASTER_DEBUG] ${debugId} - Starting comprehensive system analysis`)

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const masterReport = {
    debugId,
    timestamp: new Date().toISOString(),
    phases: {},
    errors: [],
    warnings: [],
    recommendations: [],
    performance: { startTime }
  }

  try {
    // PHASE 1: SYSTEM ENVIRONMENT ANALYSIS
    console.log(`[MASTER_DEBUG] ${debugId} - Phase 1: System Environment`)
    const phase1Start = Date.now()
    
    masterReport.phases.environment = {
      vercel: {
        isVercel: !!process.env.VERCEL,
        environment: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
        functionName: process.env.VERCEL_FUNCTION_NAME,
        functionMemory: process.env.VERCEL_FUNCTION_MEMORY,
        functionTimeout: process.env.VERCEL_FUNCTION_TIMEOUT
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      memory: process.memoryUsage(),
      env: {
        adminAuthDisabled: process.env.ADMIN_AUTH_DISABLED === 'true',
        debugAdmin: process.env.DEBUG_ADMIN === 'true',
        clerkConfigured: !!process.env.CLERK_SECRET_KEY,
        mongoConfigured: !!process.env.MONGODB_URI && !!process.env.MONGODB_DB
      }
    }
    
    masterReport.performance.environment = Date.now() - phase1Start

    // PHASE 2: MODULE DEPENDENCY ANALYSIS
    console.log(`[MASTER_DEBUG] ${debugId} - Phase 2: Module Dependencies`)
    const phase2Start = Date.now()
    
    const criticalModules = [
      { name: 'express', path: 'express' },
      { name: 'clerk-backend', path: '@clerk/backend' },
      { name: 'mongodb', path: 'mongodb' },
      { name: 'adminAuth', path: '../../lib/adminAuth.js' },
      { name: 'db', path: '../../lib/db.js' },
      { name: 'adminSchema', path: '../../lib/adminSchema.js' }
    ]

    masterReport.phases.modules = {}
    
    for (const module of criticalModules) {
      try {
        console.log(`[MASTER_DEBUG] ${debugId} - Testing import: ${module.name}`)
        const imported = await import(module.path)
        masterReport.phases.modules[module.name] = {
          success: true,
          hasDefault: !!imported.default,
          defaultType: typeof imported.default,
          namedExports: Object.keys(imported).filter(k => k !== 'default'),
          size: JSON.stringify(imported).length
        }
      } catch (error) {
        masterReport.phases.modules[module.name] = {
          success: false,
          error: error.message,
          stack: error.stack
        }
        masterReport.errors.push({
          phase: 'module_import',
          module: module.name,
          error: error.message
        })
      }
    }
    
    masterReport.performance.modules = Date.now() - phase2Start

    // PHASE 3: ADMIN ROUTER DETAILED ANALYSIS
    console.log(`[MASTER_DEBUG] ${debugId} - Phase 3: Admin Router Analysis`)
    const phase3Start = Date.now()
    
    const adminRouterFiles = [
      'analytics', 'dashboard', 'reports', 'orders', 'financial', 
      'content', 'users', 'notifications', 'ai-insights', 'integrations',
      'security', 'workflows', 'monitoring', 'export', 'settings'
    ]

    masterReport.phases.adminRouters = {}
    
    for (const routerFile of adminRouterFiles) {
      try {
        console.log(`[MASTER_DEBUG] ${debugId} - Analyzing ${routerFile} router`)
        const routerModule = await import(`../admin/${routerFile}.js`)
        const router = routerModule.default
        
        const analysis = {
          import: { success: true },
          router: {
            exists: !!router,
            type: typeof router,
            isFunction: typeof router === 'function',
            hasStack: router && Array.isArray(router.stack),
            stackLength: router?.stack?.length || 0
          },
          routes: [],
          middleware: [],
          issues: []
        }

        if (router && router.stack) {
          router.stack.forEach((layer, idx) => {
            const layerInfo = {
              index: idx,
              name: layer.name || '<anonymous>',
              hasHandle: typeof layer.handle === 'function',
              handleType: typeof layer.handle,
              route: layer.route?.path,
              methods: layer.route?.methods ? Object.keys(layer.route.methods) : [],
              regexp: layer.regexp?.toString()
            }
            
            if (layer.route) {
              analysis.routes.push(layerInfo)
            } else {
              analysis.middleware.push(layerInfo)
            }
            
            // Check for issues
            if (typeof layer.handle !== 'function') {
              analysis.issues.push({
                type: 'invalid_handle',
                layer: idx,
                handleType: typeof layer.handle
              })
            }
            
            if (layer.route && layer.route.stack) {
              layer.route.stack.forEach((routeLayer, routeIdx) => {
                if (typeof routeLayer.handle !== 'function') {
                  analysis.issues.push({
                    type: 'invalid_route_handle',
                    layer: idx,
                    routeLayer: routeIdx,
                    handleType: typeof routeLayer.handle
                  })
                }
              })
            }
          })
        }

        masterReport.phases.adminRouters[routerFile] = analysis
        
        if (analysis.issues.length > 0) {
          masterReport.warnings.push(`${routerFile} router has ${analysis.issues.length} issues`)
        }
        
      } catch (error) {
        masterReport.phases.adminRouters[routerFile] = {
          import: { success: false, error: error.message },
          router: { exists: false }
        }
        masterReport.errors.push({
          phase: 'admin_router_analysis',
          router: routerFile,
          error: error.message
        })
      }
    }
    
    masterReport.performance.adminRouters = Date.now() - phase3Start

    // PHASE 4: EXPRESS APP SIMULATION
    console.log(`[MASTER_DEBUG] ${debugId} - Phase 4: Express App Simulation`)
    const phase4Start = Date.now()
    
    try {
      const express = (await import('express')).default
      const testApp = express()
      
      // Try to import and mount the main admin router
      const adminModule = await import('./admin/index.js')
      const adminRouter = adminModule.default
      
      masterReport.phases.expressSimulation = {
        appCreation: { success: true },
        adminRouterImport: { 
          success: true,
          type: typeof adminRouter,
          isFunction: typeof adminRouter === 'function'
        },
        mounting: { attempts: [] }
      }
      
      // Test mounting the admin router
      try {
        testApp.use('/admin', adminRouter)
        masterReport.phases.expressSimulation.mounting.attempts.push({
          path: '/admin',
          success: true
        })
      } catch (mountError) {
        masterReport.phases.expressSimulation.mounting.attempts.push({
          path: '/admin',
          success: false,
          error: mountError.message
        })
        masterReport.errors.push({
          phase: 'express_mounting',
          error: mountError.message
        })
      }
      
    } catch (error) {
      masterReport.phases.expressSimulation = {
        success: false,
        error: error.message,
        stack: error.stack
      }
      masterReport.errors.push({
        phase: 'express_simulation',
        error: error.message
      })
    }
    
    masterReport.performance.expressSimulation = Date.now() - phase4Start

    // PHASE 5: GENERATE COMPREHENSIVE ANALYSIS
    console.log(`[MASTER_DEBUG] ${debugId} - Phase 5: Generating Analysis`)
    
    const totalErrors = masterReport.errors.length
    const totalWarnings = masterReport.warnings.length
    const totalTime = Date.now() - startTime
    
    // Analyze patterns
    const importErrors = masterReport.errors.filter(e => e.phase.includes('import'))
    const routerErrors = masterReport.errors.filter(e => e.phase.includes('router'))
    const mountingErrors = masterReport.errors.filter(e => e.phase.includes('mount'))
    
    // Generate specific recommendations
    if (importErrors.length > 0) {
      masterReport.recommendations.push('🚨 CRITICAL: Module import failures detected - check file syntax and dependencies')
    }
    
    if (routerErrors.length > 0) {
      masterReport.recommendations.push('🚨 CRITICAL: Router configuration issues detected - check router exports and middleware')
    }
    
    if (mountingErrors.length > 0) {
      masterReport.recommendations.push('🚨 CRITICAL: Router mounting failures detected - check Express app configuration')
    }
    
    if (totalErrors === 0) {
      masterReport.recommendations.push('✅ No critical errors detected - issue may be timing/concurrency related')
      masterReport.recommendations.push('🔍 Consider: Race conditions, serverless cold starts, or memory pressure')
    }
    
    // Performance analysis
    if (totalTime > 10000) {
      masterReport.recommendations.push('⚠️ Slow execution detected - possible timeout or resource contention')
    }
    
    const memoryUsed = masterReport.phases.environment.memory.heapUsed / 1024 / 1024
    if (memoryUsed > 100) {
      masterReport.recommendations.push(`⚠️ High memory usage: ${memoryUsed.toFixed(1)}MB - possible memory leak`)
    }

    masterReport.performance.total = totalTime
    masterReport.summary = {
      overallHealth: totalErrors === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
      errorCount: totalErrors,
      warningCount: totalWarnings,
      executionTime: totalTime,
      memoryUsage: `${memoryUsed.toFixed(1)}MB`,
      primarySuspects: generatePrimarySuspects(masterReport)
    }

    console.log(`[MASTER_DEBUG] ${debugId} - Analysis complete:`, masterReport.summary)

    return res.status(200).json({
      success: true,
      debugId,
      message: 'Master debug analysis complete',
      summary: masterReport.summary,
      report: masterReport,
      timestamp: new Date().toISOString()
    })

  } catch (fatalError) {
    console.error(`[MASTER_DEBUG] ${debugId} - Fatal error:`, fatalError)
    
    return res.status(500).json({
      success: false,
      debugId,
      error: 'Master debug system failed',
      message: fatalError.message,
      stack: fatalError.stack,
      partialReport: masterReport,
      timestamp: new Date().toISOString()
    })
  }
}

function generatePrimarySuspects(report) {
  const suspects = []
  
  // Check for import failures
  const failedImports = Object.entries(report.phases.modules || {})
    .filter(([name, status]) => !status.success)
    .map(([name]) => name)
  
  if (failedImports.length > 0) {
    suspects.push(`Module import failures: ${failedImports.join(', ')}`)
  }
  
  // Check for router issues
  const routerIssues = Object.entries(report.phases.adminRouters || {})
    .filter(([name, analysis]) => analysis.issues?.length > 0)
    .map(([name, analysis]) => `${name}(${analysis.issues.length} issues)`)
  
  if (routerIssues.length > 0) {
    suspects.push(`Router integrity issues: ${routerIssues.join(', ')}`)
  }
  
  // Check for mounting failures
  if (report.phases.expressSimulation?.mounting?.attempts?.some(a => !a.success)) {
    suspects.push('Express router mounting failures')
  }
  
  // Performance suspects
  if (report.performance.total > 10000) {
    suspects.push('Performance/timeout issues')
  }
  
  const slowPhases = Object.entries(report.performance)
    .filter(([name, time]) => typeof time === 'number' && time > 2000)
    .map(([name]) => name)
  
  if (slowPhases.length > 0) {
    suspects.push(`Slow phases: ${slowPhases.join(', ')}`)
  }
  
  return suspects.length > 0 ? suspects : ['No obvious suspects - likely concurrency or timing issue']
}
