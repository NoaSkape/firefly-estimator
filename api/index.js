export const runtime = 'nodejs'

import express from 'express'
import { createHash } from 'node:crypto'

import { getDb } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { applyCors } from '../lib/cors.js'
import { findModelById, ensureModelIndexes, findOrCreateModel, COLLECTION } from '../lib/model-utils.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))

// Preserve original path for deployments that rewrite to /api/index
app.use((req, _res, next) => {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] incoming', { method: req.method, url: req.url })
  try {
    const host = req.headers.host || 'localhost'
    const url = new URL(req.url, `http://${host}`)
    const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-uri']
    if (typeof forwarded === 'string' && forwarded.startsWith('/')) {
      req.url = forwarded
    } else if (url.searchParams.has('path')) {
      const p = url.searchParams.get('path')
      if (p) req.url = p.startsWith('/') ? p : `/${p}`
    }
  } catch {}
  if (debug) console.log('[DEBUG_ADMIN] normalized', { method: req.method, url: req.url })
  next()
})

// Global CORS (echo allowed origin via helper)
app.use((req, res, next) => {
  applyCors(req, res, 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  next()
})

// Handle explicit rewrite target /api/index?path=/...
app.use('/api/index', (req, _res, next) => {
  const p = (req.query && (req.query.path || req.query.p)) || null
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (p) {
    req.url = String(p).startsWith('/') ? String(p) : `/${String(p)}`
    if (debug) console.log('[DEBUG_ADMIN] rewrite middleware set url from query', req.url)
  }
  next()
})

// ----- Health & sanity -----
app.get(['/api/test', '/test'], (_req, res) => {
  res.status(200).json({ success: true, at: '/api/test' })
})

app.get(['/api/models/ping', '/models/ping'], (_req, res) => {
  res.status(200).json({ ok: true, route: '/api/models/ping' })
})

// ----- GET model -----
app.get(['/api/models/:code', '/models/:code'], async (req, res) => {
  const debug = process.env.DEBUG_ADMIN === 'true'
  try {
    const { code } = req.params
    await ensureModelIndexes()
    const model = await findModelById(code)
    if (debug) console.log('[DEBUG_ADMIN] models GET', { code, found: !!model })
    if (!model) return res.status(404).json({ error: 'Not found', images: [], features: [] })
    const normalized = {
      ...model,
      features: Array.isArray(model.features) ? model.features : [],
      images: Array.isArray(model.images) ? model.images : [],
    }
    return res.status(200).json(normalized)
  } catch (err) {
    if (debug) console.error('[DEBUG_ADMIN] models GET error', err?.message || err)
    return res.status(500).json({ error: 'server_error' })
  }
})

// ----- Images routes (register BEFORE dynamic PATCH/PUT to avoid '/api/models/:code' capturing 'images') -----
app.patch(['/api/models/images', '/models/images'], imagesEntry)
app.post(['/api/models/images', '/models/images'], imagesEntry)
app.delete(['/api/models/images', '/models/images'], imagesEntry)

// ----- PATCH/PUT model -----
async function handleModelWrite(req, res) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  const { code } = req.params
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

  const db = await getDb()
  try {
    await ensureModelIndexes()
  } catch (e) {
    if (debug) console.warn('[DEBUG_ADMIN] ensureModelIndexes error (continuing):', e?.message || e)
  }
  const model = await findOrCreateModel({ modelCode: code })
  if (!model) return res.status(404).json({ error: 'Not found' })
  if (debug) console.log('[DEBUG_ADMIN] Found model', { _id: model?._id, modelCode: model?.modelCode, slug: model?.slug })

  await db.collection(COLLECTION).updateOne({ _id: model._id }, { $set })
  const updated = await db.collection(COLLECTION).findOne({ _id: model._id })
  return res.status(200).json(updated)
}

app.patch(['/api/models/:code', '/models/:code'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  return handleModelWrite(req, res)
})

app.put(['/api/models/:code', '/models/:code'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  return handleModelWrite(req, res)
})

// ----- Images route handlers -----
async function handleImagesPatch(req, res, model, db) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] Handling PATCH request images')
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { add, setPrimary, order, images, tag } = body
  const toStringSafe = (v) => (v == null ? '' : String(v)).slice(0, 500)

  const current = Array.isArray(model.images) ? model.images.slice() : []
  let nextImages = current

  if (Array.isArray(images)) {
    const now = new Date()
    nextImages = images
      .map((img, idx) => ({
        publicId: toStringSafe(img.public_id || img.publicId),
        url: toStringSafe(img.secure_url || img.url),
        isPrimary: !!img.isPrimary,
        order: typeof img.order === 'number' ? img.order : idx,
        tag: toStringSafe(tag || img.tag || 'gallery'),
        uploadedAt: img.uploadedAt ? new Date(img.uploadedAt) : now,
      }))
      .filter(i => i.url)
  } else {
    nextImages = current.map(img => ({ ...img }))
    if (Array.isArray(add) && add.length) {
      const cleanAdds = add.map((img, idx) => ({
        publicId: toStringSafe(img.publicId),
        url: toStringSafe(img.url),
        alt: toStringSafe(img.alt),
        isPrimary: false,
        order: typeof img.order === 'number' ? img.order : current.length + idx,
        tag: toStringSafe(tag || img.tag || 'gallery'),
        uploadedAt: new Date(),
      })).filter(i => i.url)
      nextImages.push(...cleanAdds)
    }
    if (typeof setPrimary === 'string' && nextImages.length) {
      const primaryId = String(setPrimary)
      nextImages = nextImages.map(img => ({ ...img, isPrimary: img.publicId === primaryId }))
    }
    if (Array.isArray(order) && nextImages.length) {
      const byId = new Map(nextImages.map(img => [img.publicId, img]))
      const reordered = order.map(id => byId.get(String(id))).filter(Boolean)
      if (reordered.length) {
        nextImages = reordered.map((img, idx) => ({ ...img, order: idx }))
      }
    }
  }

  const updates = { $set: { images: nextImages, updatedAt: new Date() } }
  const result = await db.collection(COLLECTION).updateOne({ _id: model._id }, updates)
  if (debug) console.log('[DEBUG_ADMIN] images PATCH update result', { matchedCount: result?.matchedCount, modifiedCount: result?.modifiedCount })
  const updated = await db.collection(COLLECTION).findOne({ _id: model._id })
  res.status(200).json(updated)
}

async function handleImagesDelete(req, res, model, db) {
  const { publicId } = req.query || {}
  if (!publicId) return res.status(400).json({ error: 'Missing publicId' })
  const next = (Array.isArray(model.images) ? model.images : []).filter(img => img.publicId !== publicId)
  const result = await db.collection(COLLECTION).updateOne(
    { _id: model._id },
    { $set: { images: next, updatedAt: new Date() } }
  )
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] images DELETE update result', { matchedCount: result?.matchedCount, modifiedCount: result?.modifiedCount })
  res.status(200).json({ success: true })
}

async function handleImagesPost(req, res, model, db) {
  const { url, publicId, tag } = req.body || {}
  if (!url || !publicId) return res.status(400).json({ error: 'Missing fields' })
  await db.collection(COLLECTION).updateOne(
    { _id: model._id },
    {
      $push: { images: { url, publicId, tag: tag || 'gallery' } },
      $set: { updatedAt: new Date() },
    }
  )
  res.status(200).json({ success: true })
}

async function imagesEntry(req, res) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) {
    console.log('[DEBUG_ADMIN] === models/images called ===')
    console.log('[DEBUG_ADMIN] Method:', req.method)
    console.log('[DEBUG_ADMIN] URL:', req.url)
    console.log('[DEBUG_ADMIN] Query:', req.query)
  }

  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return

  const { modelCode, modelId } = req.query || {}
  if (debug) console.log('[DEBUG_ADMIN] model identifiers', { modelCode, modelId })
  if (!modelCode && !modelId) return res.status(400).json({ error: 'modelCode or modelId is required' })

  const db = await getDb()
  try {
    await ensureModelIndexes()
  } catch (err) {
    if (debug) console.warn('[DEBUG_ADMIN] ensureModelIndexes error (continuing):', err?.message || err)
  }
  const model = await findOrCreateModel({ modelId, modelCode })
  if (!model?._id) return res.status(404).json({ error: 'Model not found' })

  switch (req.method) {
    case 'PATCH':
      return handleImagesPatch(req, res, model, db)
    case 'DELETE':
      return handleImagesDelete(req, res, model, db)
    case 'POST':
      return handleImagesPost(req, res, model, db)
    default:
      return res.status(405).json({ error: 'method_not_allowed' })
  }
}

app.patch(['/api/models/images', '/models/images'], imagesEntry)
app.post(['/api/models/images', '/models/images'], imagesEntry)
app.delete(['/api/models/images', '/models/images'], imagesEntry)

// ----- Cloudinary sign -----
app.post(['/api/cloudinary/sign', '/cloudinary/sign'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return

  const { subfolder = '', tags = [] } = req.body || {}
  const timestamp = Math.round(Date.now() / 1000)
  const root = process.env.CLOUDINARY_ROOT_FOLDER || 'firefly-estimator/models'
  const safeSub = String(subfolder).replace(/[^a-zA-Z0-9_\/-]/g, '')
  const folder = safeSub ? `${root}/${safeSub}` : root
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] cloudinary/sign', { folder, tags, cloudName: process.env.CLOUDINARY_CLOUD_NAME })
  try {
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    if (!apiKey || !apiSecret || !cloudName) {
      return res.status(500).json({ error: 'missing_env', message: 'Cloudinary env vars are not configured' })
    }

    const paramsToSign = {
      folder,
      tags: Array.isArray(tags) ? tags.join(',') : '',
      timestamp,
    }
    const toSign = Object.keys(paramsToSign)
      .sort()
      .map(k => `${k}=${paramsToSign[k]}`)
      .join('&')
    const signature = createHash('sha1')
      .update(`${toSign}${apiSecret}`)
      .digest('hex')

    res.status(200).json({
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
    })
  } catch (err) {
    console.error('Cloudinary sign error', err)
    res.status(500).json({ error: 'sign_error', message: String(err?.message || err) })
  }
})

// Fallback to JSON 404 to avoid hanging requests
app.use((req, res) => {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] 404', { method: req.method, url: req.url })
  res.status(404).json({ error: 'not_found', url: req.url })
})

// Vercel Node.js functions expect (req, res). Call Express directly.
export default (req, res) => app(req, res)


