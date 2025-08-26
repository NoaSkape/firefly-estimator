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

    // Create virtual account for bank transfers
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'US',
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: false },
      },
      business_type: 'individual',
      metadata: {
        orderId: orderId,
        userId: userId
      }
    })

    // Create virtual account for receiving transfers
    const virtualAccount = await stripe.treasury.financialAccounts.create({
      supported_currencies: ['usd'],
      features: {
        deposit_insurance: { requested: true },
        financial_addresses: { requested: true },
        inbound_transfers: { requested: true },
        intra_stripe_flows: { requested: true },
        outbound_payments: { requested: true },
        outbound_transfers: { requested: true },
      },
      metadata: {
        orderId: orderId,
        userId: userId
      }
    }, {
      stripeAccount: account.id
    })

    // Generate reference code
    const referenceCode = `FF-${orderId.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    // Update order with bank transfer details
    await db.collection('orders').updateOne(
      { _id: orderId },
      { 
        $set: {
          'payment.method': 'bank_transfer',
          'payment.bankTransfer': {
            virtualAccountId: virtualAccount.id,
            referenceCode: referenceCode,
            accountId: account.id
          }
        }
      }
    )

    res.status(200).json({
      success: true,
      virtualAccount: {
        id: virtualAccount.id,
        referenceCode: referenceCode,
        instructions: {
          beneficiary: 'Firefly Tiny Homes',
          routingNumber: virtualAccount.financial_addresses?.[0]?.routing_numbers?.[0] || 'N/A',
          accountNumber: virtualAccount.financial_addresses?.[0]?.account_numbers?.[0] || 'N/A',
          referenceCode: referenceCode
        }
      }
    })

  } catch (error) {
    console.error('Provision bank transfer error:', error)
    res.status(500).json({ 
      error: 'Failed to provision bank transfer account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
