import { getDb } from './db.js'
import { OPTIONS } from '../src/data/options.js'

export const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || 'Builds'

export async function ensureBuildIndexes() {
  const db = await getDb()
  const col = db.collection(BUILDS_COLLECTION)
  await Promise.all([
    col.createIndex({ userId: 1, updatedAt: -1 }),
    col.createIndex({ status: 1, updatedAt: -1 }),
    col.createIndex({ createdAt: -1 }),
  ])
}

function getFlatOptionCatalog() {
  try {
    const out = []
    const groups = Array.isArray(OPTIONS) ? OPTIONS : []
    for (const g of groups) {
      const subject = g?.subject || 'General'
      const items = Array.isArray(g?.items) ? g.items : []
      for (const it of items) {
        out.push({ id: it.id, name: it.name, price: Number(it.price || 0), description: it.description || '', group: subject })
      }
    }
    return out
  } catch { return [] }
}

export function reprice(buildLike) {
  const base = Number(buildLike?.selections?.basePrice || 0)
  const options = Array.isArray(buildLike?.selections?.options)
    ? buildLike.selections.options.reduce((sum, o) => sum + Number(o?.price || 0) * Number(o?.quantity || 1), 0)
    : 0
  
  // Preserve calculated delivery fee if it exists, otherwise use default
  const delivery = Number(buildLike?.pricing?.delivery || 2000)
  const setup = Number(buildLike?.pricing?.setup || 500)
  const subtotal = base + options + delivery + setup
  const taxRate = Number(process.env.SALES_TAX_RATE || 0.0825) // Default to 8.25% if not set
  const tax = Math.round(subtotal * taxRate)
  const total = subtotal + tax
  
  return { 
    base, 
    options, 
    subtotal, 
    tax, 
    delivery, 
    setup, 
    total,
    // Preserve delivery calculation details
    deliveryMiles: buildLike?.pricing?.deliveryMiles,
    deliveryRate: buildLike?.pricing?.deliveryRate,
    deliveryMinimum: buildLike?.pricing?.deliveryMinimum
  }
}

export async function createBuild({ userId, modelSlug, modelName, basePrice, selections = {}, financing = {}, buyerInfo = {}, status = 'DRAFT' }) {
  const db = await getDb()
  const col = db.collection(BUILDS_COLLECTION)
  const now = new Date()
  
  // Calculate initial pricing with proper defaults
  const initialPricing = reprice({ 
    selections: { basePrice, options: selections.options }, 
    pricing: { delivery: 2000, setup: 500 } 
  })
  
  const doc = {
    userId,
    modelSlug,
    modelName,
    status,
    selections: {
      basePrice: Number(basePrice || 0),
      options: Array.isArray(selections.options) ? selections.options : [],
      notes: typeof selections.notes === 'string' ? selections.notes : undefined,
    },
    pricing: initialPricing,
    financing: {
      method: financing.method || null,
      lender: financing.lender,
      preapprovalId: financing.preapprovalId,
      estMonthly: financing.estMonthly ? Number(financing.estMonthly) : undefined,
    },
    buyerInfo: { ...buyerInfo },
    version: 1,
    primary: false,
    step: 1,
    createdAt: now,
    updatedAt: now,
    optionCatalog: getFlatOptionCatalog(),
    contract: { status: 'none', envelopeId: null, signedAt: null },
  }
  const result = await col.insertOne(doc)
  return { ...doc, _id: result.insertedId }
}

export async function getBuildById(buildId) {
  const db = await getDb()
  const col = db.collection(BUILDS_COLLECTION)
  const { ObjectId } = await import('mongodb')
  return col.findOne({ _id: new ObjectId(String(buildId)) })
}

export async function listBuildsForUser(userId) {
  const db = await getDb()
  const col = db.collection(BUILDS_COLLECTION)
  return col.find({ userId }).sort({ updatedAt: -1 }).toArray()
}

export async function updateBuild(buildId, patch) {
  const db = await getDb()
  const col = db.collection(BUILDS_COLLECTION)
  const { ObjectId } = await import('mongodb')
  const _id = new ObjectId(String(buildId))

  // Sanitize patch
  const $set = { updatedAt: new Date() }
  if (patch.status) $set.status = String(patch.status)
  if (patch.step) $set.step = Number(patch.step)
  if (patch.primary != null) $set.primary = !!patch.primary
  if (patch.modelSlug) $set.modelSlug = String(patch.modelSlug)
  if (patch.modelName) $set.modelName = String(patch.modelName)
  if (patch.buyerInfo && typeof patch.buyerInfo === 'object') $set.buyerInfo = { ...patch.buyerInfo }
  if (patch.financing && typeof patch.financing === 'object') $set.financing = { ...patch.financing }
  if (patch.selections && typeof patch.selections === 'object') {
    const opts = Array.isArray(patch.selections.options) ? patch.selections.options : undefined
    const base = patch.selections.basePrice
    $set.selections = {
      ...(patch.selections || {}),
      ...(base != null ? { basePrice: Number(base) } : {}),
      ...(opts ? { options: opts } : {}),
    }
  }

  // Get existing build data
  const existing = await col.findOne({ _id })
  const next = {
    ...existing,
    ...$set,
  }
  
  // Ensure base price is always preserved from existing data if not being updated
  if (!next.selections.basePrice && existing?.selections?.basePrice) {
    next.selections.basePrice = existing.selections.basePrice
  }
  
  // Calculate delivery fee FIRST if buyer info was updated and contains address
  let deliveryData = {}
  if (patch.buyerInfo && typeof patch.buyerInfo === 'object') {
    const address = patch.buyerInfo.deliveryAddress || 
      [patch.buyerInfo.address, patch.buyerInfo.city, patch.buyerInfo.state, patch.buyerInfo.zip]
        .filter(Boolean)
        .join(', ')
    
    if (address && address.trim()) {
      try {
        const { getDeliveryQuote } = await import('./delivery-quote.js')
        const { getOrgSettings } = await import('./settings.js')
        const settings = await getOrgSettings()
        const deliveryQuote = await getDeliveryQuote(address, settings)
        
        deliveryData = {
          delivery: deliveryQuote.fee,
          deliveryMiles: deliveryQuote.miles,
          deliveryRate: deliveryQuote.ratePerMile,
          deliveryMinimum: deliveryQuote.minimum
        }
        
        console.log('Delivery calculation result:', deliveryData)
      } catch (error) {
        console.error('Delivery calculation error:', error)
        // Continue without delivery calculation if it fails
      }
    }
  }
  
  // Now call reprice with the calculated delivery data
  const nextPricing = reprice({ 
    selections: next.selections, 
    pricing: { ...next.pricing, ...deliveryData }
  })
  $set.pricing = nextPricing

  await col.updateOne({ _id }, { $set })
  // If setting primary true, unset other builds for same user
  if (patch.primary === true && existing?.userId) {
    await col.updateMany({ userId: existing.userId, _id: { $ne: _id } }, { $set: { primary: false } })
  }
  return col.findOne({ _id })
}

export async function duplicateBuild(buildId, userId) {
  const original = await getBuildById(buildId)
  if (!original || original.userId !== userId) return null
  const baseName = original.modelName || original.modelSlug || 'Build'
  const version = Number(original.version || 1) + 1
  const copy = {
    ...original,
    _id: undefined,
    version,
    status: 'DRAFT',
    step: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    modelName: `${baseName} (v${version})`,
  }
  const db = await getDb()
  const col = db.collection(BUILDS_COLLECTION)
  const result = await col.insertOne(copy)
  return { ...copy, _id: result.insertedId }
}

export async function deleteBuild(buildId, userId) {
  const db = await getDb()
  const col = db.collection(BUILDS_COLLECTION)
  const { ObjectId } = await import('mongodb')
  const _id = new ObjectId(String(buildId))
  const found = await col.findOne({ _id })
  if (!found || found.userId !== userId) return { deletedCount: 0 }
  return col.deleteOne({ _id })
}

export async function renameBuild(buildId, userId, newName) {
  const db = await getDb()
  const col = db.collection(BUILDS_COLLECTION)
  const { ObjectId } = await import('mongodb')
  const _id = new ObjectId(String(buildId))
  
  // Check if build exists and belongs to user
  const existing = await col.findOne({ _id })
  if (!existing || existing.userId !== userId) return null
  
  // Update the build name
  await col.updateOne({ _id }, { 
    $set: { 
      modelName: String(newName).slice(0, 200), // Limit length
      updatedAt: new Date() 
    } 
  })
  
  return col.findOne({ _id })
}


