import { getAuth } from '@clerk/nextjs/server'
import { connectToDatabase } from '../../lib/db.js'

export default async function handler(req, res) {
  const { userId } = await getAuth(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user is admin (you may need to implement your own admin check)
  // For now, we'll allow access to the settings API

  const db = await connectToDatabase()

  if (req.method === 'GET') {
    try {
      const settings = await db.collection('settings').findOne({ type: 'payments' })
      
      // Default settings if none exist
      const defaultSettings = {
        payments: {
          depositPercent: 25,
          storageFeePerDayCents: 4000, // $40.00
          enableCardOption: false
        }
      }

      res.status(200).json(settings?.data || defaultSettings)
    } catch (error) {
      console.error('Get settings error:', error)
      res.status(500).json({ error: 'Failed to get settings' })
    }
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

      // Upsert settings
      await db.collection('settings').updateOne(
        { type: 'payments' },
        { 
          $set: { 
            data: { payments },
            updatedAt: new Date(),
            updatedBy: userId
          }
        },
        { upsert: true }
      )

      res.status(200).json({ 
        success: true, 
        message: 'Settings updated successfully',
        settings: { payments }
      })
    } catch (error) {
      console.error('Update settings error:', error)
      res.status(500).json({ error: 'Failed to update settings' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
