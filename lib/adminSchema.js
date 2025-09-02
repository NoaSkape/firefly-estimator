// Admin Database Schema and Indexes for Firefly Estimator
// This file defines the complete database structure for the admin system

import { getDb } from './db.js'

// Collection names
export const COLLECTIONS = {
  MODELS: 'models',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  USERS: 'users',
  INVENTORY: 'inventory',
  FINANCIAL: 'financial',
  DELIVERY: 'delivery',
  REPORTS: 'reports',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  DOCUMENTS: 'documents',
  SUPPLIERS: 'suppliers',
  PRODUCTION: 'production'
}

// Database indexes for optimal performance
export const INDEXES = {
  // Models collection
  MODELS: [
    { key: { modelCode: 1 }, unique: true, name: 'modelCode_unique' },
    { key: { slug: 1 }, unique: true, name: 'slug_unique' },
    { key: { category: 1 }, name: 'category_index' },
    { key: { basePrice: 1 }, name: 'price_index' },
    { key: { isActive: 1 }, name: 'active_models' },
    { key: { createdAt: -1 }, name: 'created_desc' },
    { key: { updatedAt: -1 }, name: 'updated_desc' }
  ],

  // Orders collection
  ORDERS: [
    { key: { orderId: 1 }, unique: true, name: 'orderId_unique' },
    { key: { customerId: 1 }, name: 'customer_orders' },
    { key: { modelId: 1 }, name: 'model_orders' },
    { key: { status: 1 }, name: 'order_status' },
    { key: { createdAt: -1 }, name: 'order_created_desc' },
    { key: { updatedAt: -1 }, name: 'order_updated_desc' },
    { key: { deliveryDate: 1 }, name: 'delivery_date' },
    { key: { totalAmount: 1 }, name: 'order_amount' },
    { key: { paymentStatus: 1 }, name: 'payment_status' }
  ],

  // Customers collection
  CUSTOMERS: [
    { key: { customerId: 1 }, unique: true, name: 'customerId_unique' },
    { key: { email: 1 }, unique: true, name: 'email_unique' },
    { key: { phone: 1 }, name: 'phone_index' },
    { key: { createdAt: -1 }, name: 'customer_created_desc' },
    { key: { lastActivity: -1 }, name: 'last_activity' },
    { key: { status: 1 }, name: 'customer_status' }
  ],

  // Users collection (admin/staff)
  USERS: [
    { key: { userId: 1 }, unique: true, name: 'userId_unique' },
    { key: { email: 1 }, unique: true, name: 'user_email_unique' },
    { key: { role: 1 }, name: 'user_role' },
    { key: { isActive: 1 }, name: 'active_users' },
    { key: { lastLogin: -1 }, name: 'last_login' }
  ],

  // Inventory collection
  INVENTORY: [
    { key: { modelId: 1 }, name: 'inventory_model' },
    { key: { supplierId: 1 }, name: 'inventory_supplier' },
    { key: { status: 1 }, name: 'inventory_status' },
    { key: { reorderPoint: 1 }, name: 'reorder_point' },
    { key: { lastUpdated: -1 }, name: 'inventory_updated' }
  ],

  // Financial collection
  FINANCIAL: [
    { key: { transactionId: 1 }, unique: true, name: 'transactionId_unique' },
    { key: { orderId: 1 }, name: 'financial_order' },
    { key: { customerId: 1 }, name: 'financial_customer' },
    { key: { type: 1 }, name: 'transaction_type' },
    { key: { date: -1 }, name: 'transaction_date' },
    { key: { amount: 1 }, name: 'transaction_amount' }
  ],

  // Delivery collection
  DELIVERY: [
    { key: { deliveryId: 1 }, unique: true, name: 'deliveryId_unique' },
    { key: { orderId: 1 }, name: 'delivery_order' },
    { key: { status: 1 }, name: 'delivery_status' },
    { key: { scheduledDate: 1 }, name: 'delivery_scheduled' },
    { key: { driverId: 1 }, name: 'delivery_driver' }
  ],

  // Audit logs collection
  AUDIT_LOGS: [
    { key: { timestamp: -1 }, name: 'audit_timestamp' },
    { key: { userId: 1 }, name: 'audit_user' },
    { key: { action: 1 }, name: 'audit_action' },
    { key: { resource: 1 }, name: 'audit_resource' },
    { key: { severity: 1 }, name: 'audit_severity' }
  ]
}

// Data schemas for validation
export const SCHEMAS = {
  MODEL: {
    _id: 'ObjectId',
    modelCode: 'String', // e.g., 'FF-20', 'FF-24'
    slug: 'String', // e.g., 'firefly-20', 'firefly-24'
    name: 'String',
    category: 'String', // 'standard', 'premium', 'luxury'
    basePrice: 'Number',
    description: 'String',
    specs: {
      length: 'String',
      width: 'String',
      height: 'String',
      weight: 'String',
      bedrooms: 'Number',
      bathrooms: 'Number',
      squareFootage: 'Number'
    },
    features: ['String'],
    images: [{
      url: 'String',
      alt: 'String',
      order: 'Number',
      isPrimary: 'Boolean'
    }],
    options: [{
      id: 'String',
      name: 'String',
      description: 'String',
      price: 'Number',
      category: 'String'
    }],
    isActive: 'Boolean',
    isFeatured: 'Boolean',
    leadTime: 'Number', // days
    createdAt: 'Date',
    updatedAt: 'Date',
    createdBy: 'String',
    updatedBy: 'String'
  },

  ORDER: {
    _id: 'ObjectId',
    orderId: 'String', // unique order number
    customerId: 'String',
    modelId: 'String',
    status: 'String', // 'quote', 'pending', 'confirmed', 'production', 'ready', 'delivered', 'completed', 'cancelled'
    stage: 'String', // 'design', 'production', 'quality', 'delivery'
    totalAmount: 'Number',
    basePrice: 'Number',
    optionsTotal: 'Number',
    deliveryCost: 'Number',
    taxAmount: 'Number',
    discountAmount: 'Number',
    paymentStatus: 'String', // 'pending', 'partial', 'paid', 'refunded'
    paymentMethod: 'String',
    deliveryDate: 'Date',
    productionStartDate: 'Date',
    estimatedCompletionDate: 'Date',
    actualCompletionDate: 'Date',
    customization: {
      selectedOptions: ['String'],
      customRequests: 'String',
      specialInstructions: 'String'
    },
    customerInfo: {
      name: 'String',
      email: 'String',
      phone: 'String',
      address: 'String',
      city: 'String',
      state: 'String',
      zipCode: 'String'
    },
    notes: 'String',
    createdAt: 'Date',
    updatedAt: 'Date',
    createdBy: 'String',
    updatedBy: 'String'
  },

  CUSTOMER: {
    _id: 'ObjectId',
    customerId: 'String',
    firstName: 'String',
    lastName: 'String',
    email: 'String',
    phone: 'String',
    address: {
      street: 'String',
      city: 'String',
      state: 'String',
      zipCode: 'String',
      country: 'String'
    },
    preferences: {
      preferredContact: 'String', // 'email', 'phone', 'text'
      newsletter: 'Boolean',
      marketing: 'Boolean'
    },
    status: 'String', // 'active', 'inactive', 'prospect', 'customer'
    source: 'String', // 'website', 'referral', 'advertising', 'trade-show'
    totalOrders: 'Number',
    totalSpent: 'Number',
    lastOrderDate: 'Date',
    lastActivity: 'Date',
    notes: 'String',
    createdAt: 'Date',
    updatedAt: 'Date'
  },

  USER: {
    _id: 'ObjectId',
    userId: 'String',
    email: 'String',
    firstName: 'String',
    lastName: 'String',
    role: 'String', // 'admin', 'staff', 'viewer'
    permissions: ['String'],
    isActive: 'Boolean',
    lastLogin: 'Date',
    loginCount: 'Number',
    createdAt: 'Date',
    updatedAt: 'Date',
    createdBy: 'String'
  }
}

// Initialize database with proper indexes
export async function initializeAdminDatabase() {
  try {
    const db = await getDb()
    console.log('🔧 Initializing admin database indexes...')

    // Create indexes for each collection
    for (const [collectionName, indexes] of Object.entries(INDEXES)) {
      const collection = db.collection(collectionName)
      
      for (const index of indexes) {
        try {
          await collection.createIndex(index.key, {
            unique: index.unique || false,
            name: index.name
          })
          console.log(`✅ Created index: ${index.name} on ${collectionName}`)
        } catch (error) {
          if (error.code === 85) { // Index already exists
            console.log(`ℹ️ Index already exists: ${index.name} on ${collectionName}`)
          } else {
            console.error(`❌ Failed to create index ${index.name} on ${collectionName}:`, error.message)
          }
        }
      }
    }

    console.log('🎉 Admin database initialization complete!')
    return true
  } catch (error) {
    console.error('💥 Admin database initialization failed:', error)
    throw error
  }
}

// Database utility functions
export async function getCollection(collectionName) {
  const db = await getDb()
  return db.collection(collectionName)
}

export async function getCollectionStats(collectionName) {
  try {
    const collection = await getCollection(collectionName)
    const count = await collection.countDocuments()
    const stats = await collection.stats()
    
    return {
      name: collectionName,
      documentCount: count,
      size: stats.size,
      avgDocumentSize: stats.avgObjSize,
      indexes: stats.nindexes
    }
  } catch (error) {
    console.error(`Error getting stats for ${collectionName}:`, error)
    return { name: collectionName, error: error.message }
  }
}

export async function getAllCollectionStats() {
  const collections = Object.values(COLLECTIONS)
  const stats = await Promise.all(collections.map(getCollectionStats))
  return stats
}

// Export everything
export default {
  COLLECTIONS,
  INDEXES,
  SCHEMAS,
  initializeAdminDatabase,
  getCollection,
  getCollectionStats,
  getAllCollectionStats
}
