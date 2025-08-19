export const runtime = 'nodejs'

import express from 'express'
import Stripe from 'stripe'
import { createHash } from 'node:crypto'

import { getDb } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { applyCors } from '../lib/cors.js'
import { findModelById, ensureModelIndexes, findOrCreateModel, COLLECTION } from '../lib/model-utils.js'
import { ensureOrderIndexes, createOrderDraft, getOrderById, updateOrder, listOrdersForUser, listOrdersAdmin } from '../lib/orders.js'
import { ensureIdempotencyIndexes, withIdempotency } from '../lib/idempotency.js'
import { quoteDelivery } from '../lib/delivery.js'
import { z } from 'zod'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))

// Stripe
const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  console.error('Missing STRIPE_SECRET_KEY in environment variables.')
}
export const stripe = new Stripe(stripeSecret)

const getOrigin = (req) => {
  return req.headers.origin || process.env.APP_URL || 'http://localhost:5173'
}

async function createCheckoutSession(req, res) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Firefly Estimate Deposit (TEST)' },
            unit_amount: 5000,
          },
          quantity: 1,
        },
      ],
      success_url: `${getOrigin(req)}/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getOrigin(req)}/`,
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    return res.status(500).json({ error: err?.message || 'stripe_error' })
  }
}

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

// ----- Delivery quote -----
app.get(['/api/delivery/quote', '/delivery/quote'], async (req, res) => {
  const { zip } = req.query || {}
  if (!zip) return res.status(400).json({ error: 'missing_zip' })
  const q = quoteDelivery(String(zip))
  return res.status(200).json(q)
})

// ----- Orders -----
const OrderDraftSchema = z.object({
  model: z.object({ modelCode: z.string(), slug: z.string(), name: z.string(), basePrice: z.number() }),
  selections: z.array(z.object({ key: z.string(), label: z.string(), priceDelta: z.number() })).default([]),
  pricing: z.object({ base: z.number(), options: z.number(), delivery: z.number(), total: z.number(), deposit: z.number().default(0) })
})

app.post(['/api/orders', '/orders'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  await ensureOrderIndexes(); await ensureIdempotencyIndexes()
  const idKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key']
  const result = await withIdempotency(idKey, async () => {
    const data = OrderDraftSchema.parse(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body)
    const doc = await createOrderDraft({ userId: auth.userId, ...data })
    return { ok: true, orderId: String(doc._id) }
  })
  return res.status(200).json(result)
})

app.get(['/api/orders/:id', '/orders/:id'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  const doc = await getOrderById(req.params.id)
  if (!doc) return res.status(404).json({ error: 'not_found' })
  if (auth.userId !== doc.userId) {
    const admin = await requireAuth(req, res, true)
    if (!admin?.userId) return
  }
  return res.status(200).json(doc)
})

app.patch(['/api/orders/:id', '/orders/:id'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  const allowed = ['buyer', 'delivery', 'selections', 'pricing', 'payment', 'status']
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const patch = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  const updated = await updateOrder(req.params.id, patch)
  return res.status(200).json(updated)
})

// list current user's orders (optionally filter by status)
app.get(['/api/orders', '/orders'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  const list = await listOrdersForUser(auth.userId)
  const status = req.query?.status
  const filtered = status ? list.filter(o => String(o.status) === String(status)) : list
  return res.status(200).json(filtered)
})

app.get(['/api/portal/orders', '/portal/orders'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  const list = await listOrdersForUser(auth.userId)
  return res.status(200).json(list)
})

app.get(['/api/admin/orders', '/admin/orders'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  const list = await listOrdersAdmin({ status: req.query?.status })
  return res.status(200).json(list)
})

// ----- Stripe Checkout (test item) -----
app.post(['/api/checkout/create-checkout-session', '/checkout/create-checkout-session'], createCheckoutSession)

// ----- E‑sign scaffolding -----
// Create a signing session (placeholder). In production, integrate DocuSign SDK here.
app.post(['/api/esign/create', '/esign/create'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  try {
    const { orderId } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    if (!orderId) return res.status(400).json({ error: 'missing_orderId' })
    const db = await getDb()
    const col = db.collection(ORDERS_COLLECTION)
    const { ObjectId } = await import('mongodb')
    const _id = new ObjectId(String(orderId))
    const order = await col.findOne({ _id })
    if (!order) return res.status(404).json({ error: 'not_found' })

    // Update status → signing and push timeline event
    await col.updateOne({ _id }, {
      $set: { status: 'signing', updatedAt: new Date() },
      $push: { timeline: { event: 'esign_started', at: new Date() } }
    })

    // Placeholder: normally we would create a DocuSign envelope and return the recipient view URL.
    const signUrl = `${getOrigin(req)}/checkout/confirm?orderId=${encodeURIComponent(String(orderId))}`
    return res.status(200).json({ url: signUrl })
  } catch (err) {
    console.error('esign create error', err)
    return res.status(500).json({ error: 'esign_create_failed' })
  }
})

// Webhook endpoint for e‑sign provider (placeholder). Protect with a shared secret.
app.post(['/api/esign/webhook', '/esign/webhook'], async (req, res) => {
  try {
    const secret = process.env.E_SIGN_WEBHOOK_SECRET || ''
    const header = req.headers['x-webhook-secret'] || req.headers['X-Webhook-Secret']
    if (secret && header !== secret) return res.status(401).json({ error: 'unauthorized' })

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { orderId, event = 'esign_completed' } = body
    if (!orderId) return res.status(400).json({ ok: true })
    const db = await getDb()
    const col = db.collection(ORDERS_COLLECTION)
    const { ObjectId } = await import('mongodb')
    const _id = new ObjectId(String(orderId))
    await col.updateOne({ _id }, {
      $set: { status: 'signed', updatedAt: new Date() },
      $push: { timeline: { event, at: new Date() } }
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('esign webhook error', err)
    return res.status(200).json({ ok: true })
  }
})

// TEMP: path probe for debugging rewrites/normalizer. Remove after verification.
app.all(['/api/what-path', '/what-path'], (req, res) => {
  return res.json({
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,
  })
})

// ----- PATCH/PUT model -----
async function handleModelWrite(req, res) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  const { code } = req.params
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { name, price, description, specs, features, packages, addOns } = body

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

  // Public site add-on packages (up to 4) and single add-ons
  if (Array.isArray(packages)) {
    $set.packages = packages.slice(0, 4).map((p, idx) => ({
      key: String(p?.key || `pkg${idx+1}`).slice(0, 40),
      name: String(p?.name || '').slice(0, 120),
      priceDelta: typeof p?.priceDelta === 'number' ? p.priceDelta : 0,
      description: typeof p?.description === 'string' ? String(p.description).slice(0, 5000) : '',
      items: Array.isArray(p?.items) ? p.items.map(i => String(i).slice(0, 200)).slice(0, 40) : [],
      images: Array.isArray(p?.images) ? p.images.map(u => String(u).slice(0, 1000)).slice(0, 12) : [],
    }))
  }
  if (Array.isArray(addOns)) {
    $set.addOns = addOns.slice(0, 40).map((a, idx) => ({
      id: String(a?.id || `addon${idx+1}`).slice(0, 40),
      name: String(a?.name || '').slice(0, 120),
      priceDelta: typeof a?.priceDelta === 'number' ? a.priceDelta : 0,
      description: typeof a?.description === 'string' ? String(a.description).slice(0, 2000) : '',
      image: a?.image ? String(a.image).slice(0, 1000) : '',
    }))
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
