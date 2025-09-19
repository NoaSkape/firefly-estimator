// LIVE ERROR INTERCEPTOR
// This module patches Express router methods to catch undefined.apply errors in real-time

let interceptorActive = false
const errorLog = []

export function activateDebugInterceptor() {
  if (interceptorActive) return
  
  console.log('[DEBUG_INTERCEPTOR] Activating live error interception')
  
  // Patch Express Router prototype to catch undefined.apply errors
  try {
    const express = require('express')
    const Router = express.Router
    
    // Patch the Router constructor
    const originalRouter = Router.bind(express)
    express.Router = function(...args) {
      const router = originalRouter(...args)
      
      // Patch the router.use method
      const originalUse = router.use.bind(router)
      router.use = function(...useArgs) {
        try {
          console.log('[DEBUG_INTERCEPTOR] Router.use called with:', {
            args: useArgs.map(arg => ({
              type: typeof arg,
              isFunction: typeof arg === 'function',
              name: arg?.name || '<anonymous>'
            }))
          })
          
          // Check for undefined handlers before calling original use
          const handlers = useArgs.filter(arg => typeof arg === 'function')
          if (handlers.length !== useArgs.filter(arg => typeof arg !== 'string' && !Array.isArray(arg) && !(arg instanceof RegExp)).length) {
            console.error('[DEBUG_INTERCEPTOR] Non-function handler detected in router.use')
            errorLog.push({
              timestamp: new Date().toISOString(),
              type: 'non_function_handler',
              args: useArgs.map(arg => ({ type: typeof arg, value: String(arg).substring(0, 100) }))
            })
          }
          
          return originalUse(...useArgs)
        } catch (error) {
          console.error('[DEBUG_INTERCEPTOR] Error in router.use:', error)
          errorLog.push({
            timestamp: new Date().toISOString(),
            type: 'router_use_error',
            error: error.message,
            stack: error.stack
          })
          throw error
        }
      }
      
      // Patch the router.handle method
      const originalHandle = router.handle?.bind(router)
      if (originalHandle) {
        router.handle = function(req, res, next) {
          try {
            console.log('[DEBUG_INTERCEPTOR] Router.handle called:', {
              method: req?.method,
              url: req?.url,
              stackLength: this.stack?.length
            })
            
            // Check stack integrity before handling
            if (this.stack) {
              this.stack.forEach((layer, idx) => {
                if (typeof layer?.handle !== 'function') {
                  console.error(`[DEBUG_INTERCEPTOR] Invalid layer handle at index ${idx}:`, {
                    type: typeof layer?.handle,
                    name: layer?.name,
                    route: layer?.route?.path
                  })
                  errorLog.push({
                    timestamp: new Date().toISOString(),
                    type: 'invalid_layer_handle',
                    layerIndex: idx,
                    layerType: typeof layer?.handle,
                    layerName: layer?.name
                  })
                }
              })
            }
            
            return originalHandle(req, res, next)
          } catch (error) {
            console.error('[DEBUG_INTERCEPTOR] Error in router.handle:', error)
            errorLog.push({
              timestamp: new Date().toISOString(),
              type: 'router_handle_error',
              error: error.message,
              stack: error.stack,
              url: req?.url,
              method: req?.method
            })
            throw error
          }
        }
      }
      
      return router
    }
    
    interceptorActive = true
    console.log('[DEBUG_INTERCEPTOR] Live error interception activated')
    
  } catch (patchError) {
    console.error('[DEBUG_INTERCEPTOR] Failed to patch Express:', patchError)
    errorLog.push({
      timestamp: new Date().toISOString(),
      type: 'patch_error',
      error: patchError.message,
      stack: patchError.stack
    })
  }
}

export function getInterceptorLogs() {
  return {
    active: interceptorActive,
    errorCount: errorLog.length,
    errors: errorLog,
    lastError: errorLog[errorLog.length - 1] || null
  }
}

export function clearInterceptorLogs() {
  errorLog.length = 0
  console.log('[DEBUG_INTERCEPTOR] Error log cleared')
}

// Auto-activate in debug mode
if (process.env.DEBUG_ADMIN === 'true') {
  activateDebugInterceptor()
}
