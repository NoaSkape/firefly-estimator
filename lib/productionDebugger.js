/**
 * Production Debugging System
 * Comprehensive logging and error tracking for Vercel production environment
 */

export class ProductionDebugger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.errorCount = 0
    this.startTime = Date.now()
    
    // Enable detailed logging in production
    this.setupProductionLogging()
    this.setupErrorTracking()
  }

  setupProductionLogging() {
    // Override console methods to add more context
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    console.log = (...args) => {
      const timestamp = new Date().toISOString()
      const stack = new Error().stack?.split('\n')[2]?.trim()
      originalLog(`[${timestamp}] [LOG]`, ...args, `\n   Stack: ${stack}`)
    }

    console.error = (...args) => {
      const timestamp = new Date().toISOString()
      const stack = new Error().stack?.split('\n')[2]?.trim()
      this.errorCount++
      originalError(`[${timestamp}] [ERROR #${this.errorCount}]`, ...args, `\n   Stack: ${stack}`)
    }

    console.warn = (...args) => {
      const timestamp = new Date().toISOString()
      const stack = new Error().stack?.split('\n')[2]?.trim()
      originalWarn(`[${timestamp}] [WARN]`, ...args, `\n   Stack: ${stack}`)
    }
  }

  setupErrorTracking() {
    // Track all uncaught exceptions with detailed context
    process.on('uncaughtException', (error) => {
      console.error('🚨 UNCAUGHT EXCEPTION DETECTED:')
      console.error('   Error message:', error.message)
      console.error('   Error type:', error.constructor.name)
      console.error('   Error code:', error.code)
      console.error('   Full stack:', error.stack)
      
      // Check if this is the specific Express router error
      if (error.message.includes("Cannot read properties of undefined (reading 'apply')")) {
        console.error('🎯 THIS IS THE EXPRESS ROUTER APPLY ERROR!')
        console.error('   Location: Express router index.js:646:15')
        console.error('   Likely cause: Middleware function is undefined when Express tries to call it')
        
        // Try to get more context about what was undefined
        this.analyzeExpressError(error)
      }
      
      // Log system state at time of error
      this.logSystemState()
      
      // Don't exit immediately - give time to log everything
      setTimeout(() => {
        console.error('🚨 Process exiting due to uncaught exception after 1 second delay')
        process.exit(1)
      }, 1000)
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 UNHANDLED REJECTION DETECTED:')
      console.error('   Reason:', reason)
      console.error('   Promise:', promise)
      
      if (reason?.message?.includes('apply')) {
        console.error('🎯 THIS MIGHT BE RELATED TO THE APPLY ERROR!')
      }
    })
  }

  analyzeExpressError(error) {
    console.error('\n📊 EXPRESS ERROR ANALYSIS:')
    
    // Try to analyze the stack trace for more clues
    const stackLines = error.stack?.split('\n') || []
    stackLines.forEach((line, idx) => {
      if (line.includes('express') || line.includes('router')) {
        console.error(`   Stack ${idx}: ${line.trim()}`)
      }
    })
    
    // Log current middleware state
    console.error('\n🔍 MIDDLEWARE STATE ANALYSIS:')
    console.error('   Available globals:', Object.keys(global))
    console.error('   Process env keys:', Object.keys(process.env).filter(k => k.includes('ADMIN')))
  }

  logSystemState() {
    console.error('\n📊 SYSTEM STATE AT ERROR:')
    console.error('   Uptime:', Math.round((Date.now() - this.startTime) / 1000), 'seconds')
    console.error('   Error count:', this.errorCount)
    console.error('   Memory usage:', process.memoryUsage())
    console.error('   Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      ADMIN_AUTH_DISABLED: process.env.ADMIN_AUTH_DISABLED,
      DEBUG_ADMIN: process.env.DEBUG_ADMIN,
      hasClerkKey: !!process.env.CLERK_SECRET_KEY,
      hasMongoUri: !!process.env.MONGODB_URI
    })
  }

  // Method to wrap Express routers with detailed debugging
  wrapRouter(router, name) {
    if (!router || typeof router !== 'function') {
      console.error(`🚨 ROUTER WRAP ERROR: ${name} is not a function!`)
      console.error('   Type:', typeof router)
      console.error('   Value:', router)
      return (req, res) => res.status(500).json({ error: `${name} router not properly initialized` })
    }

    console.log(`✅ Wrapping router: ${name}`)
    
    // Wrap the router with debugging
    const wrappedRouter = (req, res, next) => {
      console.log(`🔄 Router ${name} called:`, {
        method: req.method,
        url: req.url,
        path: req.path
      })
      
      try {
        return router(req, res, next)
      } catch (error) {
        console.error(`🚨 Router ${name} error:`, error)
        if (!res.headersSent) {
          res.status(500).json({ error: `Router ${name} failed`, message: error.message })
        }
      }
    }
    
    // Copy router properties
    if (router.stack) wrappedRouter.stack = router.stack
    if (router.use) wrappedRouter.use = router.use.bind(router)
    if (router.get) wrappedRouter.get = router.get.bind(router)
    if (router.post) wrappedRouter.post = router.post.bind(router)
    
    return wrappedRouter
  }

  // Method to wrap middleware with debugging
  wrapMiddleware(middleware, name) {
    if (typeof middleware !== 'function') {
      console.error(`🚨 MIDDLEWARE WRAP ERROR: ${name} is not a function!`)
      console.error('   Type:', typeof middleware)
      console.error('   Value:', middleware)
      return (req, res, next) => {
        console.error(`🚨 Calling broken middleware: ${name}`)
        next()
      }
    }

    return async (req, res, next) => {
      console.log(`🔄 Middleware ${name} called`)
      try {
        if (middleware.constructor.name === 'AsyncFunction') {
          await middleware(req, res, next)
        } else {
          middleware(req, res, next)
        }
      } catch (error) {
        console.error(`🚨 Middleware ${name} error:`, error)
        next(error)
      }
    }
  }
}

// Create global debugger instance
export const productionDebugger = new ProductionDebugger()

// Export wrapper functions for easy use
export const wrapRouter = (router, name) => productionDebugger.wrapRouter(router, name)
export const wrapMiddleware = (middleware, name) => productionDebugger.wrapMiddleware(middleware, name)

// Log that the debugger is active
console.log('🔧 Production Debugger initialized')
console.log('   Environment:', process.env.NODE_ENV)
console.log('   Timestamp:', new Date().toISOString())

export default productionDebugger
