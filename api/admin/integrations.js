// Integration Hub API
// Provides third-party service integrations and API management

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { adminAuth } from '../../lib/adminAuth.js'

const router = express.Router()

// Admin authentication middleware for all routes
router.use((req, res, next) => adminAuth.validateAdminAccess(req, res, next))

// Integration schema
const integrationSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['payment', 'shipping', 'marketing', 'analytics', 'communication', 'storage', 'other']),
  provider: z.string().min(1).max(100),
  status: z.enum(['active', 'inactive', 'error', 'pending']).default('pending'),
  configuration: z.record(z.any()),
  credentials: z.record(z.string()).optional(),
  webhookUrl: z.string().url().optional(),
  isEnabled: z.boolean().default(false),
  lastSyncAt: z.string().datetime().optional(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'manual']).default('manual')
})

// Get all integrations
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      isEnabled,
      sort = 'createdAt',
      order = 'desc'
    } = req.query

    const db = await getDb()
    const integrationsCollection = db.collection('integrations')

    // Build filter
    const filter = {}
    if (type) filter.type = type
    if (status) filter.status = status
    if (isEnabled !== undefined) filter.isEnabled = isEnabled === 'true'

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get integrations
    const integrations = await integrationsCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await integrationsCollection.countDocuments(filter)

    // Get integration statistics
    const stats = await integrationsCollection.aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    res.json({
      success: true,
      data: {
        integrations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        statistics: {
          byType: stats
        }
      }
    })
  } catch (error) {
    console.error('Integrations API error:', error)
    res.status(500).json({ error: 'Failed to fetch integrations' })
  }
})

// Get single integration
router.get('/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params
    const db = await getDb()
    const integrationsCollection = db.collection('integrations')

    const integration = await integrationsCollection.findOne({ _id: integrationId })
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    // Remove sensitive credentials from response
    const safeIntegration = { ...integration }
    delete safeIntegration.credentials

    res.json({
      success: true,
      data: safeIntegration
    })
  } catch (error) {
    console.error('Integration detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch integration' })
  }
})

// Create new integration
router.post('/', async (req, res) => {
  try {
    const integrationData = await validateRequest(req, integrationSchema)
    const db = await getDb()
    const integrationsCollection = db.collection('integrations')

    const newIntegration = {
      ...integrationData,
      createdBy: req.adminUser?.userId || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncAt: null,
      syncCount: 0,
      errorCount: 0
    }

    const result = await integrationsCollection.insertOne(newIntegration)

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'integration',
      resourceId: result.insertedId,
      action: 'create',
      changes: integrationData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newIntegration }
    })
  } catch (error) {
    console.error('Integration creation API error:', error)
    res.status(500).json({ error: 'Failed to create integration' })
  }
})

// Update integration
router.patch('/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params
    const updateData = await validateRequest(req, integrationSchema.partial())
    
    const db = await getDb()
    const integrationsCollection = db.collection('integrations')

    const existingIntegration = await integrationsCollection.findOne({ _id: integrationId })
    if (!existingIntegration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    }

    const result = await integrationsCollection.updateOne(
      { _id: integrationId },
      { $set: updateFields }
    )

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'No changes made to integration' })
    }

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'integration',
      resourceId: integrationId,
      action: 'update',
      changes: updateData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.json({
      success: true,
      message: 'Integration updated successfully'
    })
  } catch (error) {
    console.error('Integration update API error:', error)
    res.status(500).json({ error: 'Failed to update integration' })
  }
})

// Test integration connection
router.post('/:integrationId/test', async (req, res) => {
  try {
    const { integrationId } = req.params
    const db = await getDb()
    const integrationsCollection = db.collection('integrations')

    const integration = await integrationsCollection.findOne({ _id: integrationId })
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    // Test the integration based on type
    const testResult = await testIntegration(integration)

    // Update integration status
    await integrationsCollection.updateOne(
      { _id: integrationId },
      { 
        $set: { 
          status: testResult.success ? 'active' : 'error',
          lastTestAt: new Date(),
          lastTestResult: testResult
        }
      }
    )

    res.json({
      success: true,
      data: testResult
    })
  } catch (error) {
    console.error('Integration test API error:', error)
    res.status(500).json({ error: 'Failed to test integration' })
  }
})

// Test integration connection
async function testIntegration(integration) {
  try {
    switch (integration.type) {
      case 'payment':
        return await testPaymentIntegration(integration)
      case 'shipping':
        return await testShippingIntegration(integration)
      case 'marketing':
        return await testMarketingIntegration(integration)
      case 'analytics':
        return await testAnalyticsIntegration(integration)
      case 'communication':
        return await testCommunicationIntegration(integration)
      default:
        return {
          success: false,
          message: 'Integration type not supported for testing',
          timestamp: new Date()
        }
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      timestamp: new Date()
    }
  }
}

// Test payment integration
async function testPaymentIntegration(integration) {
  // Mock payment integration test
  return {
    success: true,
    message: 'Payment integration connection successful',
    timestamp: new Date(),
    details: {
      provider: integration.provider,
      status: 'connected'
    }
  }
}

// Test shipping integration
async function testShippingIntegration(integration) {
  // Mock shipping integration test
  return {
    success: true,
    message: 'Shipping integration connection successful',
    timestamp: new Date(),
    details: {
      provider: integration.provider,
      status: 'connected'
    }
  }
}

// Test marketing integration
async function testMarketingIntegration(integration) {
  // Mock marketing integration test
  return {
    success: true,
    message: 'Marketing integration connection successful',
    timestamp: new Date(),
    details: {
      provider: integration.provider,
      status: 'connected'
    }
  }
}

// Test analytics integration
async function testAnalyticsIntegration(integration) {
  // Mock analytics integration test
  return {
    success: true,
    message: 'Analytics integration connection successful',
    timestamp: new Date(),
    details: {
      provider: integration.provider,
      status: 'connected'
    }
  }
}

// Test communication integration
async function testCommunicationIntegration(integration) {
  // Mock communication integration test
  return {
    success: true,
    message: 'Communication integration connection successful',
    timestamp: new Date(),
    details: {
      provider: integration.provider,
      status: 'connected'
    }
  }
}

// Sync integration data
router.post('/:integrationId/sync', async (req, res) => {
  try {
    const { integrationId } = req.params
    const db = await getDb()
    const integrationsCollection = db.collection('integrations')

    const integration = await integrationsCollection.findOne({ _id: integrationId })
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    if (!integration.isEnabled) {
      return res.status(400).json({ error: 'Integration is not enabled' })
    }

    // Perform sync based on integration type
    const syncResult = await syncIntegrationData(integration)

    // Update integration sync statistics
    await integrationsCollection.updateOne(
      { _id: integrationId },
      { 
        $set: { 
          lastSyncAt: new Date(),
          lastSyncResult: syncResult
        },
        $inc: { syncCount: 1 }
      }
    )

    res.json({
      success: true,
      data: syncResult
    })
  } catch (error) {
    console.error('Integration sync API error:', error)
    res.status(500).json({ error: 'Failed to sync integration' })
  }
})

// Sync integration data
async function syncIntegrationData(integration) {
  try {
    switch (integration.type) {
      case 'payment':
        return await syncPaymentData(integration)
      case 'shipping':
        return await syncShippingData(integration)
      case 'marketing':
        return await syncMarketingData(integration)
      case 'analytics':
        return await syncAnalyticsData(integration)
      default:
        return {
          success: false,
          message: 'Integration type not supported for syncing',
          timestamp: new Date()
        }
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      timestamp: new Date()
    }
  }
}

// Sync payment data
async function syncPaymentData(integration) {
  // Mock payment data sync
  return {
    success: true,
    message: 'Payment data synced successfully',
    timestamp: new Date(),
    recordsProcessed: 150,
    recordsUpdated: 12,
    recordsCreated: 3
  }
}

// Sync shipping data
async function syncShippingData(integration) {
  // Mock shipping data sync
  return {
    success: true,
    message: 'Shipping data synced successfully',
    timestamp: new Date(),
    recordsProcessed: 75,
    recordsUpdated: 8,
    recordsCreated: 2
  }
}

// Sync marketing data
async function syncMarketingData(integration) {
  // Mock marketing data sync
  return {
    success: true,
    message: 'Marketing data synced successfully',
    timestamp: new Date(),
    recordsProcessed: 200,
    recordsUpdated: 15,
    recordsCreated: 5
  }
}

// Sync analytics data
async function syncAnalyticsData(integration) {
  // Mock analytics data sync
  return {
    success: true,
    message: 'Analytics data synced successfully',
    timestamp: new Date(),
    recordsProcessed: 500,
    recordsUpdated: 25,
    recordsCreated: 10
  }
}

// Get integration templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'stripe-payment',
        name: 'Stripe Payment Integration',
        type: 'payment',
        provider: 'Stripe',
        description: 'Process payments and manage subscriptions',
        configuration: {
          apiKey: 'sk_test_...',
          webhookSecret: 'whsec_...',
          currency: 'USD'
        }
      },
      {
        id: 'fedex-shipping',
        name: 'FedEx Shipping Integration',
        type: 'shipping',
        provider: 'FedEx',
        description: 'Calculate shipping rates and track packages',
        configuration: {
          apiKey: 'fedex_api_key',
          accountNumber: '123456789',
          meterNumber: '987654321'
        }
      },
      {
        id: 'mailchimp-marketing',
        name: 'Mailchimp Marketing Integration',
        type: 'marketing',
        provider: 'Mailchimp',
        description: 'Manage email campaigns and customer segments',
        configuration: {
          apiKey: 'mailchimp_api_key',
          listId: 'audience_id',
          serverPrefix: 'us1'
        }
      },
      {
        id: 'google-analytics',
        name: 'Google Analytics Integration',
        type: 'analytics',
        provider: 'Google',
        description: 'Track website performance and user behavior',
        configuration: {
          trackingId: 'GA-XXXXXXXXX',
          apiKey: 'google_api_key',
          viewId: '123456789'
        }
      }
    ]

    res.json({
      success: true,
      data: templates
    })
  } catch (error) {
    console.error('Integration templates API error:', error)
    res.status(500).json({ error: 'Failed to fetch integration templates' })
  }
})

// Delete integration
router.delete('/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params
    const db = await getDb()
    const integrationsCollection = db.collection('integrations')

    const integration = await integrationsCollection.findOne({ _id: integrationId })
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    await integrationsCollection.deleteOne({ _id: integrationId })

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'integration',
      resourceId: integrationId,
      action: 'delete',
      changes: { deleted: true },
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'warning'
    })

    res.json({
      success: true,
      message: 'Integration deleted successfully'
    })
  } catch (error) {
    console.error('Integration deletion API error:', error)
    res.status(500).json({ error: 'Failed to delete integration' })
  }
})

export default router
