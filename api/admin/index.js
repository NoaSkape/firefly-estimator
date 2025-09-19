// Comprehensive Admin API Router for Firefly Estimator
// Handles all admin operations with proper authentication and validation

import express from 'express'
import { z } from 'zod'
import { adminAuth, PERMISSIONS } from '../../lib/adminAuth.js'
import {
  getCollection,
  COLLECTIONS,
  initializeAdminDatabase
} from '../../lib/adminSchema.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { getDb } from '../../lib/db.js'
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
import { toObjectIdOrString } from '../../lib/mongoIds.js'

const router = express.Router()

// Guard router.use to avoid inserting non-function layers
const __origRouterUse = router.use.bind(router)
router.use = function guardedRouterUse(...args) {
  try {
    const path = typeof args[0] === 'string' || args[0] instanceof RegExp || Array.isArray(args[0]) ? args[0] : undefined
    const handlers = path ? args.slice(1) : args
    const startIndex = path ? 1 : 0
    for (let i = 0; i < handlers.length; i++) {
      if (typeof handlers[i] !== 'function') {
        const idx = startIndex + i
        const t = typeof handlers[i]
        console.error('[ADMIN_USE_GUARD] Non-function handler; patching', { path, index: idx, type: t })
        args[idx] = (req, res) => res.status(500).json({ error: 'admin_handler_misconfigured', path: String(path || ''), index: idx, type: t })
      }
    }
  } catch (e) {
    console.warn('[ADMIN_USE_GUARD] Failed to inspect handler:', e?.message)
  }
  return __origRouterUse(...args)
}

// Initialize admin database on startup (non-blocking)
// This will not prevent the router from loading if DB is unavailable
let dbInitialized = false
initializeAdminDatabase()
  .then(() => {
    dbInitialized = true
    console.log('[ADMIN] Admin database initialized successfully')
  })
  .catch((error) => {
    console.warn('[ADMIN] Admin database initialization failed (will retry on first request):', error.message)
    // Don't throw - allow router to load without DB
  })

// ============================================================================
// MIDDLEWARE & VALIDATION
// ============================================================================

// Public-ish diagnostics and bootstrap endpoints (no admin requirement)
// These must be defined BEFORE the admin auth middleware below.

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
      // Token invalid or Clerk misconfigured — treat as not admin
      return res.status(200).json({ isAdmin: false, reason: 'invalid_token' })
    }
  } catch (error) {
    console.error('[ADMIN] /is-admin error:', error)
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
    console.error('[ADMIN] /config-status error:', error)
    return res.status(200).json({ ai: { configured: false }, stripe: { mode: 'unset', webhookConfigured: false }, rateLimiter: 'memory' })
  }
})

// Lightweight health check (unauthenticated) to diagnose router/middleware shape
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

// Debug route to inspect the admin router shape (only when DEBUG_ADMIN=true)
router.get('/_debug/router', (req, res) => {
  if (process.env.DEBUG_ADMIN !== 'true') return res.status(404).end()
  try {
    function layerInfo(l) {
      const info = {
        name: l?.name,
        hasHandle: typeof l?.handle === 'function',
        route: l?.route?.path,
      }
      if (l?.route?.stack) {
        info.methods = l.route.stack.map(s => s?.method)
      }
      if (l?.regexp) {
        info.mount = String(l.regexp)
      }
      if (Array.isArray(l?.keys)) {
        info.keys = l.keys.map(k => k?.name)
      }
      return info
    }
    const dump = Array.isArray(router.stack)
      ? router.stack.map((l, i) => ({ i, ...layerInfo(l) }))
      : []
    res.json({ ok: true, dump })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) })
  }
})

// Enhanced diagnostic endpoint for debugging authentication issues
router.get('/_debug/auth-status', (req, res) => {
  if (process.env.DEBUG_ADMIN !== 'true') return res.status(404).end()
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization
    const hasToken = !!(typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
    
    res.json({
      ok: true,
      environment: {
        adminAuthDisabled: process.env.ADMIN_AUTH_DISABLED === 'true',
        debugAdmin: process.env.DEBUG_ADMIN === 'true',
        hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
        clerkKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 8) + '...'
      },
      request: {
        hasAuthHeader: !!authHeader,
        hasBearerToken: hasToken,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin
      },
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) })
  }
})

// Router mounting diagnostic endpoint
router.get('/_debug/routers', (req, res) => {
  if (process.env.DEBUG_ADMIN !== 'true') return res.status(404).end()
  try {
    const routerStatus = {
      dashboardRouter: { type: typeof dashboardRouter, isFunction: typeof dashboardRouter === 'function' },
      reportsRouter: { type: typeof reportsRouter, isFunction: typeof reportsRouter === 'function' },
      analyticsRouter: { type: typeof analyticsRouter, isFunction: typeof analyticsRouter === 'function' },
      ordersRouter: { type: typeof ordersRouter, isFunction: typeof ordersRouter === 'function' },
      financialRouter: { type: typeof financialRouter, isFunction: typeof financialRouter === 'function' },
      contentRouter: { type: typeof contentRouter, isFunction: typeof contentRouter === 'function' },
      usersRouter: { type: typeof usersRouter, isFunction: typeof usersRouter === 'function' },
      notificationsRouter: { type: typeof notificationsRouter, isFunction: typeof notificationsRouter === 'function' },
      aiInsightsRouter: { type: typeof aiInsightsRouter, isFunction: typeof aiInsightsRouter === 'function' },
      integrationsRouter: { type: typeof integrationsRouter, isFunction: typeof integrationsRouter === 'function' },
      securityRouter: { type: typeof securityRouter, isFunction: typeof securityRouter === 'function' },
      workflowsRouter: { type: typeof workflowsRouter, isFunction: typeof workflowsRouter === 'function' },
      monitoringRouter: { type: typeof monitoringRouter, isFunction: typeof monitoringRouter === 'function' },
      exportRouter: { type: typeof exportRouter, isFunction: typeof exportRouter === 'function' },
      settingsRouter: { type: typeof settingsRouter, isFunction: typeof settingsRouter === 'function' }
    }
    
    res.json({
      ok: true,
      routerStatus,
      failedRouters: Object.entries(routerStatus).filter(([name, status]) => !status.isFunction),
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) })
  }
})

// DISABLED: Router hardening middleware that was causing undefined.apply errors
// This middleware was modifying the router stack during request processing, causing race conditions
// Since ADMIN_AUTH_DISABLED=true, we don't need this hardening anyway
// router.use((req, res, next) => {
//   try { hardenRouterLocal(router, 'admin@rq'); } catch {}
//   next()
// })

// Public GET /me (token optional). This is defined BEFORE auth middleware to avoid
// middleware chain issues and to allow soft probing of the current user.
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
          permissions: [] // UI checks for specific permissions; keep empty to reduce risk
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

    // Derive RBAC role/permissions without invoking auth middleware
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
    console.error('[ADMIN]/me (public) error:', e?.message || e)
    return res.status(500).json({ error: 'Failed to fetch user information' })
  }
})

// Database health check middleware (non-blocking)
router.use(async (req, res, next) => {
  // If DB wasn't initialized at startup, try to initialize it now
  if (!dbInitialized) {
    try {
      await initializeAdminDatabase()
      dbInitialized = true
      console.log('[ADMIN] Admin database initialized on first request')
    } catch (error) {
      console.warn('[ADMIN] Database still unavailable:', error.message)
      // Continue anyway - some endpoints might work without DB
    }
  }
  next()
})

// Admin authentication middleware for all routes
router.use((req, res, next) => {
  if (process.env.ADMIN_AUTH_DISABLED === 'true') {
    if (process.env.DEBUG_ADMIN === 'true') console.log('[ADMIN_AUTH] bypass enabled — skipping admin check')
    return next()
  }
  // Extra guard: ensure middleware function exists
  if (typeof adminAuth?.validateAdminAccess === 'function') {
    return adminAuth.validateAdminAccess(req, res, next)
  }
  console.error('[ADMIN_AUTH] validateAdminAccess is not a function; allowing request to proceed')
  return next()
})

// Request validation schemas
const adminSchemas = {
  // Pagination and filtering
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc')
  }),

  // Model operations
  createModel: z.object({
    modelCode: z.string().min(1, 'Model code is required'),
    slug: z.string().min(1, 'Slug is required'),
    name: z.string().min(1, 'Name is required'),
    category: z.enum(['standard', 'premium', 'luxury']),
    basePrice: z.number().positive('Base price must be positive'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    specs: z.object({
      length: z.string(),
      width: z.string(),
      height: z.string(),
      weight: z.string(),
      bedrooms: z.number().int().min(0),
      bathrooms: z.number().int().min(0),
      squareFootage: z.number().positive()
    }),
    features: z.array(z.string()),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    leadTime: z.number().int().min(1, 'Lead time must be at least 1 day')
  }),

  updateModel: z.object({
    modelCode: z.string().optional(),
    slug: z.string().optional(),
    name: z.string().optional(),
    category: z.enum(['standard', 'premium', 'luxury']).optional(),
    basePrice: z.number().positive().optional(),
    description: z.string().min(10).optional(),
    specs: z.object({
      length: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      weight: z.string().optional(),
      bedrooms: z.number().int().min(0).optional(),
      bathrooms: z.number().int().min(0).optional(),
      squareFootage: z.number().positive().optional()
    }).optional(),
    features: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    leadTime: z.number().int().min(1).optional()
  }),

  // Order operations
  createOrder: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    modelId: z.string().min(1, 'Model ID is required'),
    status: z.enum(['quote', 'pending', 'confirmed', 'production', 'ready', 'delivered', 'completed', 'cancelled']),
    stage: z.enum(['design', 'production', 'quality', 'delivery']),
    totalAmount: z.number().positive('Total amount must be positive'),
    basePrice: z.number().positive('Base price must be positive'),
    optionsTotal: z.number().min(0, 'Options total cannot be negative'),
    deliveryCost: z.number().min(0, 'Delivery cost cannot be negative'),
    taxAmount: z.number().min(0, 'Tax amount cannot be negative'),
    discountAmount: z.number().min(0, 'Discount amount cannot be negative'),
    deliveryDate: z.string().datetime().optional(),
    productionStartDate: z.string().datetime().optional(),
    estimatedCompletionDate: z.string().datetime().optional(),
    customization: z.object({
      selectedOptions: z.array(z.string()),
      customRequests: z.string().optional(),
      specialInstructions: z.string().optional()
    }).optional(),
    customerInfo: z.object({
      name: z.string().min(1, 'Customer name is required'),
      email: z.string().email('Valid email is required'),
      phone: z.string().min(1, 'Phone number is required'),
      address: z.string().min(1, 'Address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      zipCode: z.string().min(1, 'ZIP code is required')
    }),
    notes: z.string().optional()
  }),

  updateOrder: z.object({
    status: z.enum(['quote', 'pending', 'confirmed', 'production', 'ready', 'delivered', 'completed', 'cancelled']).optional(),
    stage: z.enum(['design', 'production', 'quality', 'delivery']).optional(),
    totalAmount: z.number().positive().optional(),
    deliveryDate: z.string().datetime().optional(),
    productionStartDate: z.string().datetime().optional(),
    estimatedCompletionDate: z.string().datetime().optional(),
    actualCompletionDate: z.string().datetime().optional(),
    notes: z.string().optional()
  }),

  // Customer operations
  createCustomer: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone number is required'),
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      zipCode: z.string().min(1, 'ZIP code is required'),
      country: z.string().default('USA')
    }),
    preferences: z.object({
      preferredContact: z.enum(['email', 'phone', 'text']).default('email'),
      newsletter: z.boolean().default(false),
      marketing: z.boolean().default(false)
    }).optional(),
    status: z.enum(['active', 'inactive', 'prospect', 'customer']).default('prospect'),
    source: z.enum(['website', 'referral', 'advertising', 'trade-show']).default('website'),
    notes: z.string().optional()
  }),

  updateCustomer: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    address: z.object({
      street: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      state: z.string().min(1).optional(),
      zipCode: z.string().min(1).optional(),
      country: z.string().optional()
    }).optional(),
    preferences: z.object({
      preferredContact: z.enum(['email', 'phone', 'text']).optional(),
      newsletter: z.boolean().optional(),
      marketing: z.boolean().optional()
    }).optional(),
    status: z.enum(['active', 'inactive', 'prospect', 'customer']).optional(),
    notes: z.string().optional()
  })
}

// ============================================================================
// DASHBOARD & OVERVIEW ENDPOINTS
// ============================================================================

// Dashboard routes are handled by mounted dashboardRouter below

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const collections = Object.values(COLLECTIONS)
    const stats = await Promise.all(
      collections.map(async (collectionName) => {
        try {
          const collection = await getCollection(collectionName)
          const count = await collection.countDocuments()
          const collectionStats = await collection.stats()
          
          return {
            name: collectionName,
            documentCount: count,
            size: collectionStats.size,
            avgDocumentSize: collectionStats.avgObjSize,
            indexes: collectionStats.nindexes
          }
        } catch (error) {
          return { name: collectionName, error: error.message }
        }
      })
    )

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Stats error:', error)
    res.status(500).json({ error: 'Failed to load system statistics' })
  }
})

// ============================================================================
// MODEL MANAGEMENT ENDPOINTS
// ============================================================================

// Get all models with pagination and filtering
router.get('/models', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', category, isActive } = req.query
    
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    // Build filter
    const filter = {}
    if (category) filter.category = category
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    
    // Get total count
    const total = await collection.countDocuments(filter)
    
    // Get models with pagination
    const models = await collection.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray()

    res.json({
      success: true,
      data: {
        models,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Models fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch models' })
  }
})

// Get single model by ID
router.get('/models/:id', async (req, res) => {
  try {
    const { id } = req.params
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    const model = await collection.findOne({ _id: toObjectIdOrString(id) })
    if (!model) {
      return res.status(404).json({ error: 'Model not found' })
    }

    res.json({
      success: true,
      data: model
    })
  } catch (error) {
    console.error('Model fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch model' })
  }
})

// Create new model
router.post('/models', async (req, res) => {
  try {
    const validatedData = adminSchemas.createModel.parse(req.body)
    
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    // Check if model code already exists
    const existingModel = await collection.findOne({ modelCode: validatedData.modelCode })
    if (existingModel) {
      return res.status(400).json({ error: 'Model code already exists' })
    }

    const newModel = {
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await collection.insertOne(newModel)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newModel
      }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Model creation error:', error)
    res.status(500).json({ error: 'Failed to create model' })
  }
})

// Update model
router.put('/models/:id', async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = adminSchemas.updateModel.parse(req.body)
    
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    const updateData = {
      ...validatedData,
      updatedAt: new Date()
    }

    const result = await collection.updateOne(
      { _id: toObjectIdOrString(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Model not found' })
    }

    res.json({
      success: true,
      message: 'Model updated successfully'
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Model update error:', error)
    res.status(500).json({ error: 'Failed to update model' })
  }
})

// Delete model
router.delete('/models/:id', async (req, res) => {
  try {
    const { id } = req.params
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    const result = await collection.deleteOne({ _id: toObjectIdOrString(id) })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Model not found' })
    }

    res.json({
      success: true,
      message: 'Model deleted successfully'
    })
  } catch (error) {
    console.error('Model deletion error:', error)
    res.status(500).json({ error: 'Failed to delete model' })
  }
})

// ============================================================================
// ORDER MANAGEMENT ENDPOINTS
// ============================================================================

// Get all orders with pagination and filtering
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', status, stage, paymentStatus, search } = req.query
    
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    // Build filter
    const filter = {}
    if (status) filter.status = status
    if (stage) filter.stage = stage
    if (paymentStatus) filter['payment.status'] = paymentStatus
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customerInfo.name': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } }
      ]
    }
    
    // Get total count
    const total = await collection.countDocuments(filter)
    
    // Get orders with pagination
    const orders = await collection.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray()

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Orders fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// Get single order by ID
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    const order = await collection.findOne({ _id: toObjectIdOrString(id) })
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('Order fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

// Create new order
router.post('/orders', async (req, res) => {
  try {
    const validatedData = adminSchemas.createOrder.parse(req.body)
    
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    const newOrder = {
      ...validatedData,
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await collection.insertOne(newOrder)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newOrder
      }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Order creation error:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// Update order
router.put('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = adminSchemas.updateOrder.parse(req.body)
    
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    const updateData = {
      ...validatedData,
      updatedAt: new Date()
    }

    const result = await collection.updateOne(
      { _id: toObjectIdOrString(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({
      success: true,
      message: 'Order updated successfully'
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Order update error:', error)
    res.status(500).json({ error: 'Failed to update order' })
  }
})

// Cancel order
router.patch('/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    const result = await collection.updateOne(
      { _id: toObjectIdOrString(id) },
      { 
        $set: { 
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    })
  } catch (error) {
    console.error('Order cancellation error:', error)
    res.status(500).json({ error: 'Failed to cancel order' })
  }
})

// ============================================================================
// CUSTOMER MANAGEMENT ENDPOINTS
// ============================================================================

// Get all customers with pagination and filtering
router.get('/customers', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', status, source, search } = req.query
    
    const collection = await getCollection(COLLECTIONS.CUSTOMERS)
    
    // Build filter
    const filter = {}
    if (status) filter.status = status
    if (source) filter.source = source
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    
    // Get total count
    const total = await collection.countDocuments(filter)
    
    // Get customers with pagination
    const customers = await collection.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray()

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Customers fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
})

// Get single customer by ID
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const collection = await getCollection(COLLECTIONS.CUSTOMERS)
    
    const customer = await collection.findOne({ _id: toObjectIdOrString(id) })
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    res.json({
      success: true,
      data: customer
    })
  } catch (error) {
    console.error('Customer fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch customer' })
  }
})

// Create new customer
router.post('/customers', async (req, res) => {
  try {
    const validatedData = adminSchemas.createCustomer.parse(req.body)
    
    const collection = await getCollection(COLLECTIONS.CUSTOMERS)
    
    const newCustomer = {
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await collection.insertOne(newCustomer)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newCustomer
      }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Customer creation error:', error)
    res.status(500).json({ error: 'Failed to create customer' })
  }
})

// Update customer
router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = adminSchemas.updateCustomer.parse(req.body)
    
    const collection = await getCollection(COLLECTIONS.CUSTOMERS)
    
    const updateData = {
      ...validatedData,
      updatedAt: new Date()
    }

    const result = await collection.updateOne(
      { _id: toObjectIdOrString(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    res.json({
      success: true,
      message: 'Customer updated successfully'
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Customer update error:', error)
    res.status(500).json({ error: 'Failed to update customer' })
  }
})

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// USER MANAGEMENT ENDPOINTS (handled by usersRouter)
// (Duplicate /me route removed; handled above before auth middleware)

// (content and analytics handled by subrouters)
// SENTINEL: admin-router-cleanup-2025-09-17

// Optional: lightweight debug ping
router.get('/_debug/ping', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

// ============================================================================
// ROUTER MOUNTING
// ============================================================================

// Defensive mount helper to avoid Express "apply" errors if a subrouter fails to load
function mountSafe(path, subrouter, name) {
  const isFn = typeof subrouter === 'function'
  if (!isFn) {
    console.error(`[ADMIN] Failed to mount ${name}: not a function`, { path, type: typeof subrouter })
    // Provide a diagnostic endpoint so requests don't crash the router
    router.use(path, (req, res) => {
      res.status(500).json({ error: `${name} router misconfigured` })
    })
    return
  }
  router.use(path, subrouter)
}

// Mount sub-routers safely
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

// Final defensive pass: replace any non-function layer handles to avoid
// Express attempting to call undefined.apply when a subrouter failed to load.
function hardenRouterLocal(r, label = 'admin') {
  try {
    const stack = r && r.stack
    if (!Array.isArray(stack)) return
    stack.forEach((layer, idx) => {
      // Repair layer handle
      if (typeof layer?.handle !== 'function') {
        const name = layer?.name || `layer_${idx}`
        console.error(`[ADMIN_HARDEN] Repaired non-function layer at ${label}[${idx}] (${name})`)
        layer.handle = (req, res) => res.status(500).json({ error: 'admin layer misconfigured', label, index: idx, name })
      }
      // Repair route method stacks
      const route = layer && layer.route
      if (route && Array.isArray(route.stack)) {
        route.stack.forEach((rLayer, rIdx) => {
          if (typeof rLayer?.handle !== 'function') {
            const m = rLayer?.method || 'use'
            console.error(`[ADMIN_HARDEN] Repaired non-function route handler at ${label}[${idx}]/route(${route?.path})#${m}[${rIdx}]`)
            rLayer.handle = (req, res) => res.status(500).json({ error: 'admin route handler misconfigured', path: route?.path, method: m, index: rIdx })
          }
        })
      }
      // Recurse into nested routers
      const nested = layer && layer.handle && layer.handle.stack ? layer.handle : null
      if (nested) hardenRouterLocal(nested, `${label}/${layer?.route?.path || layer?.name || idx}`)
    })
  } catch (e) {
    console.warn('[ADMIN_HARDEN] Failed:', e?.message)
  }
}

// Run hardening pass now
hardenRouterLocal(router, 'admin')

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for admin routes
router.use('*', (req, res) => {
  res.status(404).json({ error: 'Admin endpoint not found' })
})

// Error handler
router.use((error, req, res, next) => {
  console.error('Admin API error:', error)
  res.status(500).json({ error: 'Internal server error' })
})

export default router


// SENTINEL: admin-router-write-check 2025-09-17

