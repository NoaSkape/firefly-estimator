import Stripe from 'stripe'
import { requireAuth } from '../../lib/auth.js'
import { getDb } from '../../lib/db.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, paymentMethodId, accountId, balanceCents } = req.body
    if (!buildId || !paymentMethodId) {
      return res.status(400).json({ error: 'Build ID and Payment Method ID are required' })
    }

    const { getBuildById } = await import('../../lib/builds.js')
    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get database connection and ObjectId for all operations
    const db = await getDb()
    const { ObjectId } = await import('mongodb')

    // Get or create Stripe customer
    let customerId = build.customerId
    
    if (!customerId) {
      console.log('[SAVE-ACH] No customer ID found, creating customer...')
      const customer = await stripe.customers.create({
        email: build.buyerInfo?.email,
        name: `${build.buyerInfo?.firstName} ${build.buyerInfo?.lastName}`,
        metadata: {
          buildId: buildId,
          userId: auth.userId
        }
      })
      customerId = customer.id
      
      // Update build with customer ID immediately
      await db.collection('builds').updateOne(
        { _id: new ObjectId(String(buildId)) },
        { $set: { customerId: customerId } }
      )
      console.log('[SAVE-ACH] Created and saved customer:', customerId)
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })

    // Update build with payment method details
    const updateData = {
      'payment.method': 'ach_debit',
      'payment.savedPaymentMethodId': paymentMethodId,
      'payment.financialConnections': {
        accountId: accountId || null,
        lastBalanceCheckCents: balanceCents || null
      }
    }

    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
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
