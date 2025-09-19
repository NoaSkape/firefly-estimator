// CLEAN Admin API Router - NO DUPLICATE ROUTES
// This version only handles core admin functions and mounts sub-routers
// FIXES the duplicate route registration issue that was causing undefined.apply errors

import express from 'express'
import { adminAuth, validateAdminAccess, PERMISSIONS } from '../../lib/adminAuth.js'
import { initializeAdminDatabase } from '../../lib/adminSchema.js'

// Import all sub-routers
import analyticsRouter from './analytics.js'
import dashboardRouter from './dashboard.js'
import reportsRouter from './reports.js'
import ordersRouter from './orders.js'
import financialRouter from './financial.js'
import contentRouter from './content.js'
import usersRouter from './users.js'
import notificationsRouter from './notifications.js'
import aiInsightsRouter from './ai-insights.js'
import integrationsRouter from './integrations.js'
import securityRouter from './security.js'
import workflowsRouter from './workflows.js'
import monitoringRouter from './monitoring.js'
import exportRouter from './export.js'
import settingsRouter from './settings.js'

const router = express.Router()

console.log('[ADMIN_CLEAN] Clean admin router initializing')

// Initialize admin database on startup (non-blocking)
let dbInitialized = false
initializeAdminDatabase()
  .then(() => {
    dbInitialized = true
    console.log('[ADMIN_CLEAN] Admin database initialized successfully')
  })
  .catch((error) => {
    console.warn('[ADMIN_CLEAN] Admin database initialization failed:', error.message)
  })

// ============================================================================
// CORE ADMIN ENDPOINTS (NO CONFLICTS WITH SUB-ROUTERS)
// ============================================================================

// Admin status probe used by the frontend to decide gating
router.get('/is-admin', async (req, res) => {
  try {
    // If admin auth is disabled, always return true for admin access
    if (process.env.ADMIN_AUTH_DISABLED === 'true') {
      return res.status(200).json({ 
        isAdmin: true, 
        userId: 'dev-admin', 
        role: 'admin',
        reason: 'auth_disabled' 
      })
    }

    // Accept Clerk Bearer token but do NOT require admin; we just report it
    const authHeader = req.headers?.authorization || req.headers?.Authorization
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null

    if (!token) {
      return res.status(200).json({ isAdmin: false, reason: 'no_token' })
    }

    try {
      const { verifyToken } = await import('@clerk/backend')
      const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
      const userId = verified?.sub || verified?.userId || null
      if (!userId) return res.status(200).json({ isAdmin: false, reason: 'no_user' })

      const role = await adminAuth.getUserRole(userId)
      const isAdmin = !!role && role !== 'viewer'
      return res.status(200).json({ isAdmin, userId, role })
    } catch (e) {
      return res.status(200).json({ isAdmin: false, reason: 'invalid_token' })
    }
  } catch (error) {
    console.error('[ADMIN_CLEAN] /is-admin error:', error)
    return res.status(200).json({ isAdmin: false, reason: 'internal_error' })
  }
})

// Non-sensitive config/status summary used by the Admin UI
router.get('/config-status', async (req, res) => {
  try {
    const aiConfigured = !!process.env.AI_API_KEY
    const aiModel = process.env.AI_MODEL || null
    const stripeMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live') ? 'live' : ((process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test') ? 'test' : 'unset')
    const stripeWebhook = !!process.env.STRIPE_WEBHOOK_SECRET
    const rateLimiter = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ? 'redis' : 'memory'

    return res.json({
      ai: { configured: aiConfigured, model: aiModel },
      stripe: { mode: stripeMode, webhookConfigured: stripeWebhook },
      rateLimiter
    })
  } catch (error) {
    console.error('[ADMIN_CLEAN] /config-status error:', error)
    return res.status(200).json({ ai: { configured: false }, stripe: { mode: 'unset', webhookConfigured: false }, rateLimiter: 'memory' })
  }
})

// Lightweight health check
router.get('/health', (req, res) => {
  try {
    const layers = Array.isArray(router.stack)
      ? router.stack.map((l, i) => ({
          i,
          name: l?.name,
          type: typeof l?.handle,
          route: l?.route?.path,
          keys: Array.isArray(l?.keys) ? l.keys.map(k => k?.name) : undefined
        }))
      : []

    res.json({
      ok: true,
      env: {
        adminAuthDisabled: process.env.ADMIN_AUTH_DISABLED === 'true'
      },
      layers
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) })
  }
})

// Public GET /me (token optional)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null

    // If auth is disabled and no token, return a safe admin stub for UI rendering
    if (!token && process.env.ADMIN_AUTH_DISABLED === 'true') {
      return res.json({
        success: true,
        data: {
          id: 'dev-admin',
          firstName: 'Admin',
          lastName: 'Bypass',
          email: null,
          role: 'admin',
          lastLogin: null,
          permissions: []
        }
      })
    }

    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const { createClerkClient, verifyToken } = await import('@clerk/backend')
    const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    const userId = verified?.sub || verified?.userId || null
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const user = await clerk.users.getUser(userId)

    const role = await adminAuth.getUserRole(userId)
    const permissions = await adminAuth.getUserPermissions(userId)

    return res.json({ success: true, data: {
      id: userId,
      firstName: user?.firstName || null,
      lastName: user?.lastName || null,
      email: user?.primaryEmailAddress?.emailAddress || null,
      role,
      lastLogin: user?.lastSignInAt || null,
      permissions
    }})
  } catch (e) {
    console.error('[ADMIN_CLEAN]/me error:', e?.message || e)
    return res.status(500).json({ error: 'Failed to fetch user information' })
  }
})

// Database health check middleware (non-blocking)
router.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initializeAdminDatabase()
      dbInitialized = true
      console.log('[ADMIN_CLEAN] Admin database initialized on first request')
    } catch (error) {
      console.warn('[ADMIN_CLEAN] Database still unavailable:', error.message)
    }
  }
  next()
})

// Admin authentication middleware for all routes
router.use((req, res, next) => {
  if (process.env.ADMIN_AUTH_DISABLED === 'true') {
    if (process.env.DEBUG_ADMIN === 'true') console.log('[ADMIN_CLEAN] bypass enabled')
    return next()
  }
  
  if (typeof validateAdminAccess === 'function') {
    return validateAdminAccess(req, res, next)
  }
  console.error('[ADMIN_CLEAN] validateAdminAccess is not a function; allowing request')
  return next()
})

// ============================================================================
// SUB-ROUTER MOUNTING (NO DUPLICATE ROUTES)
// ============================================================================

// Defensive mount helper
function mountSafe(path, subrouter, name) {
  const isFn = typeof subrouter === 'function'
  if (!isFn) {
    console.error(`[ADMIN_CLEAN] Failed to mount ${name}: not a function`, { path, type: typeof subrouter })
    router.use(path, (req, res) => {
      res.status(500).json({ error: `${name} router misconfigured` })
    })
    return
  }
  router.use(path, subrouter)
  console.log(`[ADMIN_CLEAN] Mounted ${name} at ${path}`)
}

// Mount all sub-routers - NO CONFLICTS
mountSafe('/dashboard', dashboardRouter, 'dashboardRouter')
mountSafe('/reports', reportsRouter, 'reportsRouter')
mountSafe('/analytics', analyticsRouter, 'analyticsRouter')
mountSafe('/orders', ordersRouter, 'ordersRouter')
mountSafe('/financial', financialRouter, 'financialRouter')
mountSafe('/content', contentRouter, 'contentRouter')
mountSafe('/users', usersRouter, 'usersRouter')
mountSafe('/notifications', notificationsRouter, 'notificationsRouter')
mountSafe('/ai-insights', aiInsightsRouter, 'aiInsightsRouter')
mountSafe('/integrations', integrationsRouter, 'integrationsRouter')
mountSafe('/security', securityRouter, 'securityRouter')
mountSafe('/workflows', workflowsRouter, 'workflowsRouter')
mountSafe('/monitoring', monitoringRouter, 'monitoringRouter')
mountSafe('/export', exportRouter, 'exportRouter')
mountSafe('/settings', settingsRouter, 'settingsRouter')

console.log('[ADMIN_CLEAN] All sub-routers mounted successfully')

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for admin routes
router.use('*', (req, res) => {
  console.log('[ADMIN_CLEAN] 404 for:', req.originalUrl)
  res.status(404).json({ error: 'Admin endpoint not found' })
})

// Error handler
router.use((error, req, res, next) => {
  console.error('[ADMIN_CLEAN] Error:', error)
  res.status(500).json({ error: 'Internal server error' })
})

export default router

