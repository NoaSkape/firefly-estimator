// Comprehensive Admin API Router for Firefly Estimator
// Handles all admin operations with proper authentication and validation

import express from 'express'
import { z } from 'zod'
import { adminAuth, hasPermission, PERMISSIONS } from '../../lib/adminAuth.js'
import {
  getCollection,
  COLLECTIONS,
  initializeAdminDatabase
} from '../../lib/adminSchema.js'
import { validateRequest } from '../../lib/requestValidation.js'
import analyticsRouter from './analytics.js'

const router = express.Router()

// Initialize admin database on startup
initializeAdminDatabase().catch(console.error)

// ============================================================================
// MIDDLEWARE & VALIDATION
// ============================================================================

// Admin authentication middleware for all routes
router.use(adminAuth.validateAdminAccess.bind(adminAuth))

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

// Get admin dashboard overview
router.get('/dashboard', hasPermission(PERMISSIONS.FINANCIAL_VIEW), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    
    // Get key metrics
    const [orders, customers, models, financial] = await Promise.all([
      getCollection(COLLECTIONS.ORDERS),
      getCollection(COLLECTIONS.CUSTOMERS),
      getCollection(COLLECTIONS.MODELS),
      getCollection(COLLECTIONS.FINANCIAL)
    ])

    // Calculate metrics
    const totalOrders = await orders.countDocuments()
    const pendingOrders = await orders.countDocuments({ status: { $in: ['pending', 'confirmed', 'production'] } })
    const totalCustomers = await customers.countDocuments()
    const activeModels = await models.countDocuments({ isActive: true })
    
    // Financial metrics
    const revenuePipeline = await orders.aggregate([
      { $match: { status: { $in: ['confirmed', 'production', 'ready'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).toArray()
    
    const monthlyRevenue = await financial.aggregate([
      { 
        $match: { 
          type: 'payment',
          date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()

    // Recent activity
    const recentOrders = await orders.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()

    const recentCustomers = await customers.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()

    res.json({
      success: true,
      data: {
        metrics: {
          totalOrders,
          pendingOrders,
          totalCustomers,
          activeModels,
          revenuePipeline: revenuePipeline[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0
        },
        recentActivity: {
          orders: recentOrders,
          customers: recentCustomers
        }
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ error: 'Failed to load dashboard data' })
  }
})

// Get system statistics
router.get('/stats', hasPermission(PERMISSIONS.FINANCIAL_VIEW), async (req, res) => {
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
router.get('/models', hasPermission(PERMISSIONS.MODELS_VIEW), async (req, res) => {
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
    console.error('Get models error:', error)
    res.status(500).json({ error: 'Failed to fetch models' })
  }
})

// Get single model by ID
router.get('/models/:id', hasPermission(PERMISSIONS.MODELS_VIEW), async (req, res) => {
  try {
    const { id } = req.params
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    const model = await collection.findOne({ 
      $or: [{ _id: id }, { modelCode: id }, { slug: id }] 
    })
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' })
    }
    
    res.json({
      success: true,
      data: model
    })
  } catch (error) {
    console.error('Get model error:', error)
    res.status(500).json({ error: 'Failed to fetch model' })
  }
})

// Create new model
router.post('/models', hasPermission(PERMISSIONS.MODELS_CREATE), async (req, res) => {
  try {
    const validatedData = adminSchemas.createModel.parse(req.body)
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    // Check for duplicate modelCode or slug
    const existing = await collection.findOne({
      $or: [
        { modelCode: validatedData.modelCode },
        { slug: validatedData.slug }
      ]
    })
    
    if (existing) {
      return res.status(400).json({ 
        error: 'Model with this code or slug already exists' 
      })
    }
    
    // Create model
    const newModel = {
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.adminUser.userId,
      updatedBy: req.adminUser.userId
    }
    
    const result = await collection.insertOne(newModel)
    
    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...newModel
      }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      })
    }
    console.error('Create model error:', error)
    res.status(500).json({ error: 'Failed to create model' })
  }
})

// Update model
router.put('/models/:id', hasPermission(PERMISSIONS.MODELS_EDIT), async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = adminSchemas.updateModel.parse(req.body)
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    // Check if model exists
    const existing = await collection.findOne({ 
      $or: [{ _id: id }, { modelCode: id }, { slug: id }] 
    })
    
    if (!existing) {
      return res.status(404).json({ error: 'Model not found' })
    }
    
    // Update model
    const updateData = {
      ...validatedData,
      updatedAt: new Date(),
      updatedBy: req.adminUser.userId
    }
    
    const result = await collection.updateOne(
      { _id: existing._id },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Model not found' })
    }
    
    res.json({
      success: true,
      data: { message: 'Model updated successfully' }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      })
    }
    console.error('Update model error:', error)
    res.status(500).json({ error: 'Failed to update model' })
  }
})

// Delete model
router.delete('/models/:id', hasPermission(PERMISSIONS.MODELS_DELETE), async (req, res) => {
  try {
    const { id } = req.params
    const collection = await getCollection(COLLECTIONS.MODELS)
    
    // Check if model exists
    const existing = await collection.findOne({ 
      $or: [{ _id: id }, { modelCode: id }, { slug: id }] 
    })
    
    if (!existing) {
      return res.status(404).json({ error: 'Model not found' })
    }
    
    // Check if model has orders
    const ordersCollection = await getCollection(COLLECTIONS.ORDERS)
    const hasOrders = await ordersCollection.countDocuments({ modelId: existing._id })
    
    if (hasOrders > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete model with existing orders' 
      })
    }
    
    // Delete model
    const result = await collection.deleteOne({ _id: existing._id })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Model not found' })
    }
    
    res.json({
      success: true,
      data: { message: 'Model deleted successfully' }
    })
  } catch (error) {
    console.error('Delete model error:', error)
    res.status(500).json({ error: 'Failed to delete model' })
  }
})

// ============================================================================
// ORDER MANAGEMENT ENDPOINTS
// ============================================================================

// Get all orders with pagination and filtering
router.get('/orders', hasPermission(PERMISSIONS.ORDERS_VIEW), async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', status, customerId, modelId } = req.query
    
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    // Build filter
    const filter = {}
    if (status) filter.status = status
    if (customerId) filter.customerId = customerId
    if (modelId) filter.modelId = modelId
    
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
    console.error('Get orders error:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// Get single order by ID
router.get('/orders/:id', hasPermission(PERMISSIONS.ORDERS_VIEW), async (req, res) => {
  try {
    const { id } = req.params
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    const order = await collection.findOne({ 
      $or: [{ _id: id }, { orderId: id }] 
    })
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    res.json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('Get order error:', error)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

// Create new order
router.post('/orders', hasPermission(PERMISSIONS.ORDERS_CREATE), async (req, res) => {
  try {
    const validatedData = adminSchemas.createOrder.parse(req.body)
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    // Generate unique order ID
    const orderId = `FF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
    
    // Create order
    const newOrder = {
      ...validatedData,
      orderId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.adminUser.userId,
      updatedBy: req.adminUser.userId
    }
    
    const result = await collection.insertOne(newOrder)
    
    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...newOrder
      }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      })
    }
    console.error('Create order error:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// Update order
router.put('/orders/:id', hasPermission(PERMISSIONS.ORDERS_EDIT), async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = adminSchemas.updateOrder.parse(req.body)
    const collection = await getCollection(COLLECTIONS.ORDERS)
    
    // Check if order exists
    const existing = await collection.findOne({ 
      $or: [{ _id: id }, { orderId: id }] 
    })
    
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    // Update order
    const updateData = {
      ...validatedData,
      updatedAt: new Date(),
      updatedBy: req.adminUser.userId
    }
    
    const result = await collection.updateOne(
      { _id: existing._id },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    res.json({
      success: true,
      data: { message: 'Order updated successfully' }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      })
    }
    console.error('Update order error:', error)
    res.status(500).json({ error: 'Failed to update order' })
  }
})

// ============================================================================
// CUSTOMER MANAGEMENT ENDPOINTS
// ============================================================================

// Get all customers with pagination and filtering
router.get('/customers', hasPermission(PERMISSIONS.CUSTOMERS_VIEW), async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', status, source } = req.query
    
    const collection = await getCollection(COLLECTIONS.CUSTOMERS)
    
    // Build filter
    const filter = {}
    if (status) filter.status = status
    if (source) filter.source = source
    
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
    console.error('Get customers error:', error)
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
})

// Get single customer by ID
router.get('/customers/:id', hasPermission(PERMISSIONS.CUSTOMERS_VIEW), async (req, res) => {
  try {
    const { id } = req.params
    const collection = await getCollection(COLLECTIONS.CUSTOMERS)
    
    const customer = await collection.findOne({ 
      $or: [{ _id: id }, { customerId: id }, { email: id }] 
    })
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }
    
    res.json({
      success: true,
      data: customer
    })
  } catch (error) {
    console.error('Get customer error:', error)
    res.status(500).json({ error: 'Failed to fetch customer' })
  }
})

// Create new customer
router.post('/customers', hasPermission(PERMISSIONS.CUSTOMERS_EDIT), async (req, res) => {
  try {
    const validatedData = adminSchemas.createCustomer.parse(req.body)
    const collection = await getCollection(COLLECTIONS.CUSTOMERS)
    
    // Check for duplicate email
    const existing = await collection.findOne({ email: validatedData.email })
    
    if (existing) {
      return res.status(400).json({ 
        error: 'Customer with this email already exists' 
      })
    }
    
    // Generate unique customer ID
    const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
    
    // Create customer
    const newCustomer = {
      ...validatedData,
      customerId,
      totalOrders: 0,
      totalSpent: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await collection.insertOne(newCustomer)
    
    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...newCustomer
      }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      })
    }
    console.error('Create customer error:', error)
    res.status(500).json({ error: 'Failed to create customer' })
  }
})

// Update customer
router.put('/customers/:id', hasPermission(PERMISSIONS.CUSTOMERS_EDIT), async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = adminSchemas.updateCustomer.parse(req.body)
    const collection = await getCollection(COLLECTIONS.CUSTOMERS)
    
    // Check if customer exists
    const existing = await collection.findOne({ 
      $or: [{ _id: id }, { customerId: id }, { email: id }] 
    })
    
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' })
    }
    
    // Update customer
    const updateData = {
      ...validatedData,
      updatedAt: new Date()
    }
    
    const result = await collection.updateOne(
      { _id: existing._id },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Customer not found' })
    }
    
    res.json({
      success: true,
      data: { message: 'Customer updated successfully' }
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      })
    }
    console.error('Update customer error:', error)
    res.status(500).json({ error: 'Failed to update customer' })
  }
})

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

// Get admin users
router.get('/users', hasPermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
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
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Get current admin user info
router.get('/me', async (req, res) => {
  try {
    const userSummary = await adminAuth.getAdminUserSummary(req.adminUser.userId)
    
    res.json({
      success: true,
      data: userSummary
    })
  } catch (error) {
    console.error('Get user info error:', error)
    res.status(500).json({ error: 'Failed to fetch user information' })
  }
})

// ============================================================================
// EXPORT ENDPOINTS
// ============================================================================

// Export data to CSV/JSON
router.post('/export', hasPermission(PERMISSIONS.FINANCIAL_REPORTS), async (req, res) => {
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
            // ANALYTICS ROUTES
            // ============================================================================

            // Mount analytics router
            router.use('/analytics', analyticsRouter)

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
