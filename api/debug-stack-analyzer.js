// STACK TRACE ANALYZER
// This endpoint analyzes Express router stacks and catches corruption in real-time

export const runtime = 'nodejs'

export default async function handler(req, res) {
  const analyzeId = `analyze-${Date.now()}`
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  console.log(`[STACK_ANALYZER] ${analyzeId} - Starting router stack analysis`)

  const analysis = {
    analyzeId,
    timestamp: new Date().toISOString(),
    target: req.query.target || 'admin',
    stackAnalysis: {},
    corruptionDetected: false,
    issues: [],
    recommendations: []
  }

  try {
    // STEP 1: Import and analyze main API app
    console.log(`[STACK_ANALYZER] ${analyzeId} - Importing main API`)
    const apiModule = await import('./index.js')
    const app = apiModule.default
    
    if (typeof app !== 'function') {
      analysis.issues.push({
        severity: 'critical',
        issue: 'Main API app is not a function',
        type: typeof app
      })
      analysis.corruptionDetected = true
    }

    // STEP 2: Analyze main app router stack
    console.log(`[STACK_ANALYZER] ${analyzeId} - Analyzing main app router`)
    
    if (app._router && app._router.stack) {
      analysis.stackAnalysis.mainApp = analyzeRouterStack(app._router, 'mainApp')
      
      // Look for admin router in the stack
      const adminLayers = app._router.stack.filter(layer => 
        layer.regexp && layer.regexp.toString().includes('admin')
      )
      
      analysis.stackAnalysis.adminLayers = adminLayers.map((layer, idx) => ({
        index: idx,
        name: layer.name || '<anonymous>',
        regexp: layer.regexp?.toString(),
        hasHandle: typeof layer.handle === 'function',
        handleType: typeof layer.handle,
        isRouter: layer.handle && typeof layer.handle.stack !== 'undefined'
      }))
    }

    // STEP 3: Import and analyze admin router directly
    console.log(`[STACK_ANALYZER] ${analyzeId} - Analyzing admin router directly`)
    
    try {
      const adminModule = await import('./admin/index.js')
      const adminRouter = adminModule.default
      
      if (typeof adminRouter === 'function' && adminRouter.stack) {
        analysis.stackAnalysis.adminRouter = analyzeRouterStack(adminRouter, 'adminRouter')
        
        // Look specifically for dashboard routes
        const dashboardLayers = adminRouter.stack.filter(layer =>
          layer.route?.path === '/dashboard' || 
          layer.regexp?.toString().includes('dashboard')
        )
        
        analysis.stackAnalysis.dashboardLayers = dashboardLayers.map((layer, idx) => ({
          index: idx,
          name: layer.name || '<anonymous>',
          route: layer.route?.path,
          regexp: layer.regexp?.toString(),
          hasHandle: typeof layer.handle === 'function',
          handleType: typeof layer.handle,
          methods: layer.route?.methods ? Object.keys(layer.route.methods) : []
        }))
        
      } else {
        analysis.issues.push({
          severity: 'critical',
          issue: 'Admin router is not a valid Express router',
          type: typeof adminRouter,
          hasStack: !!(adminRouter && adminRouter.stack)
        })
        analysis.corruptionDetected = true
      }
      
    } catch (adminImportError) {
      analysis.issues.push({
        severity: 'critical',
        issue: 'Failed to import admin router',
        error: adminImportError.message,
        stack: adminImportError.stack
      })
      analysis.corruptionDetected = true
    }

    // STEP 4: Test individual admin sub-routers
    console.log(`[STACK_ANALYZER] ${analyzeId} - Testing admin sub-routers`)
    
    const subRouters = ['dashboard', 'users', 'analytics', 'reports']
    analysis.stackAnalysis.subRouters = {}
    
    for (const subRouterName of subRouters) {
      try {
        const subModule = await import(`./admin/${subRouterName}.js`)
        const subRouter = subModule.default
        
        analysis.stackAnalysis.subRouters[subRouterName] = analyzeRouterStack(subRouter, subRouterName)
        
      } catch (subError) {
        analysis.stackAnalysis.subRouters[subRouterName] = {
          error: subError.message,
          stack: subError.stack
        }
        analysis.issues.push({
          severity: 'high',
          issue: `Failed to import ${subRouterName} sub-router`,
          error: subError.message
        })
      }
    }

    // STEP 5: Corruption detection
    console.log(`[STACK_ANALYZER] ${analyzeId} - Running corruption detection`)
    
    const corruptionChecks = [
      checkForUndefinedHandlers(analysis.stackAnalysis),
      checkForCircularReferences(analysis.stackAnalysis),
      checkForInvalidMiddleware(analysis.stackAnalysis),
      checkForRouteConflicts(analysis.stackAnalysis)
    ]
    
    analysis.corruptionChecks = corruptionChecks
    analysis.corruptionDetected = corruptionChecks.some(check => check.detected)

    // STEP 6: Generate specific recommendations
    if (analysis.corruptionDetected) {
      analysis.recommendations.push('🚨 Router corruption detected - see corruption checks for details')
    }
    
    if (analysis.issues.filter(i => i.severity === 'critical').length > 0) {
      analysis.recommendations.push('🚨 Critical issues found - immediate action required')
    }
    
    const undefinedHandlers = analysis.issues.filter(i => i.issue.includes('undefined'))
    if (undefinedHandlers.length > 0) {
      analysis.recommendations.push('🎯 Undefined handlers detected - this is likely the source of undefined.apply errors')
    }

    console.log(`[STACK_ANALYZER] ${analyzeId} - Analysis complete:`, {
      corruptionDetected: analysis.corruptionDetected,
      issueCount: analysis.issues.length,
      recommendationCount: analysis.recommendations.length
    })

    return res.status(200).json({
      success: true,
      message: 'Router stack analysis complete',
      analysis,
      summary: {
        corruptionDetected: analysis.corruptionDetected,
        criticalIssues: analysis.issues.filter(i => i.severity === 'critical').length,
        totalIssues: analysis.issues.length,
        primarySuspect: analysis.recommendations[0] || 'No obvious issues detected'
      }
    })

  } catch (fatalError) {
    console.error(`[STACK_ANALYZER] ${analyzeId} - Fatal error:`, fatalError)
    
    return res.status(500).json({
      success: false,
      error: 'Stack analyzer failed',
      message: fatalError.message,
      stack: fatalError.stack,
      partialAnalysis: analysis
    })
  }
}

function analyzeRouterStack(router, name) {
  const analysis = {
    name,
    exists: !!router,
    type: typeof router,
    isFunction: typeof router === 'function',
    hasStack: router && Array.isArray(router.stack),
    stackLength: router?.stack?.length || 0,
    layers: [],
    issues: []
  }

  if (router && router.stack) {
    router.stack.forEach((layer, idx) => {
      const layerAnalysis = {
        index: idx,
        name: layer.name || '<anonymous>',
        hasHandle: typeof layer.handle === 'function',
        handleType: typeof layer.handle,
        route: layer.route?.path,
        regexp: layer.regexp?.toString(),
        keys: layer.keys?.map(k => k.name) || []
      }
      
      // Check for issues
      if (typeof layer.handle !== 'function') {
        analysis.issues.push({
          type: 'invalid_handle',
          layer: idx,
          handleType: typeof layer.handle,
          severity: 'critical'
        })
      }
      
      if (layer.route && layer.route.stack) {
        layerAnalysis.routeStack = layer.route.stack.map((routeLayer, routeIdx) => ({
          index: routeIdx,
          method: routeLayer.method,
          hasHandle: typeof routeLayer.handle === 'function',
          handleType: typeof routeLayer.handle
        }))
        
        // Check route stack for issues
        layer.route.stack.forEach((routeLayer, routeIdx) => {
          if (typeof routeLayer.handle !== 'function') {
            analysis.issues.push({
              type: 'invalid_route_handle',
              layer: idx,
              routeLayer: routeIdx,
              handleType: typeof routeLayer.handle,
              severity: 'critical'
            })
          }
        })
      }
      
      analysis.layers.push(layerAnalysis)
    })
  }

  return analysis
}

function checkForUndefinedHandlers(stackAnalysis) {
  const undefinedHandlers = []
  
  Object.values(stackAnalysis).forEach(routerAnalysis => {
    if (routerAnalysis.issues) {
      undefinedHandlers.push(...routerAnalysis.issues.filter(issue => 
        issue.type.includes('invalid') && issue.handleType === 'undefined'
      ))
    }
  })
  
  return {
    name: 'undefined_handlers',
    detected: undefinedHandlers.length > 0,
    count: undefinedHandlers.length,
    details: undefinedHandlers
  }
}

function checkForCircularReferences(stackAnalysis) {
  // This is a simplified check - in a real scenario, circular refs are complex to detect
  return {
    name: 'circular_references',
    detected: false,
    message: 'Circular reference detection not implemented (complex analysis required)'
  }
}

function checkForInvalidMiddleware(stackAnalysis) {
  const invalidMiddleware = []
  
  Object.values(stackAnalysis).forEach(routerAnalysis => {
    if (routerAnalysis.layers) {
      routerAnalysis.layers.forEach(layer => {
        if (!layer.route && !layer.hasHandle) {
          invalidMiddleware.push({
            router: routerAnalysis.name,
            layer: layer.index,
            issue: 'Middleware layer without valid handle'
          })
        }
      })
    }
  })
  
  return {
    name: 'invalid_middleware',
    detected: invalidMiddleware.length > 0,
    count: invalidMiddleware.length,
    details: invalidMiddleware
  }
}

function checkForRouteConflicts(stackAnalysis) {
  const routes = []
  const conflicts = []
  
  Object.values(stackAnalysis).forEach(routerAnalysis => {
    if (routerAnalysis.layers) {
      routerAnalysis.layers.forEach(layer => {
        if (layer.route) {
          const existingRoute = routes.find(r => r.path === layer.route)
          if (existingRoute) {
            conflicts.push({
              path: layer.route,
              routers: [existingRoute.router, routerAnalysis.name]
            })
          } else {
            routes.push({
              path: layer.route,
              router: routerAnalysis.name
            })
          }
        }
      })
    }
  })
  
  return {
    name: 'route_conflicts',
    detected: conflicts.length > 0,
    count: conflicts.length,
    conflicts
  }
}
