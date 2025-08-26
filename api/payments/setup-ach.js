import Stripe from 'stripe'
import { getAuth } from '@clerk/nextjs/server'
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

    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' })
    }

    const db = await connectToDatabase()
    const order = await db.collection('orders').findOne({ 
      _id: orderId, 
      userId: userId 
    })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Get or create Stripe customer
    let customerId = order.customerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: order.buyerInfo?.email,
        name: `${order.buyerInfo?.firstName} ${order.buyerInfo?.lastName}`,
        metadata: {
          orderId: orderId,
          userId: userId
        }
      })
      customerId = customer.id
      
      // Update order with customer ID
      await db.collection('orders').updateOne(
        { _id: orderId },
        { $set: { customerId: customerId } }
      )
    }

    // Create SetupIntent for ACH bank account - PaymentElement compatible
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account', 'card'],
      usage: 'off_session', // For future payments
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances'], // Request balance access
            account_subcategories: ['checking', 'savings']
          },
          verification_method: 'automatic' // Use Financial Connections for verification
        }
      },
      metadata: {
        orderId: orderId,
        userId: userId,
        buildId: orderId // Add buildId for easier tracking
      }
    })

    res.status(200).json({
      clientSecret: setupIntent.client_secret,
      customerId: customerId
    })

  } catch (error) {
    console.error('Setup ACH error:', error)
    res.status(500).json({ 
      error: 'Failed to setup ACH payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
