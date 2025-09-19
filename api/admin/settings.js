import express from 'express'
import { validateAdminAccess } from '../../lib/adminAuth.js'
import { getOrgSettings, updateOrgSettings } from '../../lib/settings.js'
import { getDb } from '../../lib/db.js'

// Convert to an Express Router so it mounts safely like other admin modules
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
// Require admin access
router.use((req,res,next)=>{ if(process.env.ADMIN_AUTH_DISABLED==='true'){ return next() } return validateAdminAccess(req,res,next) })

// GET /admin/settings
router.get('/', async (req, res) => {
  try {
    const doc = await getOrgSettings()
    res.json({ success: true, data: doc })
  } catch (e) {
    console.error('Settings GET error:', e)
    res.status(500).json({ error: 'Failed to load settings' })
  }
})

// PUT /admin/settings
router.put('/', async (req, res) => {
  try {
    const patch = req.body || {}

    // Basic validation bounds for commonly edited fields
    const p = patch?.pricing || {}
    if (p.deposit_percent != null && (p.deposit_percent < 0 || p.deposit_percent > 100)) {
      return res.status(400).json({ error: 'deposit_percent must be between 0 and 100' })
    }
    if (p.tax_rate_percent != null && (p.tax_rate_percent < 0 || p.tax_rate_percent > 25)) {
      return res.status(400).json({ error: 'tax_rate_percent is out of bounds' })
    }

    const updated = await updateOrgSettings(patch, req.adminUser?.userId)

    // Audit log
    try {
      const db = await getDb()
      await db.collection('audit_logs').insertOne({
        resource: 'settings',
        resourceId: 'org',
        action: 'update',
        changes: patch,
        userId: req.adminUser?.userId || 'system',
        timestamp: new Date(),
        severity: 'info'
      })
    } catch (e) {
      console.warn('[settings] failed to write audit log:', e?.message)
    }

    res.json({ success: true, data: updated })
  } catch (e) {
    console.error('Settings PUT error:', e)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

export default router



