// Advanced Reporting System API
// Provides comprehensive reporting with custom report builder

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { validateAdminAccess } from '../../lib/adminAuth.js'

const router = express.Router()

// Guard router.use to avoid non-function handlers
const __origRouterUse = router.use.bind(router)
router.use = function guardedRouterUse(...args) {
  try {
    const path = (typeof args[0] === 'string' || args[0] instanceof RegExp || Array.isArray(args[0])) ? args[0] : undefined
    const handlers = path ? args.slice(1) : args
    const startIndex = path ? 1 : 0
    for (let i = 0; i < handlers.length; i++) {
      if (typeof handlers[i] !== 'function') {
        const idx = startIndex + i
        const t = typeof handlers[i]
        console.error('[SUBROUTER_USE_GUARD] Non-function handler; patching', { file: __filename, path, index: idx, type: t })
        args[idx] = (req, res) => res.status(500).json({ error: 'admin_handler_misconfigured', file: __filename, path: String(path || ''), index: idx, type: t })
      }
    }
  } catch (e) { console.warn('[SUBROUTER_USE_GUARD] Failed:', e?.message) }
  return __origRouterUse(...args)
}
// Admin authentication middleware for all routes
router.use((req, res, next) => { if (process.env.ADMIN_AUTH_DISABLED === 'true') { return next() } return validateAdminAccess(req, res, next) })

// Report schema
const reportSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['financial', 'operational', 'customer', 'inventory', 'marketing', 'custom']),
  category: z.string().max(100).optional(),
  isPublic: z.boolean().default(false),
  schedule: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
  }).optional(),
  filters: z.record(z.any()).optional(),
  columns: z.array(z.string()).min(1),
  aggregations: z.array(z.object({
    field: z.string(),
    function: z.enum(['sum', 'avg', 'count', 'min', 'max', 'distinct']),
    alias: z.string().optional()
  })).optional(),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  })).optional(),
  limit: z.number().int().min(1).max(10000).optional()
})

// Get all reports
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      isPublic,
      sort = 'createdAt',
      order = 'desc'
    } = req.query

    const db = await getDb()
    const reportsCollection = db.collection('reports')

    // Build filter
    const filter = {}
    if (type) filter.type = type
    if (category) filter.category = category
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true'

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get reports
    const reports = await reportsCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await reportsCollection.countDocuments(filter)

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    console.error('Reports API error:', error)
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
})

export default router



