// LIVE REQUEST MONITOR
// This endpoint provides real-time monitoring of admin requests
// Activate this to watch requests as they happen and catch errors live

export const runtime = 'nodejs'

// Global monitoring state
let monitoringActive = false
let requestLog = []
let errorLog = []
const MAX_LOG_ENTRIES = 100

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const action = req.query.action || 'status'
  const monitorId = `monitor-${Date.now()}`

  console.log(`[LIVE_MONITOR] ${monitorId} - Action: ${action}`)

  try {
    switch (action) {
      case 'activate':
        return activateMonitoring(req, res, monitorId)
      
      case 'deactivate':
        return deactivateMonitoring(req, res, monitorId)
      
      case 'logs':
        return getLogs(req, res, monitorId)
      
      case 'clear':
        return clearLogs(req, res, monitorId)
      
      case 'test-dashboard':
        return testDashboardRequest(req, res, monitorId)
      
      case 'status':
      default:
        return getMonitoringStatus(req, res, monitorId)
    }
  } catch (error) {
    console.error(`[LIVE_MONITOR] ${monitorId} - Error:`, error)
    return res.status(500).json({
      success: false,
      error: 'Live monitor failed',
      message: error.message,
      action
    })
  }
}

async function activateMonitoring(req, res, monitorId) {
  console.log(`[LIVE_MONITOR] ${monitorId} - Activating live monitoring`)
  
  try {
    // Import and patch the main API
    const apiModule = await import('./index.js')
    const app = apiModule.default
    
    if (typeof app === 'function' && !monitoringActive) {
      // Patch the app to monitor requests
      const originalCall = app
      const patchedApp = function(req, res) {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        
        logRequest(requestId, {
          method: req.method,
          url: req.url,
          path: req.path,
          query: req.query,
          headers: {
            authorization: req.headers.authorization ? 'present' : 'missing',
            'user-agent': req.headers['user-agent']
          },
          timestamp: new Date().toISOString()
        })
        
        // Wrap response methods to capture responses
        const originalJson = res.json.bind(res)
        const originalStatus = res.status.bind(res)
        const originalEnd = res.end.bind(res)
        
        res.json = function(data) {
          logRequest(requestId, {
            type: 'response',
            method: 'json',
            status: res.statusCode,
            dataKeys: Object.keys(data || {}),
            success: data?.success
          })
          return originalJson(data)
        }
        
        res.status = function(code) {
          logRequest(requestId, {
            type: 'response',
            method: 'status',
            statusCode: code
          })
          return originalStatus(code)
        }
        
        res.end = function(data) {
          logRequest(requestId, {
            type: 'response',
            method: 'end',
            data: data ? String(data).substring(0, 100) : undefined
          })
          return originalEnd(data)
        }
        
        try {
          return originalCall(req, res)
        } catch (error) {
          logError(requestId, {
            phase: 'app_execution',
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method
          })
          throw error
        }
      }
      
      // Replace the default export (this is experimental)
      apiModule.default = patchedApp
      monitoringActive = true
      
      console.log(`[LIVE_MONITOR] ${monitorId} - Live monitoring activated`)
    }
    
    return res.status(200).json({
      success: true,
      message: 'Live monitoring activated',
      monitorId,
      active: monitoringActive
    })
    
  } catch (error) {
    console.error(`[LIVE_MONITOR] ${monitorId} - Activation failed:`, error)
    return res.status(500).json({
      success: false,
      error: 'Failed to activate monitoring',
      message: error.message
    })
  }
}

async function deactivateMonitoring(req, res, monitorId) {
  monitoringActive = false
  console.log(`[LIVE_MONITOR] ${monitorId} - Live monitoring deactivated`)
  
  return res.status(200).json({
    success: true,
    message: 'Live monitoring deactivated',
    monitorId
  })
}

async function getLogs(req, res, monitorId) {
  const limit = parseInt(req.query.limit) || 50
  const type = req.query.type || 'all' // 'requests', 'errors', 'all'
  
  let logs = []
  
  if (type === 'requests' || type === 'all') {
    logs.push(...requestLog.slice(-limit).map(log => ({ ...log, type: 'request' })))
  }
  
  if (type === 'errors' || type === 'all') {
    logs.push(...errorLog.slice(-limit).map(log => ({ ...log, type: 'error' })))
  }
  
  // Sort by timestamp
  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  
  return res.status(200).json({
    success: true,
    monitorId,
    monitoring: monitoringActive,
    logs: logs.slice(-limit),
    summary: {
      totalRequests: requestLog.length,
      totalErrors: errorLog.length,
      recentErrors: errorLog.filter(e => 
        new Date(e.timestamp) > new Date(Date.now() - 60000)
      ).length
    }
  })
}

async function clearLogs(req, res, monitorId) {
  const oldCounts = { requests: requestLog.length, errors: errorLog.length }
  requestLog.length = 0
  errorLog.length = 0
  
  return res.status(200).json({
    success: true,
    message: 'Logs cleared',
    monitorId,
    cleared: oldCounts
  })
}

async function testDashboardRequest(req, res, monitorId) {
  console.log(`[LIVE_MONITOR] ${monitorId} - Testing dashboard request`)
  
  try {
    // Make an internal request to the dashboard endpoint
    const testResult = {
      timestamp: new Date().toISOString(),
      test: 'dashboard_request',
      steps: []
    }
    
    // Step 1: Import main API
    testResult.steps.push({ step: 'import_api', status: 'starting' })
    const apiModule = await import('./index.js')
    testResult.steps.push({ step: 'import_api', status: 'success' })
    
    // Step 2: Create mock request
    testResult.steps.push({ step: 'create_mock_request', status: 'starting' })
    const mockReq = {
      method: 'GET',
      url: '/admin/dashboard',
      path: '/admin/dashboard',
      query: { range: '30d' },
      headers: {}
    }
    
    const mockRes = {
      statusCode: 200,
      headers: {},
      setHeader: () => {},
      status: function(code) { this.statusCode = code; return this },
      json: function(data) { this.responseData = data },
      end: function() {}
    }
    testResult.steps.push({ step: 'create_mock_request', status: 'success' })
    
    // Step 3: Execute request
    testResult.steps.push({ step: 'execute_request', status: 'starting' })
    
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request timeout after 5 seconds'))
        }, 5000)
        
        try {
          apiModule.default(mockReq, mockRes)
          clearTimeout(timeout)
          resolve()
        } catch (execError) {
          clearTimeout(timeout)
          reject(execError)
        }
      })
      
      testResult.steps.push({ 
        step: 'execute_request', 
        status: 'success',
        responseStatus: mockRes.statusCode,
        hasResponseData: !!mockRes.responseData
      })
      
    } catch (execError) {
      testResult.steps.push({ 
        step: 'execute_request', 
        status: 'failed',
        error: execError.message,
        stack: execError.stack
      })
    }
    
    return res.status(200).json({
      success: true,
      message: 'Dashboard request test complete',
      monitorId,
      testResult
    })
    
  } catch (error) {
    console.error(`[LIVE_MONITOR] ${monitorId} - Test failed:`, error)
    return res.status(500).json({
      success: false,
      error: 'Dashboard test failed',
      message: error.message,
      monitorId
    })
  }
}

async function getMonitoringStatus(req, res, monitorId) {
  return res.status(200).json({
    success: true,
    monitorId,
    monitoring: {
      active: monitoringActive,
      requestCount: requestLog.length,
      errorCount: errorLog.length,
      lastRequest: requestLog[requestLog.length - 1] || null,
      lastError: errorLog[errorLog.length - 1] || null
    },
    actions: {
      activate: '?action=activate',
      deactivate: '?action=deactivate',
      logs: '?action=logs&type=all&limit=50',
      clear: '?action=clear',
      testDashboard: '?action=test-dashboard'
    },
    timestamp: new Date().toISOString()
  })
}

function logRequest(requestId, data) {
  const entry = {
    requestId,
    timestamp: new Date().toISOString(),
    ...data
  }
  
  requestLog.push(entry)
  if (requestLog.length > MAX_LOG_ENTRIES) {
    requestLog.shift()
  }
  
  console.log(`[LIVE_MONITOR] REQUEST ${requestId}:`, data)
}

function logError(requestId, data) {
  const entry = {
    requestId,
    timestamp: new Date().toISOString(),
    ...data
  }
  
  errorLog.push(entry)
  if (errorLog.length > MAX_LOG_ENTRIES) {
    errorLog.shift()
  }
  
  console.error(`[LIVE_MONITOR] ERROR ${requestId}:`, data)
}
