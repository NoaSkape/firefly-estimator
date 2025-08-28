import Stripe from 'stripe'
import { requireAuth } from '../../lib/auth.js'
import { getBuildById } from '../../lib/builds.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.body
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

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
        buildId: buildId,
        userId: auth.userId
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
        buildId: buildId,
        userId: auth.userId
      }
    }, {
      stripeAccount: account.id
    })

    // Generate reference code
    const referenceCode = `FF-${buildId.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    // Update build with bank transfer details
    const { getDb } = await import('../../lib/db.js')
    const db = await getDb()
    const { ObjectId } = await import('mongodb')
    
    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
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
