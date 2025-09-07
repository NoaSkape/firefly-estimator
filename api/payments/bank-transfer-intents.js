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
      paymentPlan, 
      payerInfo, 
      commitments 
    } = req.body

    if (!buildId || !paymentPlan || !payerInfo) {
      return res.status(400).json({ error: 'Build ID, payment plan, and payer info are required' })
    }

    // Validate required fields
    const requiredFields = ['fullLegalName', 'email', 'phone', 'preferredTransferType']
    for (const field of requiredFields) {
      if (!payerInfo[field]?.trim()) {
        return res.status(400).json({ 
          error: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`,
          field: field
        })
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(payerInfo.email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address',
        field: 'email'
      })
    }

    // Validate billing address
    const addressFields = ['street', 'city', 'state', 'zip']
    for (const field of addressFields) {
      if (!payerInfo.billingAddress?.[field]?.trim()) {
        return res.status(400).json({ 
          error: `Billing address ${field} is required`,
          field: `billingAddress.${field}`
        })
      }
    }

    // Validate ZIP code format (basic US ZIP validation)
    const zipRegex = /^\d{5}(-\d{4})?$/
    if (!zipRegex.test(payerInfo.billingAddress.zip.trim())) {
      return res.status(400).json({ 
        error: 'Please enter a valid ZIP code',
        field: 'billingAddress.zip'
      })
    }

    // Validate commitments
    if (!commitments?.customerInitiated || !commitments?.fundsClearing) {
      return res.status(400).json({ error: 'All required commitments must be acknowledged' })
    }

    if (paymentPlan.type === 'deposit' && !commitments?.storageFeesAcknowledged) {
      return res.status(400).json({ error: 'Storage fees acknowledgment is required for deposit payments' })
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

    // Create bank transfer intents based on payment plan
    const intents = []
    
    if (paymentPlan.type === 'deposit') {
      // Create deposit intent
      intents.push({
        _id: new ObjectId(),
        orderId: new ObjectId(String(buildId)),
        milestone: 'deposit',
        expectedAmount: depositCents,
        status: 'pending_contract',
        payerInfo: {
          fullLegalName: payerInfo.fullLegalName,
          email: payerInfo.email,
          phone: payerInfo.phone,
          billingAddress: payerInfo.billingAddress,
          preferredTransferType: payerInfo.preferredTransferType,
          plannedSendDate: payerInfo.plannedSendDate || null
        },
        commitments,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.userId
      })

      // Create final payment intent
      intents.push({
        _id: new ObjectId(),
        orderId: new ObjectId(String(buildId)),
        milestone: 'final',
        expectedAmount: totalCents - depositCents,
        status: 'pending_contract',
        payerInfo: {
          fullLegalName: payerInfo.fullLegalName,
          email: payerInfo.email,
          phone: payerInfo.phone,
          billingAddress: payerInfo.billingAddress,
          preferredTransferType: payerInfo.preferredTransferType,
          plannedSendDate: payerInfo.plannedSendDate || null
        },
        commitments,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.userId
      })
    } else {
      // Create full payment intent
      intents.push({
        _id: new ObjectId(),
        orderId: new ObjectId(String(buildId)),
        milestone: 'full',
        expectedAmount: totalCents,
        status: 'pending_contract',
        payerInfo: {
          fullLegalName: payerInfo.fullLegalName,
          email: payerInfo.email,
          phone: payerInfo.phone,
          billingAddress: payerInfo.billingAddress,
          preferredTransferType: payerInfo.preferredTransferType,
          plannedSendDate: payerInfo.plannedSendDate || null
        },
        commitments,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.userId
      })
    }

    // Remove any existing intents for this build
    await db.collection('bankTransferIntents').deleteMany({
      orderId: new ObjectId(String(buildId))
    })

    // Insert new intents
    await db.collection('bankTransferIntents').insertMany(intents)

    // Update build with bank transfer info
    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
      { 
        $set: {
          'payment.method': 'bank_transfer',
          'payment.plan': paymentPlan,
          'payment.bankTransfer': {
            payerInfo,
            commitments,
            intentsCreated: true,
            createdAt: now
          },
          'payment.ready': true,
          'payment.status': 'ready'
        }
      }
    )

    res.status(200).json({
      success: true,
      message: 'Bank transfer intents created successfully',
      intents: intents.map(intent => ({
        id: intent._id,
        milestone: intent.milestone,
        expectedAmount: intent.expectedAmount,
        status: intent.status
      }))
    })

  } catch (error) {
    console.error('Bank transfer intents creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create bank transfer intents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
