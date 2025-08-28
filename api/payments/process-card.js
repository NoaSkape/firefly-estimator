import Stripe from 'stripe'
import { requireAuth } from '../../lib/auth.js'
import { getBuildById } from '../../lib/builds.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  console.log('[PROCESS-CARD] Request received:', {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : []
  })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[PROCESS-CARD] Missing Stripe secret key')
    return res.status(500).json({ 
      error: 'Stripe not configured', 
      details: 'STRIPE_SECRET_KEY environment variable is missing' 
    })
  }

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) {
      console.error('[PROCESS-CARD] Authentication failed - no userId')
      return
    }

    const { buildId, paymentIntentId } = req.body
    if (!buildId || !paymentIntentId) {
      return res.status(400).json({ error: 'Build ID and Payment Intent ID are required' })
    }

    console.log('[PROCESS-CARD] Processing card payment for build:', buildId, 'paymentIntent:', paymentIntentId)

    const build = await getBuildById(buildId)
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Verify the payment intent belongs to this build
    if (build.payment?.paymentIntentId !== paymentIntentId) {
      return res.status(400).json({ error: 'Invalid payment intent for this build' })
    }

    // Retrieve the payment intent to check its current status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.status === 'succeeded') {
      console.log('[PROCESS-CARD] Payment already succeeded:', paymentIntentId)
      
      // Update build with success status
      const { getDb } = await import('../../lib/db.js')
      const db = await getDb()
      const { ObjectId } = await import('mongodb')
      
      await db.collection('builds').updateOne(
        { _id: new ObjectId(String(buildId)) },
        { 
          $set: {
            'payment.status': 'succeeded',
            'payment.processedAt': new Date(),
            'payment.transactionId': paymentIntent.latest_charge
          }
        }
      )

      return res.status(200).json({
        success: true,
        status: 'succeeded',
        message: 'Payment already processed successfully'
      })
    }

    if (paymentIntent.status === 'requires_confirmation') {
      // Confirm the payment intent
      const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId)
      
      if (confirmedIntent.status === 'succeeded') {
        console.log('[PROCESS-CARD] Payment confirmed successfully:', paymentIntentId)
        
        // Update build with success status
        const { getDb } = await import('../../lib/db.js')
        const db = await getDb()
        const { ObjectId } = await import('mongodb')
        
        await db.collection('builds').updateOne(
          { _id: new ObjectId(String(buildId)) },
          { 
            $set: {
              'payment.status': 'succeeded',
              'payment.processedAt': new Date(),
              'payment.transactionId': confirmedIntent.latest_charge
            }
          }
        )

        return res.status(200).json({
          success: true,
          status: 'succeeded',
          message: 'Payment processed successfully'
        })
      } else if (confirmedIntent.status === 'requires_action') {
        console.log('[PROCESS-CARD] Payment requires additional action:', confirmedIntent.status)
        
        return res.status(200).json({
          success: false,
          status: 'requires_action',
          clientSecret: confirmedIntent.client_secret,
          message: 'Additional authentication required'
        })
      } else {
        console.error('[PROCESS-CARD] Payment confirmation failed:', confirmedIntent.status)
        
        return res.status(400).json({
          success: false,
          status: confirmedIntent.status,
          message: 'Payment confirmation failed',
          error: confirmedIntent.last_payment_error?.message || 'Unknown error'
        })
      }
    } else {
      console.error('[PROCESS-CARD] Payment intent in unexpected state:', paymentIntent.status)
      
      return res.status(400).json({
        success: false,
        status: paymentIntent.status,
        message: 'Payment intent is not ready for processing',
        error: paymentIntent.last_payment_error?.message || 'Invalid payment intent state'
      })
    }

  } catch (error) {
    console.error('[PROCESS-CARD] Error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: 'Card error',
        message: error.message,
        code: error.code
      })
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: error.message
      })
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process card payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
