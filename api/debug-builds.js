// Debug endpoint to check builds data structure
import { getDb } from '../lib/db.js'
import { BUILDS_COLLECTION } from '../lib/builds.js'

export const runtime = 'nodejs'

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://www.fireflyestimator.com')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = await getDb()
    const buildsCollection = db.collection(BUILDS_COLLECTION)
    
    // Get all builds with full data
    const builds = await buildsCollection
      .find({})
      .sort({ updatedAt: -1 })
      .limit(10)
      .toArray()
    
    console.log('[DEBUG_BUILDS] Found', builds.length, 'builds')
    
    // Process builds to show structure
    const debugBuilds = builds.map(build => ({
      _id: build._id,
      userId: build.userId,
      step: build.step,
      status: build.status,
      modelName: build.modelName,
      updatedAt: build.updatedAt,
      createdAt: build.createdAt,
      hasBuyerInfo: !!build.buyerInfo,
      buyerInfoStructure: build.buyerInfo ? {
        hasFirstName: !!build.buyerInfo.firstName,
        hasLastName: !!build.buyerInfo.lastName,
        hasEmail: !!build.buyerInfo.email,
        hasPhone: !!build.buyerInfo.phone,
        hasAddress: !!build.buyerInfo.address,
        hasCity: !!build.buyerInfo.city,
        hasState: !!build.buyerInfo.state,
        hasZip: !!build.buyerInfo.zip,
        actualData: {
          firstName: build.buyerInfo.firstName,
          lastName: build.buyerInfo.lastName,
          email: build.buyerInfo.email,
          phone: build.buyerInfo.phone,
          address: build.buyerInfo.address,
          city: build.buyerInfo.city,
          state: build.buyerInfo.state,
          zip: build.buyerInfo.zip
        }
      } : null
    }))
    
    return res.status(200).json({
      success: true,
      buildsCount: builds.length,
      collection: BUILDS_COLLECTION,
      builds: debugBuilds
    })
    
  } catch (error) {
    console.error('[DEBUG_BUILDS] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to debug builds',
      message: error.message
    })
  }
}
