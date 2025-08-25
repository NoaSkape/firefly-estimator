import Stripe from 'stripe'
import { connectToDatabase } from '../../lib/db.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const db = await connectToDatabase()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object, db)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object, db)
        break
      
      case 'treasury.inbound_transfer.succeeded':
        await handleInboundTransferSucceeded(event.data.object, db)
        break
      
      case 'treasury.inbound_transfer.failed':
        await handleInboundTransferFailed(event.data.object, db)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}

async function handlePaymentIntentSucceeded(paymentIntent, db) {
  const orderId = paymentIntent.metadata?.orderId
  if (!orderId) return

  await db.collection('orders').updateOne(
    { _id: orderId },
    { 
      $set: {
        'payment.status': 'succeeded',
        'payment.paymentIntentId': paymentIntent.id,
        'payment.processedAt': new Date()
      }
    }
  )

  console.log(`Payment succeeded for order: ${orderId}`)
}

async function handlePaymentIntentFailed(paymentIntent, db) {
  const orderId = paymentIntent.metadata?.orderId
  if (!orderId) return

  await db.collection('orders').updateOne(
    { _id: orderId },
    { 
      $set: {
        'payment.status': 'failed',
        'payment.paymentIntentId': paymentIntent.id,
        'payment.lastError': paymentIntent.last_payment_error?.message || 'Payment failed',
        'payment.failedAt': new Date()
      }
    }
  )

  console.log(`Payment failed for order: ${orderId}`)
}

async function handleInboundTransferSucceeded(transfer, db) {
  // Find order by virtual account ID
  const order = await db.collection('orders').findOne({
    'payment.bankTransfer.virtualAccountId': transfer.financial_account
  })

  if (!order) return

  await db.collection('orders').updateOne(
    { _id: order._id },
    { 
      $set: {
        'payment.status': 'succeeded',
        'payment.transferId': transfer.id,
        'payment.processedAt': new Date()
      }
    }
  )

  console.log(`Bank transfer succeeded for order: ${order._id}`)
}

async function handleInboundTransferFailed(transfer, db) {
  // Find order by virtual account ID
  const order = await db.collection('orders').findOne({
    'payment.bankTransfer.virtualAccountId': transfer.financial_account
  })

  if (!order) return

  await db.collection('orders').updateOne(
    { _id: order._id },
    { 
      $set: {
        'payment.status': 'failed',
        'payment.transferId': transfer.id,
        'payment.lastError': 'Bank transfer failed',
        'payment.failedAt': new Date()
      }
    }
  )

  console.log(`Bank transfer failed for order: ${order._id}`)
}
