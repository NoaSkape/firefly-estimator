import { getAuth } from '@clerk/nextjs/server'
import { connectToDatabase } from '../../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = await getAuth(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { orderId, plan, method, mandateAccepted } = req.body
    if (!orderId || !plan || !method) {
      return res.status(400).json({ error: 'Order ID, plan, and method are required' })
    }

    const db = await connectToDatabase()
    const order = await db.collection('orders').findOne({ 
      _id: orderId, 
      userId: userId 
    })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Update order with payment plan and mark as ready
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

    await db.collection('orders').updateOne(
      { _id: orderId },
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
