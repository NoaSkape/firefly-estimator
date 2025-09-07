import Stripe from 'stripe'
import { requireAuth } from '../../lib/auth.js'
import { getDb } from '../../lib/db.js'
import { ObjectId } from 'mongodb'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { 
      buildId, 
      paymentMethodId, 
      cardholderName, 
      billingAddress 
    } = req.body

    if (!buildId || !paymentMethodId || !cardholderName) {
      return res.status(400).json({ error: 'Build ID, payment method ID, and cardholder name are required' })
    }

    // Validate billing address
    const addressFields = ['street', 'city', 'state', 'zip']
    for (const field of addressFields) {
      if (!billingAddress?.[field]?.trim()) {
        return res.status(400).json({ 
          error: `Billing address ${field} is required`,
          field: `billingAddress.${field}`
        })
      }
    }

    const { getBuildById } = await import('../../lib/builds.js')
    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get or create Stripe customer
    let customerId = build.customerId
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: build.buyerInfo?.email,
        name: cardholderName,
        address: {
          line1: billingAddress.street,
          city: billingAddress.city,
          state: billingAddress.state,
          postal_code: billingAddress.zip,
          country: 'US'
        },
        metadata: {
          buildId: String(buildId),
          userId: auth.userId
        }
      })
      customerId = customer.id

      // Update build with customer ID
      const db = await getDb()
      await db.collection('builds').updateOne(
        { _id: new ObjectId(String(buildId)) },
        { $set: { customerId: customerId } }
      )
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    })

    // Verify the payment method with a $0 setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      usage: 'off_session',
      metadata: {
        buildId: String(buildId),
        userId: auth.userId,
        verification: 'true'
      }
    })

    if (setupIntent.status !== 'succeeded') {
      // Handle cases where additional action is required
      if (setupIntent.status === 'requires_action') {
        return res.status(200).json({
          success: false,
          requiresAction: true,
          clientSecret: setupIntent.client_secret,
          message: 'Additional authentication required'
        })
      } else {
        throw new Error('Card verification failed')
      }
    }

    // Get payment method details for response
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    res.status(200).json({
      success: true,
      message: 'Card verified successfully',
      paymentMethod: {
        id: paymentMethod.id,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year
      },
      setupIntentId: setupIntent.id
    })

  } catch (error) {
    console.error('Card verification error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: error.message,
        code: error.code
      })
    }
    
    res.status(500).json({ 
      error: 'Failed to verify card',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
