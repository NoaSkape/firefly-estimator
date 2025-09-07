import { requireAuth } from '../../lib/auth.js'
import { getDb } from '../../lib/db.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, status, adminOverride = false } = req.body

    if (!buildId || !status) {
      return res.status(400).json({ error: 'Build ID and status are required' })
    }

    // Validate status values
    const validStatuses = [
      'draft', 'configured', 'contract_pending', 'contract_signed', 
      'payment_pending', 'in_production', 'factory_complete', 
      'ready_for_delivery', 'delivered', 'cancelled'
    ]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' })
    }

    const { getBuildById } = await import('../../lib/builds.js')
    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // Check permissions - only admin or build owner can update status
    const isAdmin = auth.publicMetadata?.role === 'admin' || adminOverride
    if (!isAdmin && build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const db = await getDb()
    const now = new Date()

    // Prepare update data
    const updateData = {
      status: status,
      updatedAt: now,
      updatedBy: auth.userId
    }

    // Add status-specific timestamps
    if (status === 'factory_complete') {
      updateData.factoryCompletedAt = now
    } else if (status === 'delivered') {
      updateData.deliveredAt = now
    }

    // Update the build
    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
      { $set: updateData }
    )

    // Handle bank transfer milestone activation
    if (status === 'factory_complete' && build.payment?.method === 'bank_transfer') {
      const paymentPlan = build.payment.plan?.type
      
      // For deposit + final plans, activate the final payment milestone
      if (paymentPlan === 'deposit' && !build.payment?.finalPaid) {
        // Check if there's a final payment intent
        const finalIntent = await db.collection('bankTransferIntents').findOne({
          orderId: new ObjectId(String(buildId)),
          milestone: 'final'
        })

        if (finalIntent && finalIntent.status === 'pending_contract') {
          // Activate the final payment milestone
          await db.collection('bankTransferIntents').updateOne(
            { _id: finalIntent._id },
            { 
              $set: {
                status: 'awaiting_activation',
                factoryCompletedAt: now,
                updatedAt: now
              }
            }
          )

          console.log(`Activated final payment milestone for build ${buildId}`)
        }
      }
    }

    // Log the status change
    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
      { 
        $push: {
          statusHistory: {
            status: status,
            changedAt: now,
            changedBy: auth.userId,
            isAdmin: isAdmin
          }
        }
      }
    )

    res.status(200).json({
      success: true,
      message: `Build status updated to ${status}`,
      build: {
        _id: buildId,
        status: status,
        updatedAt: now
      }
    })

  } catch (error) {
    console.error('Update build status error:', error)
    res.status(500).json({ 
      error: 'Failed to update build status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
