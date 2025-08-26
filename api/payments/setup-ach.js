import Stripe from 'stripe'
import { getAuth } from '@clerk/backend'
import { connectToDatabase } from '../../lib/db.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if Stripe is properly configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ 
      error: 'Stripe not configured', 
      details: 'STRIPE_SECRET_KEY environment variable is missing' 
    })
  }

  try {
    const { userId } = await getAuth(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { orderId } = req.body // This is actually buildId from frontend
    if (!orderId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    console.log('Setting up ACH for build:', orderId, 'user:', userId)

    const db = await connectToDatabase()
    const { ObjectId } = await import('mongodb')
    const buildId = new ObjectId(String(orderId))
    
    const build = await db.collection('builds').findOne({ 
      _id: buildId, 
      userId: userId 
    })

    if (!build) {
      console.log('Build not found:', orderId, 'for user:', userId)
      return res.status(404).json({ error: 'Build not found' })
    }

    console.log('Found build:', build._id, 'buyerInfo:', !!build.buyerInfo)

    // Get or create Stripe customer
    let customerId = build.customerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: build.buyerInfo?.email,
        name: `${build.buyerInfo?.firstName} ${build.buyerInfo?.lastName}`,
        metadata: {
          buildId: orderId,
          userId: userId
        }
      })
      customerId = customer.id
      
      // Update build with customer ID
      await db.collection('builds').updateOne(
        { _id: buildId },
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
        buildId: orderId,
        userId: userId
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
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
