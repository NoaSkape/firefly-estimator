import Stripe from 'stripe'
import { requireAuth } from '../../lib/auth.js'
import { getBuildById } from '../../lib/builds.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  console.log('[SETUP-CARD] Request received:', {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY
  })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[SETUP-CARD] Missing Stripe secret key')
    return res.status(500).json({ 
      error: 'Stripe not configured', 
      details: 'STRIPE_SECRET_KEY environment variable is missing' 
    })
  }

  try {
    console.log('[SETUP-CARD] Attempting authentication...')
    const auth = await requireAuth(req, res, false)
    console.log('[SETUP-CARD] Authentication result:', { success: !!auth?.userId, userId: auth?.userId })
    if (!auth?.userId) {
      console.error('[SETUP-CARD] Authentication failed - no userId')
      return
    }

    const { buildId } = req.body
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    console.log('[SETUP-CARD] Setting up card payment for build:', buildId, 'user:', auth.userId)

    const build = await getBuildById(buildId)
    console.log('[SETUP-CARD] Build lookup result:', !!build)
    
    if (!build) {
      console.log('[SETUP-CARD] Build not found:', buildId)
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      console.log('[SETUP-CARD] Build ownership check failed. Build userId:', build.userId, 'Request userId:', auth.userId)
      return res.status(404).json({ error: 'Build not found' })
    }

    console.log('[SETUP-CARD] Found build:', build._id, 'buyerInfo:', !!build.buyerInfo)

    // Get or create Stripe customer
    let customerId = build.customerId
    console.log('[SETUP-CARD] Existing customer ID:', customerId)
    
    if (!customerId) {
      console.log('[SETUP-CARD] Creating new Stripe customer...')
      const customer = await stripe.customers.create({
        email: build.buyerInfo?.email,
        name: `${build.buyerInfo?.firstName} ${build.buyerInfo?.lastName}`,
        metadata: {
          buildId: buildId,
          userId: auth.userId
        }
      })
      customerId = customer.id
      
      // Update build with customer ID
      const { getDb } = await import('../../lib/db.js')
      const db = await getDb()
      const { ObjectId } = await import('mongodb')
      
      await db.collection('builds').updateOne(
        { _id: new ObjectId(String(buildId)) },
        { $set: { customerId: customerId } }
      )
      console.log('[SETUP-CARD] Created and saved customer:', customerId)
    }

    // Calculate payment amount
    const { calculateTotalPurchasePrice } = await import('../../utils/calculateTotal.js')
    const totalAmount = calculateTotalPurchasePrice(build)
    const totalCents = Math.round(totalAmount * 100)
    
    // Get payment plan from build or default to deposit
    const paymentPlan = build.payment?.plan || { type: 'deposit', percent: 25 }
    const depositCents = Math.round(totalCents * ((paymentPlan.percent || 25) / 100))
    const currentAmountCents = paymentPlan.type === 'deposit' ? depositCents : totalCents

    console.log('[SETUP-CARD] Payment calculation:', {
      totalAmount,
      totalCents,
      depositCents,
      currentAmountCents,
      paymentPlanType: paymentPlan.type
    })

    // Create PaymentIntent for card payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: currentAmountCents,
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        buildId: buildId,
        userId: auth.userId,
        paymentPlan: paymentPlan.type,
        paymentMethod: 'card'
      },
      description: `Firefly Tiny Home - ${build.modelName || 'Custom Build'} - ${paymentPlan.type === 'deposit' ? 'Deposit' : 'Full Payment'}`
    })

    console.log('[SETUP-CARD] Created PaymentIntent:', paymentIntent.id)

    // Update build with payment intent
    const { getDb } = await import('../../lib/db.js')
    const db = await getDb()
    const { ObjectId } = await import('mongodb')
    
    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
      { 
        $set: {
          'payment.method': 'card',
          'payment.paymentIntentId': paymentIntent.id,
          'payment.plan': paymentPlan,
          'payment.amountCents': currentAmountCents,
          'payment.status': 'setup_complete',
          'payment.setupAt': new Date()
        }
      }
    )

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: currentAmountCents,
      currency: 'usd'
    })

  } catch (error) {
    console.error('[SETUP-CARD] Error:', error)
    res.status(500).json({ 
      error: 'Failed to setup card payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
