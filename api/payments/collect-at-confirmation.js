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

    if (!order.payment?.ready) {
      return res.status(400).json({ error: 'Payment not ready for collection' })
    }

    const { payment } = order

    if (payment.method === 'ach_debit') {
      // Create and confirm PaymentIntent for ACH debit
      const paymentIntent = await stripe.paymentIntents.create({
        amount: payment.plan.amountCents,
        currency: 'usd',
        customer: order.customerId,
        payment_method: payment.savedPaymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          orderId: orderId,
          userId: userId,
          paymentPlan: payment.plan.type
        }
      })

      // Update order with payment status
      await db.collection('orders').updateOne(
        { _id: orderId },
        { 
          $set: {
            'payment.status': paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed',
            'payment.paymentIntentId': paymentIntent.id,
            'payment.lastError': paymentIntent.last_payment_error?.message || null
          }
        }
      )

      res.status(200).json({
        success: true,
        status: paymentIntent.status,
        message: paymentIntent.status === 'succeeded' 
          ? 'Payment submitted—bank debits can take a few business days to clear.'
          : 'Payment failed. Please try again or contact support.'
      })

    } else if (payment.method === 'bank_transfer') {
      // Check if bank transfer has been received
      const virtualAccount = await stripe.treasury.financialAccounts.retrieve(
        payment.bankTransfer.virtualAccountId
      )

      // Check for inbound transfers
      const transfers = await stripe.treasury.inboundTransfers.list({
        financial_account: payment.bankTransfer.virtualAccountId,
        status: 'succeeded'
      })

      if (transfers.data.length > 0) {
        // Transfer received
        await db.collection('orders').updateOne(
          { _id: orderId },
          { 
            $set: {
              'payment.status': 'succeeded',
              'payment.transferId': transfers.data[0].id
            }
          }
        )

        res.status(200).json({
          success: true,
          status: 'succeeded',
          message: 'Bank transfer received successfully!'
        })
      } else {
        // Still waiting for transfer
        await db.collection('orders').updateOne(
          { _id: orderId },
          { $set: { 'payment.status': 'awaiting_funds' } }
        )

        res.status(200).json({
          success: true,
          status: 'awaiting_funds',
          message: 'Waiting for bank transfer to be received. We\'ll notify you when funds arrive.'
        })
      }

    } else {
      res.status(400).json({ error: 'Unsupported payment method' })
    }

  } catch (error) {
    console.error('Collect payment error:', error)
    res.status(500).json({ 
      error: 'Failed to collect payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
