import express from 'express'
import { adminAuth } from '../../lib/adminAuth.js'

// Convert to an Express Router so it mounts safely like other admin modules
const router = express.Router()

// Require admin access
router.use(adminAuth.validateAdminAccess.bind(adminAuth))

// Default settings (no DB needed yet)
const defaultSettings = {
  payments: {
    depositPercent: 25,
    storageFeePerDayCents: 4000,
    enableCardOption: false
  },
  pricing: {
    title_fee_default: 500,
    setup_fee_default: 3000,
    tax_rate_percent: 6.25
  }
}

// GET /admin/settings
router.get('/', async (req, res) => {
  try {
    res.json(defaultSettings)
  } catch (e) {
    console.error('Settings GET error:', e)
    res.status(500).json({ error: 'Failed to load settings' })
  }
})

// PUT /admin/settings
router.put('/', async (req, res) => {
  try {
    const { payments } = req.body || {}
    if (!payments) return res.status(400).json({ error: 'Payment settings are required' })

    if (payments.depositPercent < 0 || payments.depositPercent > 100) {
      return res.status(400).json({ error: 'Deposit percentage must be between 0 and 100' })
    }
    if (payments.storageFeePerDayCents < 0) {
      return res.status(400).json({ error: 'Storage fee cannot be negative' })
    }

    // TODO: Persist to DB; for now echo back
    res.json({ success: true, message: 'Settings updated (not persisted yet)', settings: { payments } })
  } catch (e) {
    console.error('Settings PUT error:', e)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

export default router
