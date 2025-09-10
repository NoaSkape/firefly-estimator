// Workflow Automation System API
// Provides business process automation and workflow management

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { adminAuth } from '../../lib/adminAuth.js'

const router = express.Router()

// Admin authentication middleware for all routes
router.use((req, res, next) => adminAuth.validateAdminAccess(req, res, next))

// Workflow schema
const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  trigger: z.object({
    type: z.enum(['event', 'schedule', 'manual', 'webhook']),
    event: z.string().optional(),
    schedule: z.string().optional(),
    conditions: z.record(z.any()).optional()
  }),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['action', 'condition', 'delay', 'notification', 'webhook']),
    config: z.record(z.any()),
    nextStep: z.string().optional(),
    onError: z.string().optional()
  })).min(1),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional()
})

// Get all workflows
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      isActive,
      triggerType,
      sort = 'createdAt',
      order = 'desc'
    } = req.query

    const db = await getDb()
    const workflowsCollection = db.collection('workflows')

    // Build filter
    const filter = {}
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    if (triggerType) filter['trigger.type'] = triggerType

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get workflows
    const workflows = await workflowsCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await workflowsCollection.countDocuments(filter)

    // Get workflow statistics
    const stats = await workflowsCollection.aggregate([
      { $group: {
        _id: '$trigger.type',
        count: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    res.json({
      success: true,
      data: {
        workflows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        statistics: {
          byTriggerType: stats
        }
      }
    })
  } catch (error) {
    console.error('Workflows API error:', error)
    res.status(500).json({ error: 'Failed to fetch workflows' })
  }
})

// Get single workflow
router.get('/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params
    const db = await getDb()
    const workflowsCollection = db.collection('workflows')

    const workflow = await workflowsCollection.findOne({ _id: workflowId })
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    res.json({
      success: true,
      data: workflow
    })
  } catch (error) {
    console.error('Workflow detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch workflow' })
  }
})

// Create new workflow
router.post('/', async (req, res) => {
  try {
    const workflowData = await validateRequest(req, workflowSchema)
    const db = await getDb()
    const workflowsCollection = db.collection('workflows')

    const newWorkflow = {
      ...workflowData,
      createdBy: req.adminUser?.userId || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      successCount: 0,
      errorCount: 0,
      lastExecutedAt: null
    }

    const result = await workflowsCollection.insertOne(newWorkflow)

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'workflow',
      resourceId: result.insertedId,
      action: 'create',
      changes: workflowData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newWorkflow }
    })
  } catch (error) {
    console.error('Workflow creation API error:', error)
    res.status(500).json({ error: 'Failed to create workflow' })
  }
})

// Update workflow
router.patch('/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params
    const updateData = await validateRequest(req, workflowSchema.partial())
    
    const db = await getDb()
    const workflowsCollection = db.collection('workflows')

    const existingWorkflow = await workflowsCollection.findOne({ _id: workflowId })
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    }

    const result = await workflowsCollection.updateOne(
      { _id: workflowId },
      { $set: updateFields }
    )

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'No changes made to workflow' })
    }

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'workflow',
      resourceId: workflowId,
      action: 'update',
      changes: updateData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.json({
      success: true,
      message: 'Workflow updated successfully'
    })
  } catch (error) {
    console.error('Workflow update API error:', error)
    res.status(500).json({ error: 'Failed to update workflow' })
  }
})

// Execute workflow manually
router.post('/:workflowId/execute', async (req, res) => {
  try {
    const { workflowId } = req.params
    const { context = {} } = req.body
    
    const db = await getDb()
    const workflowsCollection = db.collection('workflows')

    const workflow = await workflowsCollection.findOne({ _id: workflowId })
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    if (!workflow.isActive) {
      return res.status(400).json({ error: 'Workflow is not active' })
    }

    // Execute workflow
    const executionResult = await executeWorkflow(workflow, context)

    // Update workflow statistics
    await workflowsCollection.updateOne(
      { _id: workflowId },
      { 
        $set: { lastExecutedAt: new Date() },
        $inc: { 
          executionCount: 1,
          successCount: executionResult.success ? 1 : 0,
          errorCount: executionResult.success ? 0 : 1
        }
      }
    )

    // Create execution log
    await db.collection('workflow_executions').insertOne({
      workflowId,
      executedBy: req.adminUser?.userId || 'system',
      executedAt: new Date(),
      context,
      result: executionResult,
      status: executionResult.success ? 'success' : 'error'
    })

    res.json({
      success: true,
      data: executionResult
    })
  } catch (error) {
    console.error('Workflow execution API error:', error)
    res.status(500).json({ error: 'Failed to execute workflow' })
  }
})

// Execute workflow logic
async function executeWorkflow(workflow, context) {
  try {
    const results = []
    let currentStep = workflow.steps[0]
    let stepIndex = 0

    while (currentStep && stepIndex < workflow.steps.length) {
      const stepResult = await executeWorkflowStep(currentStep, context)
      results.push({
        stepId: currentStep.id,
        stepName: currentStep.name,
        result: stepResult
      })

      if (!stepResult.success) {
        return {
          success: false,
          error: stepResult.error,
          results,
          executedAt: new Date()
        }
      }

      // Move to next step
      if (currentStep.nextStep) {
        currentStep = workflow.steps.find(step => step.id === currentStep.nextStep)
      } else {
        stepIndex++
        currentStep = workflow.steps[stepIndex]
      }
    }

    return {
      success: true,
      results,
      executedAt: new Date()
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      executedAt: new Date()
    }
  }
}

// Execute individual workflow step
async function executeWorkflowStep(step, context) {
  try {
    switch (step.type) {
      case 'action':
        return await executeActionStep(step, context)
      case 'condition':
        return await executeConditionStep(step, context)
      case 'delay':
        return await executeDelayStep(step, context)
      case 'notification':
        return await executeNotificationStep(step, context)
      case 'webhook':
        return await executeWebhookStep(step, context)
      default:
        return {
          success: false,
          error: `Unknown step type: ${step.type}`
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Execute action step
async function executeActionStep(step, context) {
  const { action, target, parameters } = step.config
  
  switch (action) {
    case 'update_order_status':
      return await updateOrderStatus(target, parameters, context)
    case 'send_email':
      return await sendEmail(target, parameters, context)
    case 'create_notification':
      return await createNotification(target, parameters, context)
    case 'update_inventory':
      return await updateInventory(target, parameters, context)
    default:
      return {
        success: false,
        error: `Unknown action: ${action}`
      }
  }
}

// Execute condition step
async function executeConditionStep(step, context) {
  const { condition, operator, value } = step.config
  
  const contextValue = getContextValue(context, condition)
  let result = false

  switch (operator) {
    case 'equals':
      result = contextValue === value
      break
    case 'not_equals':
      result = contextValue !== value
      break
    case 'greater_than':
      result = contextValue > value
      break
    case 'less_than':
      result = contextValue < value
      break
    case 'contains':
      result = String(contextValue).includes(String(value))
      break
    default:
      return {
        success: false,
        error: `Unknown operator: ${operator}`
      }
  }

  return {
    success: true,
    result,
    condition,
    operator,
    value,
    contextValue
  }
}

// Execute delay step
async function executeDelayStep(step, context) {
  const { duration, unit } = step.config
  
  const delayMs = duration * (unit === 'seconds' ? 1000 : unit === 'minutes' ? 60000 : 3600000)
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        delayed: duration,
        unit
      })
    }, delayMs)
  })
}

// Execute notification step
async function executeNotificationStep(step, context) {
  const { title, message, type, recipients } = step.config
  
  // Create notification
  const notification = {
    title: interpolateString(title, context),
    message: interpolateString(message, context),
    type: type || 'info',
    category: 'workflow',
    priority: 'normal',
    targetUsers: recipients || [],
    createdBy: 'workflow',
    createdAt: new Date(),
    readBy: [],
    status: 'active'
  }

  const db = await getDb()
  await db.collection('notifications').insertOne(notification)

  return {
    success: true,
    notificationId: notification._id
  }
}

// Execute webhook step
async function executeWebhookStep(step, context) {
  const { url, method, headers, body } = step.config
  
  try {
    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(interpolateObject(body, context))
    })

    return {
      success: response.ok,
      status: response.status,
      data: await response.json()
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper functions
function getContextValue(context, path) {
  return path.split('.').reduce((obj, key) => obj?.[key], context)
}

function interpolateString(template, context) {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    return getContextValue(context, path) || match
  })
}

function interpolateObject(obj, context) {
  if (typeof obj === 'string') {
    return interpolateString(obj, context)
  }
  if (Array.isArray(obj)) {
    return obj.map(item => interpolateObject(item, context))
  }
  if (typeof obj === 'object' && obj !== null) {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, context)
    }
    return result
  }
  return obj
}

// Action implementations
async function updateOrderStatus(orderId, parameters, context) {
  const db = await getDb()
  const ordersCollection = db.collection('orders')
  
  const result = await ordersCollection.updateOne(
    { _id: orderId },
    { $set: { status: parameters.status, updatedAt: new Date() } }
  )
  
  return {
    success: result.modifiedCount > 0,
    modifiedCount: result.modifiedCount
  }
}

async function sendEmail(recipient, parameters, context) {
  // Mock email sending
  return {
    success: true,
    messageId: `email_${Date.now()}`
  }
}

async function createNotification(recipient, parameters, context) {
  const db = await getDb()
  const notificationsCollection = db.collection('notifications')
  
  const notification = {
    title: parameters.title,
    message: parameters.message,
    type: parameters.type || 'info',
    category: 'workflow',
    priority: parameters.priority || 'normal',
    targetUsers: [recipient],
    createdBy: 'workflow',
    createdAt: new Date(),
    readBy: [],
    status: 'active'
  }
  
  const result = await notificationsCollection.insertOne(notification)
  
  return {
    success: true,
    notificationId: result.insertedId
  }
}

async function updateInventory(modelId, parameters, context) {
  const db = await getDb()
  const modelsCollection = db.collection('models')
  
  const result = await modelsCollection.updateOne(
    { _id: modelId },
    { $set: { inventory: parameters.inventory, updatedAt: new Date() } }
  )
  
  return {
    success: result.modifiedCount > 0,
    modifiedCount: result.modifiedCount
  }
}

// Get workflow executions
router.get('/:workflowId/executions', async (req, res) => {
  try {
    const { workflowId } = req.params
    const { page = 1, limit = 20 } = req.query
    
    const db = await getDb()
    const executionsCollection = db.collection('workflow_executions')

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Get executions
    const executions = await executionsCollection
      .find({ workflowId })
      .sort({ executedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await executionsCollection.countDocuments({ workflowId })

    res.json({
      success: true,
      data: {
        executions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    console.error('Workflow executions API error:', error)
    res.status(500).json({ error: 'Failed to fetch workflow executions' })
  }
})

// Get workflow templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'order-confirmation',
        name: 'Order Confirmation Workflow',
        description: 'Automatically confirm orders and send confirmation emails',
        trigger: {
          type: 'event',
          event: 'order.created'
        },
        steps: [
          {
            id: 'step1',
            name: 'Update Order Status',
            type: 'action',
            config: {
              action: 'update_order_status',
              target: '{{orderId}}',
              parameters: { status: 'confirmed' }
            },
            nextStep: 'step2'
          },
          {
            id: 'step2',
            name: 'Send Confirmation Email',
            type: 'action',
            config: {
              action: 'send_email',
              target: '{{customerEmail}}',
              parameters: {
                subject: 'Order Confirmed - {{orderNumber}}',
                template: 'order-confirmation'
              }
            }
          }
        ]
      },
      {
        id: 'inventory-alert',
        name: 'Inventory Alert Workflow',
        description: 'Send alerts when inventory levels are low',
        trigger: {
          type: 'event',
          event: 'inventory.low'
        },
        steps: [
          {
            id: 'step1',
            name: 'Check Inventory Level',
            type: 'condition',
            config: {
              condition: 'inventory.level',
              operator: 'less_than',
              value: 5
            },
            nextStep: 'step2'
          },
          {
            id: 'step2',
            name: 'Send Alert',
            type: 'notification',
            config: {
              title: 'Low Inventory Alert',
              message: 'Inventory for {{modelName}} is below 5 units',
              type: 'warning',
              recipients: ['admin']
            }
          }
        ]
      }
    ]

    res.json({
      success: true,
      data: templates
    })
  } catch (error) {
    console.error('Workflow templates API error:', error)
    res.status(500).json({ error: 'Failed to fetch workflow templates' })
  }
})

// Delete workflow
router.delete('/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params
    const db = await getDb()
    const workflowsCollection = db.collection('workflows')

    const workflow = await workflowsCollection.findOne({ _id: workflowId })
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    await workflowsCollection.deleteOne({ _id: workflowId })

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'workflow',
      resourceId: workflowId,
      action: 'delete',
      changes: { deleted: true },
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'warning'
    })

    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    })
  } catch (error) {
    console.error('Workflow deletion API error:', error)
    res.status(500).json({ error: 'Failed to delete workflow' })
  }
})

export default router
