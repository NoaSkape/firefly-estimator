import { getAuth } from '@clerk/backend'

export default async function handler(req, res) {
  try {
    const { userId } = await getAuth(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Default settings - no database required
    const defaultSettings = {
      payments: {
        depositPercent: 25,
        storageFeePerDayCents: 4000, // $40.00
        enableCardOption: false
      },
      pricing: {
        title_fee_default: 500,
        setup_fee_default: 3000,
        tax_rate_percent: 6.25
      }
    }

    if (req.method === 'GET') {
      // For now, just return default settings
      // TODO: Add database integration when needed
      res.status(200).json(defaultSettings)
    } else if (req.method === 'POST') {
      try {
        const { payments } = req.body
        
        if (!payments) {
          return res.status(400).json({ error: 'Payment settings are required' })
        }

        // Validate settings
        if (payments.depositPercent < 0 || payments.depositPercent > 100) {
          return res.status(400).json({ error: 'Deposit percentage must be between 0 and 100' })
        }

        if (payments.storageFeePerDayCents < 0) {
          return res.status(400).json({ error: 'Storage fee cannot be negative' })
        }

        // TODO: Add database integration when needed
        // For now, just return success
        res.status(200).json({ 
          success: true, 
          message: 'Settings updated successfully (database integration pending)',
          settings: { payments }
        })
      } catch (error) {
        console.error('Update settings error:', error)
        res.status(500).json({ error: 'Failed to update settings' })
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Settings API error:', error)
    // Return default settings even if auth fails (for development)
    if (req.method === 'GET') {
      res.status(200).json({
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
      })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
