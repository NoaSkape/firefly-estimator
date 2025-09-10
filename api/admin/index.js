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

const router = express.Router()

// Initialize admin database on startup
initializeAdminDatabase().catch(console.error)

// ============================================================================
// MIDDLEWARE & VALIDATION
// ============================================================================

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

// Admin authentication middleware for all routes
router.use(async (req, res, next) => {
  if (process.env.ADMIN_AUTH_DISABLED === 'true') {
    // Add mock admin user for development
    req.adminUser = {
      userId: 'dev-admin',
      role: 'admin',
      permissions: ['FINANCIAL_VIEW', 'BUILD_EDIT', 'MODEL_EDIT', 'USER_MANAGE', 'BLOG_EDIT']
    }
    return next()
  }
  
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers?.authorization || req.headers?.Authorization
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' })
    }

    // Verify token with Clerk
    const { verifyToken, createClerkClient } = await import('@clerk/backend')
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    })
    
    const userId = verified?.sub || verified?.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' })
    }

    // Check admin status
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const user = await clerk.users.getUser(userId)
    
    // Check role in public metadata
    const isAdminByRole = user.publicMetadata?.role === 'admin'
    
    // Check email allowlist
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    const userEmails = user.emailAddresses?.map(e => e.emailAddress.toLowerCase()) || []
    const isAdminByEmail = adminEmails.length > 0 && userEmails.some(email => adminEmails.includes(email))
    
    const isAdmin = isAdminByRole || isAdminByEmail
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Add user info to request
    req.adminUser = {
      userId,
      role: 'admin',
      permissions: ['FINANCIAL_VIEW', 'BUILD_EDIT', 'MODEL_EDIT', 'USER_MANAGE', 'BLOG_EDIT']
    }

    next()
  } catch (error) {
    console.error('Admin auth error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
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
    
    const model = await collection.findOne({ _id: id })
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
      { _id: id },
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
    
    const result = await collection.deleteOne({ _id: id })
    
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
    
    const order = await collection.findOne({ _id: id })
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
      { _id: id },
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
      { _id: id },
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
    
    const customer = await collection.findOne({ _id: id })
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
      { _id: id },
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
// ============================================================================

// Get admin users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive } = req.query
    
    const collection = await getCollection(COLLECTIONS.USERS)
    
    // Build filter
    const filter = {}
    if (role) filter.role = role
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    
    // Get total count
    const total = await collection.countDocuments(filter)
    
    // Get users with pagination
    const users = await collection.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray()

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Users fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Get current admin user information
router.get('/me', async (req, res) => {
  try {
    const { userId } = req.adminUser
    
    // Use the existing auth system to get user info
    const { createClerkClient } = await import('@clerk/backend')
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    
    const user = await clerk.users.getUser(userId)
    const userInfo = {
      id: userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.primaryEmailAddress?.emailAddress,
      role: 'admin',
      lastLogin: user.lastSignInAt,
      permissions: ['FINANCIAL_VIEW', 'BUILD_EDIT', 'MODEL_EDIT', 'USER_MANAGE', 'BLOG_EDIT']
    }
    
    res.json({ success: true, data: userInfo })
  } catch (error) {
    console.error('Get user info error:', error)
    res.status(500).json({ error: 'Failed to fetch user information' })
  }
})

// ============================================================================
// MISSING ENDPOINTS FOR FRONTEND INTEGRATION
// ============================================================================

// GET /api/admin/users/detailed - Detailed user analytics
router.get('/users/detailed', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const db = await getDb()
    
    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)
    
    // Get user statistics
    const totalUsers = await db.collection('users').countDocuments()
    const newUsers = await db.collection('users').countDocuments({
      createdAt: { $gte: startDate }
    })
    
    // Get user activity (using lastSignInAt as proxy for activity)
    const activeUsers = await db.collection('users').countDocuments({
      lastSignInAt: { $gte: startDate }
    })
    
    res.json({
      success: true,
      data: {
        totalUsers,
        newUsers,
        activeUsers,
        conversionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
      }
    })
  } catch (error) {
    console.error('Users detailed error:', error)
    res.status(500).json({ error: 'Failed to fetch user details' })
  }
})

// GET /api/admin/orders/paid - Paid orders analytics
router.get('/orders/paid', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const db = await getDb()
    
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)
    
    // Get paid orders
    const paidOrders = await db.collection('orders').find({
      paymentStatus: 'paid',
      createdAt: { $gte: startDate }
    }).toArray()
    
    const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0
    
    res.json({
      success: true,
      data: {
        totalOrders: paidOrders.length,
        totalRevenue,
        averageOrderValue,
        orders: paidOrders.slice(0, 10) // Recent orders
      }
    })
  } catch (error) {
    console.error('Paid orders error:', error)
    res.status(500).json({ error: 'Failed to fetch paid orders' })
  }
})

// GET /api/admin/financial/revenue - Revenue analytics
router.get('/financial/revenue', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const db = await getDb()
    
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)
    
    // Get revenue data
    const orders = await db.collection('orders').find({
      paymentStatus: 'paid',
      createdAt: { $gte: startDate }
    }).toArray()
    
    const dailyRevenue = {}
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0]
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.totalAmount || 0)
    })
    
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    
    res.json({
      success: true,
      data: {
        totalRevenue,
        dailyRevenue,
        orderCount: orders.length,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
      }
    })
  } catch (error) {
    console.error('Revenue error:', error)
    res.status(500).json({ error: 'Failed to fetch revenue data' })
  }
})

// GET /api/admin/builds/active - Active builds tracking
router.get('/builds/active', async (req, res) => {
  try {
    const db = await getDb()
    
    // Get active builds
    const activeBuilds = await db.collection('builds').find({
      status: { $in: ['production', 'quality', 'ready'] }
    }).toArray()
    
    // Get build statistics
    const buildStats = {
      inProduction: activeBuilds.filter(b => b.status === 'production').length,
      inQuality: activeBuilds.filter(b => b.status === 'quality').length,
      readyForDelivery: activeBuilds.filter(b => b.status === 'ready').length,
      totalActive: activeBuilds.length
    }
    
    res.json({
      success: true,
      data: {
        ...buildStats,
        builds: activeBuilds.slice(0, 10) // Recent builds
      }
    })
  } catch (error) {
    console.error('Active builds error:', error)
    res.status(500).json({ error: 'Failed to fetch active builds' })
  }
})

// ============================================================================
// CONTENT MANAGEMENT ENDPOINTS
// ============================================================================

// Blog Management
router.get('/blog', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const db = await getDb()
    
    const filter = status ? { status } : {}
    const posts = await db.collection('blog_posts')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray()
    
    const total = await db.collection('blog_posts').countDocuments(filter)
    
    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Blog fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch blog posts' })
  }
})

router.post('/blog', async (req, res) => {
  try {
    const { title, content, status = 'draft', publishDate } = req.body
    const db = await getDb()
    
    const newPost = {
      title,
      content,
      status,
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: req.adminUser.userId
    }
    
    const result = await db.collection('blog_posts').insertOne(newPost)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newPost
      }
    })
  } catch (error) {
    console.error('Blog creation error:', error)
    res.status(500).json({ error: 'Failed to create blog post' })
  }
})

router.put('/blog/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, status, publishDate } = req.body
    const db = await getDb()
    
    const updateData = {
      title,
      content,
      status,
      publishDate: publishDate ? new Date(publishDate) : undefined,
      updatedAt: new Date(),
      updatedBy: req.adminUser.userId
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })
    
    const result = await db.collection('blog_posts').updateOne(
      { _id: id },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Blog post not found' })
    }
    
    res.json({
      success: true,
      message: 'Blog post updated successfully'
    })
  } catch (error) {
    console.error('Blog update error:', error)
    res.status(500).json({ error: 'Failed to update blog post' })
  }
})

router.delete('/blog/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    const result = await db.collection('blog_posts').deleteOne({ _id: id })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Blog post not found' })
    }
    
    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    })
  } catch (error) {
    console.error('Blog deletion error:', error)
    res.status(500).json({ error: 'Failed to delete blog post' })
  }
})

// Drafts Management
router.get('/drafts', async (req, res) => {
  try {
    const db = await getDb()
    const drafts = await db.collection('blog_posts')
      .find({ status: 'draft' })
      .sort({ updatedAt: -1 })
      .toArray()
    
    res.json({
      success: true,
      data: drafts
    })
  } catch (error) {
    console.error('Drafts fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch drafts' })
  }
})

// Policy Management
router.get('/policies', async (req, res) => {
  try {
    const db = await getDb()
    const policies = await db.collection('policies').find({}).toArray()
    
    res.json({
      success: true,
      data: policies
    })
  } catch (error) {
    console.error('Policies fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch policies' })
  }
})

router.put('/policies/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params
    const { content } = req.body
    const db = await getDb()
    
    const result = await db.collection('policies').updateOne(
      { _id: policyId },
      { 
        $set: { 
          content,
          updatedAt: new Date(),
          updatedBy: req.adminUser.userId
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Policy not found' })
    }
    
    res.json({
      success: true,
      message: 'Policy updated successfully'
    })
  } catch (error) {
    console.error('Policy update error:', error)
    res.status(500).json({ error: 'Failed to update policy' })
  }
})

// ============================================================================
// EXPORT ENDPOINTS
// ============================================================================

// Export data to CSV/JSON
router.post('/export', async (req, res) => {
  try {
    const { collection, format = 'json', filters = {}, fields = [] } = req.body
    
    if (!Object.values(COLLECTIONS).includes(collection)) {
      return res.status(400).json({ error: 'Invalid collection specified' })
    }
    
    const dataCollection = await getCollection(collection)
    
    // Apply filters
    const query = filters || {}
    const data = await dataCollection.find(query).toArray()
    
    // Filter fields if specified
    let exportData = data
    if (fields.length > 0) {
      exportData = data.map(item => {
        const filtered = {}
        fields.forEach(field => {
          if (item[field] !== undefined) {
            filtered[field] = item[field]
          }
        })
        return filtered
      })
    }
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = fields.length > 0 ? fields : Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header]
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          }).join(',')
        )
      ].join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${collection}-${Date.now()}.csv"`)
      res.send(csvContent)
    } else {
      // Return JSON
      res.json({
        success: true,
        data: exportData
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to export data' })
  }
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
