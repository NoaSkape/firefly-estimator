import Stripe from 'stripe'
import { requireAuth } from '../../lib/auth.js'
import { getDb } from '../../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, plan, method, mandateAccepted } = req.body
    if (!buildId || !plan || !method) {
      return res.status(400).json({ error: 'Build ID, plan, and method are required' })
    }

    const { getBuildById } = await import('../../lib/builds.js')
    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Update build with payment plan and mark as ready
    const updateData = {
      'payment.plan': plan,
      'payment.method': method,
      'payment.ready': true,
      'payment.status': 'ready'
    }

    // Add mandate acceptance timestamp if ACH debit
    if (method === 'ach_debit' && mandateAccepted) {
      updateData['payment.mandateAcceptedAt'] = new Date().toISOString()
    }

    const db = await getDb()
    const { ObjectId } = await import('mongodb')
    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
      { $set: updateData }
    )

    res.status(200).json({
      success: true,
      message: 'Payment marked as ready'
    })

  } catch (error) {
    console.error('Mark payment ready error:', error)
    res.status(500).json({ 
      error: 'Failed to mark payment as ready',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
