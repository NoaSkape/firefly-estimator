import { requireAuth } from '../../lib/auth.js'
import { getDb } from '../../lib/db.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { 
      buildId, 
      paymentMethodId, 
      paymentPlan, 
      cardholderName, 
      billingAddress, 
      cardDetails,
      authorizations 
    } = req.body

    if (!buildId || !paymentMethodId || !paymentPlan || !cardholderName) {
      return res.status(400).json({ error: 'Build ID, payment method ID, payment plan, and cardholder name are required' })
    }

    // Validate authorizations
    if (!authorizations?.chargeAuthorization || !authorizations?.nonRefundable || !authorizations?.highValueTransaction) {
      return res.status(400).json({ error: 'All required authorizations must be acknowledged' })
    }

    const { getBuildById } = await import('../../lib/builds.js')
    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const db = await getDb()
    const now = new Date()

    // Calculate amounts based on payment plan
    const { calculateTotalPurchasePrice } = await import('../../src/utils/calculateTotal.js')
    const { getOrgSettings } = await import('../../lib/settings.js')
    
    const settings = await getOrgSettings()
    const totalAmount = calculateTotalPurchasePrice(build, settings)
    const totalCents = Math.round(totalAmount * 100)
    const depositPercent = paymentPlan.percent || settings.pricing?.deposit_percent || 25
    const depositCents = Math.round(totalCents * (depositPercent / 100))

    // Update build with credit card payment information
    const updateData = {
      'payment.method': 'card',
      'payment.plan': paymentPlan,
      'payment.ready': true,
      'payment.status': 'pending_contract',
      'payment.card': {
        paymentMethodId: paymentMethodId,
        cardholderName: cardholderName,
        billingAddress: billingAddress,
        cardDetails: {
          brand: cardDetails.brand,
          last4: cardDetails.last4,
          exp_month: cardDetails.exp_month,
          exp_year: cardDetails.exp_year
        },
        authorizations: authorizations,
        verifiedAt: now
      },
      'payment.amounts': {
        total: totalCents,
        deposit: depositCents,
        final: totalCents - depositCents
      },
      'payment.updatedAt': now
    }

    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
      { $set: updateData }
    )

    res.status(200).json({
      success: true,
      message: 'Credit card payment method saved successfully',
      paymentPlan: paymentPlan,
      amounts: {
        total: totalCents,
        deposit: depositCents,
        final: totalCents - depositCents
      }
    })

  } catch (error) {
    console.error('Save card method error:', error)
    res.status(500).json({ 
      error: 'Failed to save payment method',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
