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
  PRODUCTION: 'production',
  BLOG_POSTS: 'blog_posts',
  POLICIES: 'policies',
  ANALYTICS: 'analytics',
  AI_INSIGHTS: 'ai_insights',
  REPORTS: 'reports',
  INTEGRATIONS: 'integrations',
  WORKFLOWS: 'workflows',
  WORKFLOW_EXECUTIONS: 'workflow_executions',
  SYSTEM_LOGS: 'system_logs',
  SYSTEM_ALERTS: 'system_alerts',
  DATA_EXPORTS: 'data_exports'
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
  ],

  // Blog posts collection
  BLOG_POSTS: [
    { key: { createdAt: -1 }, name: 'blog_created_desc' },
    { key: { status: 1 }, name: 'blog_status' },
    { key: { authorId: 1 }, name: 'blog_author' },
    { key: { publishDate: -1 }, name: 'blog_publish_date' }
  ],

  // Policies collection
  POLICIES: [
    { key: { type: 1 }, name: 'policy_type', unique: true },
    { key: { updatedAt: -1 }, name: 'policy_updated_desc' }
  ],

  // Analytics collection
  ANALYTICS: [
    { key: { date: -1 }, name: 'analytics_date' },
    { key: { type: 1 }, name: 'analytics_type' }
  ],

  // AI insights collection
  AI_INSIGHTS: [
    { key: { createdAt: -1 }, name: 'ai_insights_created_desc' },
    { key: { type: 1 }, name: 'ai_insights_type' },
    { key: { priority: 1 }, name: 'ai_insights_priority' },
    { key: { status: 1 }, name: 'ai_insights_status' }
  ],

  // Reports collection
  REPORTS: [
    { key: { createdAt: -1 }, name: 'reports_created_desc' },
    { key: { type: 1 }, name: 'reports_type' },
    { key: { isActive: 1 }, name: 'reports_active' },
    { key: { createdBy: 1 }, name: 'reports_creator' }
  ],

  // Integrations collection
  INTEGRATIONS: [
    { key: { createdAt: -1 }, name: 'integrations_created_desc' },
    { key: { type: 1 }, name: 'integrations_type' },
    { key: { status: 1 }, name: 'integrations_status' },
    { key: { isEnabled: 1 }, name: 'integrations_enabled' }
  ],

  // Workflows collection
  WORKFLOWS: [
    { key: { createdAt: -1 }, name: 'workflows_created_desc' },
    { key: { 'trigger.type': 1 }, name: 'workflows_trigger_type' },
    { key: { isActive: 1 }, name: 'workflows_active' },
    { key: { createdBy: 1 }, name: 'workflows_creator' }
  ],

  // Workflow executions collection
  WORKFLOW_EXECUTIONS: [
    { key: { executedAt: -1 }, name: 'workflow_executions_executed_desc' },
    { key: { workflowId: 1 }, name: 'workflow_executions_workflow' },
    { key: { status: 1 }, name: 'workflow_executions_status' },
    { key: { executedBy: 1 }, name: 'workflow_executions_executor' }
  ],

  // System logs collection
  SYSTEM_LOGS: [
    { key: { timestamp: -1 }, name: 'system_logs_timestamp' },
    { key: { level: 1 }, name: 'system_logs_level' },
    { key: { source: 1 }, name: 'system_logs_source' }
  ],

  // System alerts collection
  SYSTEM_ALERTS: [
    { key: { createdAt: -1 }, name: 'system_alerts_created_desc' },
    { key: { severity: 1 }, name: 'system_alerts_severity' },
    { key: { status: 1 }, name: 'system_alerts_status' },
    { key: { type: 1 }, name: 'system_alerts_type' }
  ],

  // Data exports collection
  DATA_EXPORTS: [
    { key: { createdAt: -1 }, name: 'data_exports_created_desc' },
    { key: { type: 1 }, name: 'data_exports_type' },
    { key: { format: 1 }, name: 'data_exports_format' },
    { key: { status: 1 }, name: 'data_exports_status' }
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
