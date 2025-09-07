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

    const { buildId, milestone } = req.body

    if (!buildId || !milestone) {
      return res.status(400).json({ error: 'Build ID and milestone are required' })
    }

    // Validate milestone
    if (!['deposit', 'final', 'full'].includes(milestone)) {
      return res.status(400).json({ error: 'Invalid milestone' })
    }

    const { getBuildById } = await import('../../lib/builds.js')
    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check if contract is signed (required for post-contract payments)
    if (!build.contract?.signed) {
      return res.status(400).json({ 
        error: 'Contract must be signed before processing payment',
        phase: 'pre_contract'
      })
    }

    // Check if payment method is card and has required data
    if (build.payment?.method !== 'card' || !build.payment?.card?.paymentMethodId) {
      return res.status(400).json({ error: 'Credit card payment method not found' })
    }

    const cardPayment = build.payment.card
    const paymentPlan = build.payment.plan

    // Determine payment amount based on milestone
    let amount
    if (milestone === 'deposit') {
      amount = build.payment.amounts?.deposit || 0
    } else if (milestone === 'final') {
      amount = build.payment.amounts?.final || 0
    } else if (milestone === 'full') {
      amount = build.payment.amounts?.total || 0
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' })
    }

    // Check if this milestone has already been paid
    const db = await getDb()
    const paymentKey = `payment.${milestone}Paid`
    const existingPayment = await db.collection('builds').findOne({
      _id: new ObjectId(String(buildId)),
      [paymentKey]: true
    })

    if (existingPayment) {
      return res.status(400).json({ error: `${milestone} payment has already been processed` })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      customer: build.customerId,
      payment_method: cardPayment.paymentMethodId,
      confirm: true,
      off_session: true, // Indicates this is for a saved payment method
      metadata: {
        buildId: String(buildId),
        userId: auth.userId,
        milestone: milestone,
        paymentPlan: paymentPlan.type
      }
    })

    // Handle payment intent status
    if (paymentIntent.status === 'succeeded') {
      // Update build with payment success
      const updateFields = {
        [`payment.${milestone}Paid`]: true,
        [`payment.${milestone}PaidAt`]: new Date(),
        'payment.lastPaymentAt': new Date(),
        'payment.updatedAt': new Date()
      }

      // Check if all required payments are complete
      let allPaid = false
      if (paymentPlan.type === 'deposit') {
        if (milestone === 'deposit') {
          allPaid = false // Still need final payment
        } else if (milestone === 'final') {
          // Check if deposit was already paid
          allPaid = build.payment.depositPaid === true
        }
      } else if (paymentPlan.type === 'full') {
        allPaid = milestone === 'full'
      }

      if (allPaid) {
        updateFields['payment.status'] = 'fully_paid'
        updateFields['payment.fullyPaidAt'] = new Date()
      }

      await db.collection('builds').updateOne(
        { _id: new ObjectId(String(buildId)) },
        { $set: updateFields }
      )

      res.status(200).json({
        success: true,
        status: 'succeeded',
        paymentIntentId: paymentIntent.id,
        milestone: milestone,
        amount: amount,
        allPaid: allPaid,
        message: `${milestone} payment processed successfully`
      })

    } else if (paymentIntent.status === 'requires_action') {
      // 3D Secure or other authentication required
      res.status(200).json({
        success: false,
        status: 'requires_action',
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        message: 'Additional authentication required'
      })

    } else {
      // Payment failed
      throw new Error(`Payment failed with status: ${paymentIntent.status}`)
    }

  } catch (error) {
    console.error('Process card payment error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: error.message,
        code: error.code,
        decline_code: error.decline_code
      })
    }
    
    res.status(500).json({ 
      error: 'Failed to process payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
