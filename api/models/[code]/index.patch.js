import { getDb } from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { findModelById, ensureModelIndexes } from '../../../lib/model-utils.js'

export default async function handler(req, res) {
  console.log('=== INDEX.PATCH.JS CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('==========================');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'PATCH') return res.status(405).end()
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return

  const { code: id } = req.query
  const {
    name,
    price,
    description,
    specs,
    features,
  } = req.body || {}

  const $set = { updatedAt: new Date() }
  if (typeof name === 'string') $set.name = name
  if (typeof price === 'number') $set.basePrice = price
  if (typeof description === 'string') $set.description = String(description)

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
    // Sanitize features as strings
    $set.features = features.map(f => String(f)).slice(0, 100)
  }

  const db = await getDb()
  await ensureModelIndexes()
  const model = await findModelById(id)
  if (!model) return res.status(404).json({ error: 'Not found' })

  await db.collection('baseModels').updateOne({ _id: model._id }, { $set })
  const updated = await db.collection('baseModels').findOne({ _id: model._id })
  res.status(200).json(updated)
}

