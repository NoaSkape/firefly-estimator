// REQUEST FLOW TRACER
// This endpoint traces the exact path a request takes through the system
// Use this to see where the undefined.apply error occurs

export const runtime = 'nodejs'

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()
  
  console.log(`[FLOW_TRACER] ${traceId} - Starting request flow trace`)

  try {
    // STEP 1: Simulate the exact admin dashboard request flow
    const targetUrl = req.query.target || '/api/admin/dashboard?range=30d'
    
    console.log(`[FLOW_TRACER] ${traceId} - Simulating request to: ${targetUrl}`)

    // Parse the target URL
    const url = new URL(targetUrl, 'https://fireflyestimator.com')
    const path = url.pathname
    const query = Object.fromEntries(url.searchParams)

    console.log(`[FLOW_TRACER] ${traceId} - Parsed URL:`, { path, query })

    // STEP 2: Import the main API app
    console.log(`[FLOW_TRACER] ${traceId} - Importing main API`)
    const apiModule = await import('./index.js')
    const app = apiModule.default
    
    console.log(`[FLOW_TRACER] ${traceId} - Main API imported:`, {
      type: typeof app,
      isFunction: typeof app === 'function'
    })

    // STEP 3: Create a mock request/response to trace through the system
    console.log(`[FLOW_TRACER] ${traceId} - Creating mock request`)
    
    const mockReq = {
      method: 'GET',
      url: path,
      path: path,
      query: query,
      headers: {
        'user-agent': 'Flow-Tracer/1.0',
        'authorization': req.headers.authorization || ''
      },
      originalUrl: targetUrl,
      params: {},
      body: {}
    }

    const mockRes = {
      headersSent: false,
      statusCode: 200,
      headers: {},
      setHeader: function(name, value) {
        this.headers[name] = value
        console.log(`[FLOW_TRACER] ${traceId} - Response header set:`, { name, value })
      },
      status: function(code) {
        this.statusCode = code
        console.log(`[FLOW_TRACER] ${traceId} - Status set:`, code)
        return this
      },
      json: function(data) {
        console.log(`[FLOW_TRACER] ${traceId} - JSON response:`, { 
          status: this.statusCode,
          dataKeys: Object.keys(data || {}),
          success: data?.success
        })
        this.responseData = data
        this.headersSent = true
      },
      end: function(data) {
        console.log(`[FLOW_TRACER] ${traceId} - Response ended:`, { data })
        this.headersSent = true
      }
    }

    console.log(`[FLOW_TRACER] ${traceId} - Mock request/response created`)

    // STEP 4: Trace the request through the Express app
    console.log(`[FLOW_TRACER] ${traceId} - Executing request through Express app`)
    
    const executionStart = Date.now()
    let executionError = null
    
    try {
      // This is where the undefined.apply error should occur if it's going to happen
      await new Promise((resolve, reject) => {
        // Set up error capture
        const originalNext = function(err) {
          if (err) {
            console.log(`[FLOW_TRACER] ${traceId} - Next called with error:`, err.message)
            reject(err)
          } else {
            console.log(`[FLOW_TRACER] ${traceId} - Next called successfully`)
            resolve()
          }
        }

        // Wrap the app call to catch the exact error
        try {
          console.log(`[FLOW_TRACER] ${traceId} - Calling app(mockReq, mockRes)`)
          app(mockReq, mockRes)
          
          // Give it a moment to process
          setTimeout(() => {
            if (!mockRes.headersSent) {
              console.log(`[FLOW_TRACER] ${traceId} - Request still processing after 1s`)
              resolve()
            } else {
              console.log(`[FLOW_TRACER] ${traceId} - Request completed successfully`)
              resolve()
            }
          }, 1000)
          
        } catch (appError) {
          console.log(`[FLOW_TRACER] ${traceId} - App call threw error:`, appError.message)
          reject(appError)
        }
      })
      
    } catch (execError) {
      executionError = execError
      captureError(execError, 'express_execution')
    }

    const executionTime = Date.now() - executionStart

    console.log(`[FLOW_TRACER] ${traceId} - Execution completed:`, {
      executionTime,
      hasError: !!executionError,
      responseStatus: mockRes.statusCode,
      responseHeaders: Object.keys(mockRes.headers),
      headersSent: mockRes.headersSent
    })

    // STEP 5: Analyze the results
    const analysis = {
      requestSuccessful: !executionError && mockRes.headersSent,
      executionTime,
      finalStatus: mockRes.statusCode,
      responseData: mockRes.responseData,
      errorOccurred: !!executionError,
      errorDetails: executionError ? {
        message: executionError.message,
        stack: executionError.stack,
        name: executionError.name
      } : null
    }

    // STEP 6: Router stack inspection
    console.log(`[FLOW_TRACER] ${traceId} - Inspecting router stacks`)
    
    let routerInspection = {}
    try {
      // Import admin router and inspect its stack
      const adminModule = await import('./admin/index.js')
      const adminRouter = adminModule.default
      
      if (adminRouter && adminRouter.stack) {
        routerInspection.adminRouter = {
          stackLength: adminRouter.stack.length,
          layers: adminRouter.stack.map((layer, idx) => ({
            index: idx,
            name: layer.name || '<anonymous>',
            hasHandle: typeof layer.handle === 'function',
            handleType: typeof layer.handle,
            route: layer.route?.path,
            regexp: layer.regexp?.toString(),
            keys: layer.keys?.map(k => k.name) || []
          }))
        }
      }
    } catch (inspectionError) {
      routerInspection.error = inspectionError.message
      captureError(inspectionError, 'router_inspection')
    }

    const totalTime = Date.now() - startTime

    return res.status(200).json({
      success: true,
      traceId,
      message: 'Request flow trace complete',
      target: targetUrl,
      analysis,
      routerInspection,
      logs,
      errors,
      performance: {
        totalTime,
        executionTime,
        phases: {
          setup: executionStart - startTime,
          execution: executionTime,
          analysis: totalTime - executionStart - executionTime
        }
      },
      recommendations: generateFlowRecommendations(analysis, errors)
    })

  } catch (fatalError) {
    console.error(`[FLOW_TRACER] ${traceId} - Fatal error:`, fatalError)
    
    return res.status(500).json({
      success: false,
      traceId,
      error: 'Flow tracer failed',
      message: fatalError.message,
      stack: fatalError.stack,
      logs,
      errors,
      totalTime: Date.now() - startTime
    })
  }
}

function generateFlowRecommendations(analysis, errors) {
  const recommendations = []

  if (analysis.errorOccurred) {
    recommendations.push('🚨 Error occurred during Express execution - check error details')
    
    if (analysis.errorDetails?.message?.includes('apply')) {
      recommendations.push('🎯 undefined.apply error detected - router middleware chain is corrupted')
    }
    
    if (analysis.errorDetails?.message?.includes('Cannot read properties of undefined')) {
      recommendations.push('🎯 Undefined property access - check for null/undefined middleware or handlers')
    }
  }

  if (!analysis.requestSuccessful) {
    recommendations.push('⚠️ Request did not complete successfully')
  }

  if (analysis.executionTime > 5000) {
    recommendations.push('⚠️ Slow execution time - possible timeout or infinite loop')
  }

  if (errors.some(e => e.phase.includes('import'))) {
    recommendations.push('🚨 Module import errors - check file syntax and dependencies')
  }

  if (errors.some(e => e.phase.includes('mount'))) {
    recommendations.push('🚨 Router mounting errors - check router export/import issues')
  }

  return recommendations
}
