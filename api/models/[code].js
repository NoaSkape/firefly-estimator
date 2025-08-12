export const runtime = 'nodejs'

import { getDb } from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { applyCors } from '../../lib/cors.js'
import { findModelById, ensureModelIndexes, findOrCreateModel } from '../../lib/model-utils.js'

function setCors(req, res) {
  applyCors(req, res, 'GET, PATCH, OPTIONS')
}

export default async function handler(req, res) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  setCors(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    switch (req.method) {
      case 'GET':
        await requireAuth(req, res, false)
        return getModel(req, res, debug)
      case 'PATCH': {
        const auth = await requireAuth(req, res, true)
        if (!auth?.userId) return
        return patchModel(req, res, debug)
      }
      default:
        return res.status(405).end()
    }
  } catch (err) {
    if (debug) console.error('[DEBUG_ADMIN] models/[code] error', err?.message || err)
    return res.status(500).json({ error: 'server_error' })
  }
}

async function getModel(req, res, debug) {
  const { code: id } = req.query
  await ensureModelIndexes()
  const model = await findModelById(id)
  if (debug) {
    console.log('[DEBUG_ADMIN] models/[code]/get', { id, found: !!model })
  }
  if (!model) return res.status(404).json({ error: 'Not found', images: [], features: [] })
  const normalized = {
    ...model,
    features: Array.isArray(model.features) ? model.features : [],
    images: Array.isArray(model.images) ? model.images : [],
  }
  return res.status(200).json(normalized)
}

async function patchModel(req, res, debug) {
  const { code: id } = req.query
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { name, price, description, specs, features } = body

  const $set = { updatedAt: new Date() }
  if (typeof name === 'string') $set.name = String(name).slice(0, 200)
  if (typeof price === 'number') $set.basePrice = price
  if (typeof description === 'string') $set.description = String(description).slice(0, 5000)

  if (specs && typeof specs === 'object') {
    const { width, length, height, squareFeet, weight, bedrooms, bathrooms } = specs
    if (typeof width === 'string') $set.width = width
    if (typeof length === 'string') $set.length = length
    if (typeof height === 'string') $set.height = height
    if (typeof weight === 'string') $set.weight = weight
    if (typeof squareFeet === 'number') $set.squareFeet = squareFeet
    if (typeof bedrooms === 'number') $set.bedrooms = bedrooms
    if (typeof bathrooms === 'number') $set.bathrooms = bathrooms
  }

  if (Array.isArray(features)) {
    $set.features = features.map(f => String(f).slice(0, 300)).slice(0, 100)
  }
  if (debug) {
    console.log('[DEBUG_ADMIN] Computed $set keys', Object.keys($set))
  }

  const db = await getDb()
  await ensureModelIndexes()
  const model = await findOrCreateModel({ modelCode: id })
  if (!model) return res.status(404).json({ error: 'Not found' })
  if (debug) {
    console.log('[DEBUG_ADMIN] Found model', { _id: model?._id, modelCode: model?.modelCode, slug: model?.slug })
  }

  const collectionName = process.env.MODELS_COLLECTION || 'Models'
  await db.collection(collectionName).updateOne({ _id: model._id }, { $set })
  const updated = await db.collection(collectionName).findOne({ _id: model._id })
  return res.status(200).json(updated)
}


