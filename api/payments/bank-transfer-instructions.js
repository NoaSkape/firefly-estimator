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

    // Check if contract is signed (required for Phase 2)
    if (!build.contract?.signed) {
      return res.status(400).json({ 
        error: 'Contract must be signed before bank transfer instructions can be generated',
        phase: 'pre_contract'
      })
    }

    const db = await getDb()

    // Find the bank transfer intent for this milestone
    const intent = await db.collection('bankTransferIntents').findOne({
      orderId: new ObjectId(String(buildId)),
      milestone: milestone
    })

    if (!intent) {
      return res.status(404).json({ error: 'Bank transfer intent not found for this milestone' })
    }

    // Check if instructions already exist and are still valid
    if (intent.stripeInvoiceId && intent.status === 'awaiting_funds') {
      try {
        const invoice = await stripe.invoices.retrieve(intent.stripeInvoiceId)
        if (invoice.status === 'open' && invoice.hosted_invoice_url) {
          return res.status(200).json({
            success: true,
            instructions: {
              invoiceId: invoice.id,
              hostedInvoiceUrl: invoice.hosted_invoice_url,
              amount: intent.expectedAmount,
              milestone: milestone,
              status: intent.status,
              payerInfo: intent.payerInfo
            }
          })
        }
      } catch (error) {
        console.log('Existing invoice not found or invalid, creating new one')
      }
    }

    // Generate new Stripe invoice for bank transfer
    const customer = await stripe.customers.retrieve(build.customerId)
    
    const invoice = await stripe.invoices.create({
      customer: build.customerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: {
        buildId: String(buildId),
        milestone: milestone,
        userId: auth.userId,
        intentId: String(intent._id)
      }
    })

    // Add invoice item
    await stripe.invoiceItems.create({
      customer: build.customerId,
      invoice: invoice.id,
      amount: intent.expectedAmount,
      currency: 'usd',
      description: `${milestone === 'deposit' ? 'Deposit Payment' : 
                    milestone === 'final' ? 'Final Payment' : 
                    'Full Payment'} - ${build.modelName || build.modelSlug} Tiny Home`
    })

    // Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

    // Update the intent with Stripe invoice ID and status
    await db.collection('bankTransferIntents').updateOne(
      { _id: intent._id },
      { 
        $set: {
          stripeInvoiceId: finalizedInvoice.id,
          status: 'awaiting_funds',
          instructionsGeneratedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    // Generate bank transfer instructions
    const instructions = {
      invoiceId: finalizedInvoice.id,
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
      amount: intent.expectedAmount,
      milestone: milestone,
      status: 'awaiting_funds',
      payerInfo: intent.payerInfo,
      bankDetails: {
        recipientName: 'Firefly Tiny Homes LLC',
        bankName: 'Stripe Payments',
        routingNumber: '110000000', // Stripe test routing number
        accountNumber: finalizedInvoice.id, // Use invoice ID as unique account reference
        referenceCode: `FTH-${buildId.slice(-8)}-${milestone.toUpperCase()}`
      },
      instructions: {
        achCredit: 'ACH Credit typically posts in 1–2 business days.',
        wire: 'Wires can arrive same-day before your bank\'s cutoff; bank fees may apply. Ensure the full amount arrives.',
        clearing: 'Funds must clear before release.',
        storageReminder: milestone === 'final' ? 
          'Delivery must occur within 12 days after completion; storage charges apply thereafter and must be paid prior to shipment.' : 
          null
      }
    }

    res.status(200).json({
      success: true,
      instructions
    })

  } catch (error) {
    console.error('Bank transfer instructions error:', error)
    res.status(500).json({ 
      error: 'Failed to generate bank transfer instructions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
