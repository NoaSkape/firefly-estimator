import Stripe from 'stripe'
import { getAuth } from '@clerk/backend'
import { connectToDatabase } from '../../lib/db.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = await getAuth(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { orderId, paymentMethodId, accountId, balanceCents } = req.body
    if (!orderId || !paymentMethodId) {
      return res.status(400).json({ error: 'Order ID and Payment Method ID are required' })
    }

    const db = await connectToDatabase()
    const order = await db.collection('orders').findOne({ 
      _id: orderId, 
      userId: userId 
    })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: order.customerId,
    })

    // Update order with payment method details
    const updateData = {
      'payment.method': 'ach_debit',
      'payment.savedPaymentMethodId': paymentMethodId,
      'payment.financialConnections': {
        accountId: accountId || null,
        lastBalanceCheckCents: balanceCents || null
      }
    }

    await db.collection('orders').updateOne(
      { _id: orderId },
      { $set: updateData }
    )

    res.status(200).json({
      success: true,
      message: 'ACH payment method saved successfully'
    })

  } catch (error) {
    console.error('Save ACH method error:', error)
    res.status(500).json({ 
      error: 'Failed to save ACH payment method',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
