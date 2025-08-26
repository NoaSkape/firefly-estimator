import Stripe from 'stripe'
import { requireAuth } from '../../lib/auth.js'
import { getBuildById } from '../../lib/builds.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  console.log('[SETUP-ACH] Request received:', {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasClerkKey: !!process.env.CLERK_SECRET_KEY
  })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if Stripe is properly configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[SETUP-ACH] Missing Stripe secret key')
    return res.status(500).json({ 
      error: 'Stripe not configured', 
      details: 'STRIPE_SECRET_KEY environment variable is missing' 
    })
  }

  try {
    console.log('[SETUP-ACH] Attempting authentication...')
    const auth = await requireAuth(req, res, false)
    console.log('[SETUP-ACH] Authentication result:', { success: !!auth?.userId, userId: auth?.userId })
    if (!auth?.userId) {
      console.error('[SETUP-ACH] Authentication failed - no userId')
      return
    }

    const { buildId } = req.body
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    console.log('[SETUP-ACH] Setting up ACH for build:', buildId, 'user:', auth.userId)

    // Get build using the standard library function
    const build = await getBuildById(buildId)
    console.log('[SETUP-ACH] Build lookup result:', !!build)
    
    if (!build) {
      console.log('[SETUP-ACH] Build not found:', buildId)
      return res.status(404).json({ error: 'Build not found' })
    }

    // Check if user owns this build
    if (build.userId !== auth.userId) {
      console.log('[SETUP-ACH] Build ownership check failed. Build userId:', build.userId, 'Request userId:', auth.userId)
      return res.status(404).json({ error: 'Build not found' })
    }

    console.log('[SETUP-ACH] Found build:', build._id, 'buyerInfo:', !!build.buyerInfo)

    // Get or create Stripe customer
    let customerId = build.customerId
    console.log('[SETUP-ACH] Existing customer ID:', customerId)
    
    if (!customerId) {
      console.log('[SETUP-ACH] Creating new Stripe customer...')
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
    }

    console.log('[SETUP-ACH] Creating SetupIntent with customer:', customerId)
    // Create SetupIntent for ACH bank account - PaymentElement compatible
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account', 'card'],
      usage: 'off_session', // For future payments
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances'] // Request balance access
          },
          verification_method: 'automatic' // Use Financial Connections for verification
        }
      },
      metadata: {
        buildId: buildId,
        userId: auth.userId
      }
    })

    console.log('[SETUP-ACH] SetupIntent created successfully:', setupIntent.id)
    
    const response = {
      clientSecret: setupIntent.client_secret,
      customerId: customerId
    }
    
    console.log('[SETUP-ACH] Sending successful response')
    res.status(200).json(response)

  } catch (error) {
    console.error('Setup ACH error:', error)
    res.status(500).json({ 
      error: 'Failed to setup ACH payment',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
