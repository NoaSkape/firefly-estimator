export const runtime = 'nodejs'

import express from 'express'
import Stripe from 'stripe'
import { createHash } from 'node:crypto'

import { getDb } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { applyCors } from '../lib/cors.js'
import { findModelById, ensureModelIndexes, findOrCreateModel, COLLECTION } from '../lib/model-utils.js'
import { ensureOrderIndexes, createOrderDraft, getOrderById, updateOrder, listOrdersForUser, listOrdersAdmin, ORDERS_COLLECTION, setOrderPricingSnapshot, setOrderDelivery } from '../lib/orders.js'
import { ensureBuildIndexes, createBuild, getBuildById, listBuildsForUser, updateBuild, duplicateBuild, deleteBuild, renameBuild } from '../lib/builds.js'
// ensure mongodb import is only used where needed to avoid bundling issues
import { ensureIdempotencyIndexes, withIdempotency } from '../lib/idempotency.js'
import { quoteDelivery } from '../lib/delivery.js'
import { getOrgSettings, updateOrgSettings } from '../lib/settings.js'
import { getDeliveryQuote, roundToCents } from '../lib/delivery-quote.js'
import { createSubmission, downloadFile, uploadPdfToCloudinary, signedCloudinaryUrl } from '../lib/docuseal.js'
import { 
  ensureUserProfileIndexes, 
  getUserProfile, 
  updateUserProfile, 
  addUserAddress, 
  setPrimaryAddress, 
  getPrimaryAddress, 
  removeUserAddress, 
  updateUserBasicInfo, 
  getAutoFillData 
} from '../lib/user-profile.js'
import { z } from 'zod'
// import { Webhook } from 'svix' // Temporarily disabled - causing deployment crashes

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

function buildPrefillFromOrder(o, settings) {
  const buyer = o?.buyer || {}
  const snap = o?.pricingSnapshot || {}
  const rate = Number(snap.delivery_rate_per_mile || settings?.pricing?.delivery_rate_per_mile || 0)
  const minimum = Number(snap.delivery_minimum || settings?.pricing?.delivery_minimum || 0)
  const titleFee = Number(snap.title_fee || settings?.pricing?.title_fee_default || 0)
  const setupFee = Number(snap.setup_fee || settings?.pricing?.setup_fee_default || 0)
  const taxRatePct = Number(snap.tax_rate_percent || settings?.pricing?.tax_rate_percent || 0)
  const depositPct = Number(snap.deposit_percent || settings?.pricing?.deposit_percent || 0)

  const basePrice = Number(o?.pricing?.base || 0)
  const optionsSubtotal = Number(o?.pricing?.options || 0)
  const deliveryFee = Number(o?.delivery?.fee || 0)
  const taxableSubtotal = basePrice + optionsSubtotal + deliveryFee + titleFee + setupFee
  const salesTax = roundToCents(taxableSubtotal * (taxRatePct / 100))
  const totalPurchasePrice = roundToCents(taxableSubtotal + salesTax)
  const depositDue = roundToCents(totalPurchasePrice * (depositPct / 100))
  const finalPayment = roundToCents(totalPurchasePrice - depositDue)

  // Options arrays
  const opts = Array.isArray(o?.selections) ? o.selections : []
  const option_category = opts.map(_ => 'Options')
  const option_description = opts.map(x => x.label || x.name || '')
  const option_variant = opts.map(_ => '')
  const option_quantity = opts.map(x => Number(x.quantity || 1))
  const option_unit_price = opts.map(x => roundToCents(x.priceDelta || x.price || 0))
  const option_line_total = option_unit_price.map((p, i) => roundToCents(p * option_quantity[i]))

  return {
    order_number: o.orderId || String(o?._id || ''),
    order_date: new Date(o?.createdAt || Date.now()).toISOString().slice(0, 10),
    buyer1_full_name: [buyer.firstName, buyer.lastName].filter(Boolean).join(' ').trim(),
    buyer1_email: buyer.email || '',
    buyer1_phone: buyer.phone || '',
    buyer1_mailing_address: [buyer.address, buyer.city, buyer.state, buyer.zip].filter(Boolean).join(', '),
    buyer2_full_name: buyer?.coBuyer?.fullName || '',
    buyer2_email: buyer?.coBuyer?.email || '',
    buyer2_phone: buyer?.coBuyer?.phone || '',
    buyer2_mailing_address: buyer?.coBuyer?.address || '',
    delivery_address: o?.delivery?.address || '',

    brand: 'Firefly Tiny Homes',
    model_no: o?.model?.slug || o?.model?.modelCode || '',
    model_year: String(new Date().getFullYear()),
    model_size: o?.model?.size || '',
    base_home: basePrice,
    unit_serial: o?.unit_serial || '',

    option_category,
    option_description,
    option_variant,
    option_quantity,
    option_unit_price,
    option_line_total,

    base_price: basePrice,
    options_subtotal: optionsSubtotal,
    delivery_fee: deliveryFee,
    title_fee: titleFee,
    setup_fee: setupFee,
    tax_rate: taxRatePct,
    sales_tax: salesTax,
    total_purchase_price: totalPurchasePrice,
    deposit_percent: depositPct,
    deposit_due_amount: depositDue,
    final_payment_total: finalPayment,

    delivery_miles: Number(o?.delivery?.miles || 0),
    delivery_rate_per_mile: rate,
    delivery_minimum: minimum,
  }
}

async function startContractFlow(orderId, req) {
  await ensureOrderIndexes()
  const order = await getOrderById(orderId)
  if (!order) throw new Error('order_not_found')
  const settings = await getOrgSettings()
  // Ensure snapshot
  if (!order.pricingSnapshot) {
    const snap = {
      delivery_rate_per_mile: Number(settings?.pricing?.delivery_rate_per_mile || 0),
      delivery_minimum: Number(settings?.pricing?.delivery_minimum || 0),
      title_fee: Number(settings?.pricing?.title_fee_default || 0),
      setup_fee: Number(settings?.pricing?.setup_fee_default || 0),
      tax_rate_percent: Number(settings?.pricing?.tax_rate_percent || 0),
      deposit_percent: Number(settings?.pricing?.deposit_percent || 0),
    }
    await setOrderPricingSnapshot(orderId, snap)
  }
  const fresh = await getOrderById(orderId)
  if (!fresh?.delivery?.miles || !fresh?.delivery?.fee) {
    const addr = fresh?.delivery?.address
    if (addr) {
      const dq = await getDeliveryQuote(addr, settings)
      await setOrderDelivery(orderId, { address: dq.destinationAddress, miles: dq.miles, fee: dq.fee })
    }
  }
  const o = await getOrderById(orderId)
  const templateId = Number(process.env.DOCUSEAL_PURCHASE_TEMPLATE_ID || o?.contract?.templateId || 0)
  if (!templateId) throw new Error('missing_template')
  const prefill = buildPrefillFromOrder(o, settings)
  const redirectBase = getOrigin(req)
  const redirectCompleted = `${redirectBase}/checkout/${encodeURIComponent(String(o._id))}/confirm`
  const redirectCancel = `${redirectBase}/checkout/${encodeURIComponent(String(o._id))}/review`
  const { submissionId, signerUrl, raw } = await createSubmission({ templateId, prefill, sendEmail: false, order: 'preserved', completedRedirectUrl: redirectCompleted, cancelRedirectUrl: redirectCancel })
  const buyerUrl = signerUrl
  await updateOrder(orderId, {
    contract: {
      templateId,
      submissionId,
      status: 'OUT_FOR_SIGNATURE',
      signerLinks: { buyer1: buyerUrl },
      versions: Array.isArray(o?.contract?.versions) ? o.contract.versions : [{ type: 'base', total: prefill.total_purchase_price, signedAt: null }],
      events: [{ type: 'sent', at: new Date().toISOString() }],
    }
  })
  return { submissionId, signerUrl: buyerUrl, order: o, raw }
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

// Preserve original path for deployments that rewrite to /api/index/...
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
  if (p) {
    req.url = String(p).startsWith('/') ? String(p) : `/${String(p)}`
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

app.post(['/api/delivery/quote', '/delivery/quote'], async (req, res) => {
  const auth = await requireAuth(req, res, false) // Optional auth for signed-in users
  const { address, city, state, zip } = req.body || {}
  
  if (!zip) return res.status(400).json({ error: 'missing_zip' })
  
  try {
    // Build full address string
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ')
    
    // Get settings for delivery calculation
    const settings = await getOrgSettings()
    
    // Use the proper delivery quote function
    const result = await getDeliveryQuote(fullAddress, settings)
    
    return res.status(200).json(result)
  } catch (error) {
    console.error('Delivery quote error:', error)
    return res.status(500).json({ error: 'delivery_calculation_failed' })
  }
})

// ===== Contracts status proxy for portal card (signed download URL short link)
app.get(['/api/contracts/:orderId/download', '/contracts/:orderId/download'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  const o = await getOrderById(req.params.orderId)
  if (!o) return res.status(404).json({ error: 'not_found' })
  if (o.userId !== auth.userId) {
    const admin = await requireAuth(req, res, true)
    if (!admin?.userId) return
  }
  const pubId = o?.contract?.signedPdfPublicId
  if (!pubId) return res.status(404).json({ error: 'no_signed_pdf' })
  const url = signedCloudinaryUrl(pubId)
  return res.redirect(302, url)
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

// ===== Admin Settings (Pricing & Fees) =====
app.get(['/api/admin/settings', '/admin/settings'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  const s = await getOrgSettings()
  return res.status(200).json(s)
})

// Public, read-only settings for unauthenticated flows (safe subset)
app.get(['/api/settings', '/settings'], async (_req, res) => {
  try {
    const s = await getOrgSettings()
    // Expose only the fields needed publicly
    const safe = {
      factory: {
        name: s?.factory?.name,
        address: s?.factory?.address,
      },
      pricing: {
        title_fee_default: Number(s?.pricing?.title_fee_default || 500),
        setup_fee_default: Number(s?.pricing?.setup_fee_default || 3000),
        tax_rate_percent: Number(s?.pricing?.tax_rate_percent || 6.25),
        delivery_rate_per_mile: Number(s?.pricing?.delivery_rate_per_mile || 0),
        delivery_minimum: Number(s?.pricing?.delivery_minimum || 0),
        deposit_percent: Number(s?.pricing?.deposit_percent || 25),
      },
    }
    return res.status(200).json(safe)
  } catch (err) {
    return res.status(200).json({
      factory: { name: 'Firefly Tiny Homes', address: 'Mansfield, TX' },
      pricing: { title_fee_default: 500, setup_fee_default: 3000, tax_rate_percent: 6.25, delivery_rate_per_mile: 0, delivery_minimum: 0, deposit_percent: 25 }
    })
  }
})

app.put(['/api/admin/settings', '/admin/settings'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const updated = await updateOrgSettings(body, auth.userId)
    return res.status(200).json(updated)
  } catch (err) {
    return res.status(400).json({ error: 'invalid_settings', message: String(err?.message || err) })
  }
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

// ===== Contracts (DocuSeal) =====
app.post(['/api/contracts/create', '/contracts/create'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { orderId } = body
    if (!orderId) return res.status(400).json({ error: 'missing_orderId' })

    await ensureOrderIndexes()
    const order = await getOrderById(orderId)
    if (!order) return res.status(404).json({ error: 'order_not_found' })
    const isOwner = order.userId && auth.userId === order.userId
    if (!isOwner) {
      const admin = await requireAuth(req, res, true)
      if (!admin?.userId) return
    }

    // Reuse existing submission if not completed
    if (order?.contract?.submissionId && order?.contract?.status !== 'COMPLETED') {
      return res.status(200).json({ signerUrl: order?.contract?.signerLinks?.buyer1, submissionId: order.contract.submissionId })
    }

    const { signerUrl, submissionId, raw } = await startContractFlow(orderId, req)
    return res.status(200).json({ signerUrl, submissionId, raw })
  } catch (err) {
    console.error('contracts/create error', err)
    return res.status(500).json({ error: 'contracts_create_failed', message: String(err?.message || err) })
  }
})

app.get(['/api/contracts/status', '/contracts/status'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  const orderId = String(req.query?.orderId || '')
  if (!orderId) return res.status(400).json({ error: 'missing_orderId' })
  const o = await getOrderById(orderId)
  if (!o) return res.status(404).json({ error: 'not_found' })
  if (o.userId !== auth.userId) {
    const admin = await requireAuth(req, res, true)
    if (!admin?.userId) return
  }
  const { status, signedPdfUrl, auditTrailUrl } = o.contract || {}
  return res.status(200).json({ status, signedPdfUrl, auditTrailUrl })
})

app.get(['/api/contracts/download-signed', '/contracts/download-signed'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  const orderId = String(req.query?.orderId || '')
  if (!orderId) return res.status(400).json({ error: 'missing_orderId' })
  const o = await getOrderById(orderId)
  if (!o) return res.status(404).json({ error: 'not_found' })
  if (o.userId !== auth.userId) {
    const admin = await requireAuth(req, res, true)
    if (!admin?.userId) return
  }
  const pubId = o?.contract?.signedPdfPublicId
  if (!pubId) return res.status(404).json({ error: 'no_signed_pdf' })
  const url = signedCloudinaryUrl(pubId)
  return res.status(200).json({ url })
})

app.post(['/api/contracts/change-order', '/contracts/change-order'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  // Minimal stub – compute delta using pricingSnapshot and create a new submission
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { orderId, deltaTotal = 0 } = body
    if (!orderId) return res.status(400).json({ error: 'missing_orderId' })
    const o = await getOrderById(orderId)
    if (!o) return res.status(404).json({ error: 'not_found' })
    if (o.userId !== auth.userId) {
      const admin = await requireAuth(req, res, true)
      if (!admin?.userId) return
    }
    const settings = await getOrgSettings()
    const templateId = Number(process.env.DOCUSEAL_ADDENDUM_TEMPLATE_ID || 0)
    if (!templateId) return res.status(500).json({ error: 'missing_template' })
    const prefill = { order_number: o.orderId || String(o._id), addendum_delta: roundToCents(deltaTotal) }
    const { submissionId, signerUrl } = await createSubmission({ templateId, prefill, sendEmail: false, order: 'preserved', completedRedirectUrl: `${getOrigin(req)}/portal`, cancelRedirectUrl: `${getOrigin(req)}/portal` })
    const code = `CO-${String((o?.contract?.versions||[]).filter(v=>v.type==='addendum').length+1).padStart(3,'0')}`
    await updateOrder(orderId, { contract: { ...(o.contract||{}), status: 'OUT_FOR_SIGNATURE', submissionId, signerLinks: { buyer1: signerUrl }, versions: [ ...(o.contract?.versions||[]), { type: 'addendum', code, delta: roundToCents(deltaTotal), signedAt: null } ] } })
    return res.status(200).json({ signerUrl, submissionId, code })
  } catch (err) {
    console.error('change-order error', err)
    return res.status(500).json({ error: 'change_order_failed', message: String(err?.message || err) })
  }
})

app.post(['/api/webhooks/docuseal', '/webhooks/docuseal'], async (req, res) => {
  try {
    const secret = process.env.DOCUSEAL_WEBHOOK_SECRET || ''
    const header = req.headers['x-docuseal-signature'] || req.headers['X-DocuSeal-Signature']
    if (!secret || header !== secret) return res.status(401).json({ error: 'unauthorized' })

    const db = await getDb()
    const col = db.collection(ORDERS_COLLECTION)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const type = body?.event || body?.type || ''
    const submissionId = body?.submission_id || body?.submission?.id || body?.data?.submission_id
    if (!submissionId) return res.status(200).json({ ok: true })

    const order = await col.findOne({ 'contract.submissionId': submissionId })
    if (!order) return res.status(200).json({ ok: true })

    // Log event
    await col.updateOne({ _id: order._id }, { $push: { 'contract.events': { type, at: new Date().toISOString(), raw: body } } })

    if (type === 'form.completed' || type === 'completed') {
      const fileUrl = body?.file_url || body?.document_url || body?.data?.files?.[0]?.download_url || body?.data?.document_url
      const certUrl = body?.certificate_url || body?.data?.certificate_url || body?.audit_trail_url
      let signedPdfPublicId = order?.contract?.signedPdfPublicId
      let signedPdfUrl
      if (fileUrl) {
        try {
          const buf = await downloadFile(fileUrl)
          const up = await uploadPdfToCloudinary({ buffer: buf, folder: 'firefly-estimator/contracts', publicId: `order_${String(order._id)}_${Date.now()}` })
          signedPdfPublicId = up.public_id
          signedPdfUrl = signedCloudinaryUrl(signedPdfPublicId)
        } catch (e) {
          console.error('Upload signed PDF failed', e)
        }
      }
      await col.updateOne({ _id: order._id }, { $set: { 'contract.status': 'COMPLETED', 'contract.auditTrailUrl': certUrl || order?.contract?.auditTrailUrl || null, 'contract.signedPdfPublicId': signedPdfPublicId, 'contract.signedPdfUrl': signedPdfUrl } })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('docuseal webhook error', err)
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

// TEMP: debug builds endpoint
app.get(['/api/debug-builds', '/debug-builds'], async (req, res) => {
  try {
    const db = await getDb()
    const col = db.collection(BUILDS_COLLECTION)
    const builds = await col.find({}).toArray()
    
    const debugData = builds.map(build => ({
      id: String(build._id),
      modelName: build.modelName,
      modelSlug: build.modelSlug,
      basePrice: build.selections?.basePrice,
      pricing: build.pricing,
      optionsCount: build.selections?.options?.length || 0,
      createdAt: build.createdAt
    }))
    
    return res.json({
      total: builds.length,
      builds: debugData
    })
  } catch (err) {
    console.error('Debug builds error:', err)
    return res.status(500).json({ error: 'debug_failed' })
  }
})

// Debug endpoint to check Google Maps API configuration
app.get(['/api/debug/maps', '/debug/maps'], async (req, res) => {
  try {
    const googleKey = process.env.GOOGLE_MAPS_KEY || ''
    const mapboxToken = process.env.MAPBOX_TOKEN || ''
    const settings = await getOrgSettings()
    
    return res.status(200).json({
      hasGoogleKey: !!googleKey,
      googleKeyLength: googleKey.length,
      hasMapboxToken: !!mapboxToken,
      mapboxTokenLength: mapboxToken.length,
      factoryAddress: settings?.factory?.address || '606 S 2nd Ave, Mansfield, TX 76063',
      deliveryRate: settings?.pricing?.delivery_rate_per_mile || 12.5,
      deliveryMinimum: settings?.pricing?.delivery_minimum || 2000
    })
  } catch (error) {
    console.error('Debug maps error:', error)
    return res.status(500).json({ error: 'debug_failed' })
  }
})

// Debug endpoint to test delivery calculation for a specific address
app.get(['/api/debug/delivery', '/debug/delivery'], async (req, res) => {
  try {
    const { address } = req.query
    if (!address) {
      return res.status(400).json({ error: 'address parameter required' })
    }
    
    const { getDeliveryQuote } = await import('./lib/delivery-quote.js')
    const { getOrgSettings } = await import('./lib/settings.js')
    const settings = await getOrgSettings()
    
    const result = await getDeliveryQuote(address, settings)
    
    return res.status(200).json({
      address,
      result,
      expectedCalculation: `${result.miles} miles × $${result.ratePerMile}/mile = $${result.miles * result.ratePerMile}`,
      finalFee: result.fee,
      settings: {
        factoryAddress: settings?.factory?.address,
        deliveryRate: settings?.pricing?.delivery_rate_per_mile,
        deliveryMinimum: settings?.pricing?.delivery_minimum
      }
    })
  } catch (error) {
    console.error('Debug delivery error:', error)
    return res.status(500).json({ error: 'debug_failed', message: error.message })
  }
})

// ===== Builds (new) =====
// Create build (from model or migrated guest draft)
app.post(['/api/builds', '/builds'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  await ensureBuildIndexes()
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const doc = await createBuild({
      userId: auth.userId,
      modelSlug: String(body.modelSlug || ''),
      modelName: String(body.modelName || ''),
      basePrice: Number(body.basePrice || 0),
      selections: body.selections || {},
      financing: body.financing || {},
      buyerInfo: body.buyerInfo || {},
    })
    return res.status(200).json({ ok: true, buildId: String(doc._id) })
  } catch (err) {
    return res.status(400).json({ error: 'invalid_build', message: String(err?.message || err) })
  }
})

// List builds for current user
app.get(['/api/builds', '/builds'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  await ensureBuildIndexes()
  const list = await listBuildsForUser(auth.userId)
  return res.status(200).json(list)
})

// Get single build
app.get(['/api/builds/:id', '/builds/:id'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  const b = await getBuildById(req.params.id)
  if (!b || b.userId !== auth.userId) return res.status(404).json({ error: 'not_found' })
  return res.status(200).json(b)
})

// Update build
app.patch(['/api/builds/:id', '/builds/:id'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  const b = await getBuildById(req.params.id)
  if (!b || b.userId !== auth.userId) return res.status(404).json({ error: 'not_found' })
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const updated = await updateBuild(req.params.id, body)
  return res.status(200).json(updated)
})

// Duplicate build
app.post(['/api/builds/:id/duplicate', '/builds/:id/duplicate'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  const copy = await duplicateBuild(req.params.id, auth.userId)
  if (!copy) return res.status(404).json({ error: 'not_found' })
  return res.status(200).json({ ok: true, buildId: String(copy._id) })
})

// Rename build
app.post(['/api/builds/:id/rename', '/builds/:id/rename'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  try {
    const { id } = req.params
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { name } = body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'invalid_name', message: 'Build name is required' })
    }
    const doc = await renameBuild(id, auth.userId, name.trim())
    if (!doc) return res.status(404).json({ error: 'build_not_found' })
    return res.status(200).json({ ok: true, build: doc })
  } catch (err) {
    return res.status(400).json({ error: 'rename_failed', message: String(err?.message || err) })
  }
})

// Delete build
app.delete(['/api/builds/:id', '/builds/:id'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  const result = await deleteBuild(req.params.id, auth.userId)
  return res.status(200).json({ ok: true, deleted: result?.deletedCount || 0 })
})

// Advance/retreat checkout step with minimal validation
app.post(['/api/builds/:id/checkout-step', '/builds/:id/checkout-step'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  const b = await getBuildById(req.params.id)
  if (!b || b.userId !== auth.userId) return res.status(404).json({ error: 'not_found' })
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const target = Number(body?.step || b.step)
  if (target < 1 || target > 8) return res.status(400).json({ error: 'invalid_step' })
  
  // Validation logic - only check requirements for steps that actually need them
  if (target >= 4) {
    const bi = b?.buyerInfo || {}
    const ok = bi.firstName && bi.lastName && bi.email && bi.address
    if (!ok) return res.status(400).json({ error: 'incomplete_buyer' })
  }
  
  // Only check financing for payment method step (step 6)
  if (target >= 6 && !(b?.financing?.method)) {
    return res.status(400).json({ error: 'missing_payment_method' })
  }
  
  // Only check contract for contract step (step 7)
  if (target >= 7) {
    const c = b?.contract || {}
    if (c?.status !== 'signed') return res.status(400).json({ error: 'contract_not_signed' })
  }
  
  const updated = await updateBuild(req.params.id, { step: target })
  return res.status(200).json(updated)
})

// Bridge: create order from build and start DocuSeal; returns signer url
app.post(['/api/builds/:id/contract', '/builds/:id/contract'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    const b = await getBuildById(req.params.id)
    if (!b || b.userId !== auth.userId) return res.status(404).json({ error: 'not_found' })

    const db = await getDb()
    const orders = db.collection(ORDERS_COLLECTION)

    // Find existing order linked to build
    let order = await orders.findOne({ userId: auth.userId, buildId: String(b._id) })
    if (!order) {
      // Create minimal order document from build
      const now = new Date()
      const doc = {
        userId: auth.userId,
        buildId: String(b._id),
        status: 'draft',
        model: { name: b.modelName, slug: b.modelSlug },
        selections: Array.isArray(b?.selections?.options) ? b.selections.options.map(o=>({ key: o.id||o.key, label: o.name||o.label, priceDelta: Number(o.price||o.priceDelta||0), quantity: Number(o.quantity||1) })) : [],
        pricing: b.pricing || {},
        buyer: b.buyerInfo || {},
        delivery: { address: b?.buyerInfo?.deliveryAddress || b?.buyerInfo?.address || '' },
        timeline: [{ event: 'created_from_build', at: now }],
        createdAt: now,
        updatedAt: now,
      }
      const r = await orders.insertOne(doc)
      order = { ...doc, _id: r.insertedId }
    }

    // Call unified contracts/create endpoint
    req.body = JSON.stringify({ orderId: String(order._id) })
    return app._router.handle(req, res, () => {})
  } catch (error) {
    console.error('Build→contract error:', error)
    return res.status(500).json({ error: 'contract_bridge_failed', message: error.message || 'Failed to start contract' })
  }
})

// Analytics endpoint
app.post(['/api/analytics/event', '/analytics/event'], async (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { event, sessionId, timestamp, url, properties } = body
    
    // Store analytics event in database
    const db = await getDb()
    const analyticsCol = db.collection('Analytics')
    
    const analyticsEvent = {
      event,
      sessionId,
      timestamp: new Date(timestamp || Date.now()),
      url,
      properties,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      createdAt: new Date()
    }
    
    await analyticsCol.insertOne(analyticsEvent)
    
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Analytics event error:', error)
    return res.status(500).json({ error: 'analytics_failed' })
  }
})

// ----- User Profile Management -----

// Get user profile
app.get(['/api/profile', '/profile'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    await ensureUserProfileIndexes()
    const profile = await getUserProfile(auth.userId)
    return res.status(200).json(profile || {})
  } catch (error) {
    console.error('Get profile error:', error)
    return res.status(500).json({ error: 'profile_fetch_failed' })
  }
})

// Update user profile basic info
app.patch(['/api/profile/basic', '/profile/basic'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    console.log('DEBUG: Starting profile/basic update for user:', auth.userId)
    
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { firstName, lastName, email, phone } = body
    
    console.log('DEBUG: Request body:', { firstName, lastName, email, phone })
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      console.log('DEBUG: Missing required fields')
      return res.status(400).json({ error: 'missing_required_fields', message: 'First name, last name, and email are required' })
    }
    
    console.log('DEBUG: Ensuring user profile indexes...')
    await ensureUserProfileIndexes()
    console.log('DEBUG: Indexes ensured successfully')
    
    console.log('DEBUG: Updating user basic info...')
    const profile = await updateUserBasicInfo(auth.userId, { firstName, lastName, email, phone })
    
    console.log('DEBUG: Basic info updated successfully:', profile)
    return res.status(200).json(profile)
  } catch (error) {
    console.error('Update profile error:', error)
    console.error('Error stack:', error.stack)
    
    // Check for specific error types
    if (error.message.includes('MONGODB_URI is not configured')) {
      return res.status(503).json({ error: 'database_config_missing', message: 'Database configuration is missing' })
    }
    
    if (error.message.includes('userId is required')) {
      return res.status(400).json({ error: 'invalid_user', message: 'User ID is required' })
    }
    
    if (error.message.includes('database') || error.message.includes('MongoDB')) {
      return res.status(503).json({ error: 'database_unavailable', message: 'Database temporarily unavailable' })
    }
    
    return res.status(500).json({ error: 'profile_update_failed', message: error.message })
  }
})

// Get user addresses
app.get(['/api/profile/addresses', '/profile/addresses'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    await ensureUserProfileIndexes()
    const profile = await getUserProfile(auth.userId)
    const addresses = profile?.addresses || []
    return res.status(200).json(addresses)
  } catch (error) {
    console.error('Get addresses error:', error)
    return res.status(500).json({ error: 'addresses_fetch_failed' })
  }
})

// Add new address
app.post(['/api/profile/addresses', '/profile/addresses'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    console.log('DEBUG: Starting addUserAddress for user:', auth.userId)
    
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { address, city, state, zip, label } = body
    
    console.log('DEBUG: Request body:', { address, city, state, zip, label })
    
    if (!address || !city || !state || !zip) {
      console.log('DEBUG: Missing address fields')
      return res.status(400).json({ error: 'address_fields_required', message: 'Address, city, state, and zip are required' })
    }
    
    console.log('DEBUG: Ensuring user profile indexes...')
    await ensureUserProfileIndexes()
    console.log('DEBUG: Indexes ensured successfully')
    
    console.log('DEBUG: Adding user address...')
    const profile = await addUserAddress(auth.userId, { address, city, state, zip, label })
    
    console.log('DEBUG: Address added successfully:', profile)
    return res.status(200).json(profile)
  } catch (error) {
    console.error('Add address error:', error)
    console.error('Error stack:', error.stack)
    
    // Check for specific error types
    if (error.message.includes('MONGODB_URI is not configured')) {
      return res.status(503).json({ error: 'database_config_missing', message: 'Database configuration is missing' })
    }
    
    if (error.message.includes('userId and address are required')) {
      return res.status(400).json({ error: 'invalid_request', message: 'User ID and address are required' })
    }
    
    if (error.message.includes('database') || error.message.includes('MongoDB')) {
      return res.status(503).json({ error: 'database_unavailable', message: 'Database temporarily unavailable' })
    }
    
    return res.status(500).json({ error: 'address_add_failed', message: error.message })
  }
})

// Set primary address
app.patch(['/api/profile/addresses/:addressId/primary', '/profile/addresses/:addressId/primary'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    const { addressId } = req.params
    if (!addressId) {
      return res.status(400).json({ error: 'address_id_required' })
    }
    
    await ensureUserProfileIndexes()
    const profile = await setPrimaryAddress(auth.userId, addressId)
    
    return res.status(200).json(profile)
  } catch (error) {
    console.error('Set primary address error:', error)
    return res.status(500).json({ error: 'set_primary_failed' })
  }
})

// Remove address
app.delete(['/api/profile/addresses/:addressId', '/profile/addresses/:addressId'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    const { addressId } = req.params
    if (!addressId) {
      return res.status(400).json({ error: 'address_id_required' })
    }
    
    await ensureUserProfileIndexes()
    const profile = await removeUserAddress(auth.userId, addressId)
    
    return res.status(200).json(profile)
  } catch (error) {
    console.error('Remove address error:', error)
    return res.status(500).json({ error: 'address_remove_failed' })
  }
})

// Get auto-fill data
app.get(['/api/profile/autofill', '/profile/autofill'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    console.log('DEBUG: Getting autofill data for user:', auth.userId)
    await ensureUserProfileIndexes()
    const autoFillData = await getAutoFillData(auth.userId)
    console.log('DEBUG: Autofill data:', autoFillData)
    return res.status(200).json(autoFillData)
  } catch (error) {
    console.error('Get autofill error:', error)
    return res.status(500).json({ error: 'autofill_fetch_failed', message: error.message })
  }
})

// Debug endpoint to test profile system
app.get(['/api/profile/debug', '/profile/debug'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return

  try {
    console.log('DEBUG: Testing profile system for user:', auth.userId)
    
    // Test database connection
    console.log('DEBUG: Testing database connection...')
    const db = await getDb()
    console.log('DEBUG: Database connection successful')
    
    // Test profile indexes
    console.log('DEBUG: Testing profile indexes...')
    await ensureUserProfileIndexes()
    console.log('DEBUG: Profile indexes ensured')
    
    // Test getting profile
    console.log('DEBUG: Testing get profile...')
    const profile = await getUserProfile(auth.userId)
    console.log('DEBUG: Profile retrieved:', !!profile)
    
    // Test getting auto-fill data
    console.log('DEBUG: Testing auto-fill data...')
    const autoFillData = await getAutoFillData(auth.userId)
    console.log('DEBUG: Auto-fill data retrieved:', !!autoFillData)
    
    // Test getting primary address
    console.log('DEBUG: Testing primary address...')
    const primaryAddress = await getPrimaryAddress(auth.userId)
    console.log('DEBUG: Primary address retrieved:', !!primaryAddress)
    
    return res.status(200).json({
      userId: auth.userId,
      databaseConnected: true,
      profileExists: !!profile,
      autoFillDataExists: !!autoFillData,
      primaryAddressExists: !!primaryAddress,
      profile: profile || null,
      autoFillData: autoFillData || {},
      primaryAddress: primaryAddress || null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Profile debug error:', error)
    console.error('Error stack:', error.stack)
    
    return res.status(500).json({ 
      error: 'debug_failed', 
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }
})

// Check contract status
app.get(['/api/builds/:id/contract/status', '/builds/:id/contract/status'], async (req, res) => {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return
  
  try {
    const b = await getBuildById(req.params.id)
    if (!b || b.userId !== auth.userId) return res.status(404).json({ error: 'not_found' })
    
    if (!b.contract?.agreementId) {
      return res.status(404).json({ error: 'no_contract', message: 'No contract found for this build' })
    }

    // Import Adobe Sign integration
    const { default: adobeSign } = await import('../src/utils/adobeSign.js')
    
    // Get agreement status
    const status = await adobeSign.getAgreementStatus(b.contract.agreementId)
    
    // Update build if status changed
    if (status.status !== b.contract.status) {
      await updateBuild(req.params.id, { 
        contract: { 
          ...b.contract,
          status: status.status,
          updatedAt: new Date()
        }
      })
    }
    
    return res.status(200).json(status)
    
  } catch (error) {
    console.error('Contract status check error:', error)
    return res.status(500).json({ 
      error: 'status_check_failed', 
      message: error.message || 'Failed to check contract status'
    })
  }
})

// ===== ADMIN ENDPOINTS =====

// Admin middleware to check admin status
async function requireAdmin(req, res) {
  const auth = await requireAuth(req, res, true)
  if (!auth?.userId) return null
  return auth
}

// Get admin statistics
app.get(['/api/admin/stats', '/admin/stats'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const db = await getDb()
    
    // Get user count
    const totalUsers = await db.collection('users').countDocuments()
    
    // Get build count
    const totalBuilds = await db.collection('builds').countDocuments()
    
    // Get order count and revenue
    const orders = await db.collection('orders').find({}).toArray()
    const totalOrders = orders.length
    const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    
    // Calculate conversion rate (orders / builds)
    const conversionRate = totalBuilds > 0 ? (totalOrders / totalBuilds) * 100 : 0
    
    // Get active users (users with activity in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const activeUsers = await db.collection('users').countDocuments({
      lastActivity: { $gte: thirtyDaysAgo }
    })
    
    return res.status(200).json({
      totalUsers,
      totalBuilds,
      totalOrders,
      revenue,
      conversionRate,
      activeUsers
    })
    
  } catch (error) {
    console.error('Admin stats error:', error)
    return res.status(500).json({ 
      error: 'stats_failed', 
      message: error.message || 'Failed to load admin statistics'
    })
  }
})

// Get recent admin activity
app.get(['/api/admin/activity', '/admin/activity'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const db = await getDb()
    
    // Get recent activity from analytics collection
    const activity = await db.collection('analytics')
      .find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray()
    
    const formattedActivity = activity.map(item => ({
      action: item.eventName,
      description: item.properties?.message || item.eventName,
      timestamp: item.timestamp,
      userId: item.userId,
      sessionId: item.sessionId
    }))
    
    return res.status(200).json(formattedActivity)
    
  } catch (error) {
    console.error('Admin activity error:', error)
    return res.status(500).json({ 
      error: 'activity_failed', 
      message: error.message || 'Failed to load recent activity'
    })
  }
})

// Get all users for admin
app.get(['/api/admin/users', '/admin/users'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const db = await getDb()
    
    const users = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()
    
    return res.status(200).json(users)
    
  } catch (error) {
    console.error('Admin users error:', error)
    return res.status(500).json({ 
      error: 'users_failed', 
      message: error.message || 'Failed to load users'
    })
  }
})

// Bulk user operations
app.post(['/api/admin/users/bulk', '/admin/users/bulk'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { action, userIds } = req.body
    
    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ 
        error: 'invalid_request', 
        message: 'Action and userIds array are required' 
      })
    }
    
    const db = await getDb()
    let result
    
    switch (action) {
      case 'activate':
        result = await db.collection('users').updateMany(
          { _id: { $in: userIds.map(id => new ObjectId(id)) } },
          { $set: { status: 'active', updatedAt: new Date() } }
        )
        break
        
      case 'deactivate':
        result = await db.collection('users').updateMany(
          { _id: { $in: userIds.map(id => new ObjectId(id)) } },
          { $set: { status: 'inactive', updatedAt: new Date() } }
        )
        break
        
      case 'delete':
        result = await db.collection('users').deleteMany({
          _id: { $in: userIds.map(id => new ObjectId(id)) }
        })
        break
        
      default:
        return res.status(400).json({ 
          error: 'invalid_action', 
          message: 'Invalid action specified' 
        })
    }
    
    // Log admin action
    await db.collection('analytics').insertOne({
      eventName: 'admin_bulk_action',
      userId: auth.userId,
      sessionId: req.headers['x-session-id'] || 'unknown',
      timestamp: new Date(),
      properties: {
        action,
        userCount: userIds.length,
        affectedUsers: userIds
      }
    })
    
    return res.status(200).json({
      success: true,
      action,
      affectedCount: result.modifiedCount || result.deletedCount,
      message: `${action} completed for ${result.modifiedCount || result.deletedCount} users`
    })
    
  } catch (error) {
    console.error('Bulk user operation error:', error)
    return res.status(500).json({ 
      error: 'bulk_operation_failed', 
      message: error.message || 'Failed to perform bulk operation'
    })
  }
})

// Data export endpoints
app.get(['/api/admin/export/:type', '/admin/export/:type'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { type } = req.params
    const db = await getDb()
    
    let data = []
    let filename = ''
    
    switch (type) {
      case 'users':
        data = await db.collection('users').find({}).toArray()
        filename = 'users_export'
        break
        
      case 'builds':
        data = await db.collection('builds').find({}).toArray()
        filename = 'builds_export'
        break
        
      case 'orders':
        data = await db.collection('orders').find({}).toArray()
        filename = 'orders_export'
        break
        
      case 'analytics':
        data = await db.collection('analytics').find({}).toArray()
        filename = 'analytics_export'
        break
        
      default:
        return res.status(400).json({ 
          error: 'invalid_export_type', 
          message: 'Invalid export type' 
        })
    }
    
    // Convert to CSV
    const csv = convertToCSV(data)
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`)
    
    return res.status(200).send(csv)
    
  } catch (error) {
    console.error('Data export error:', error)
    return res.status(500).json({ 
      error: 'export_failed', 
      message: error.message || 'Failed to export data'
    })
  }
})

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = []
  
  // Add headers
  csvRows.push(headers.join(','))
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      // Handle special characters and wrap in quotes if needed
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value || ''
    })
    csvRows.push(values.join(','))
  }
  
  return csvRows.join('\n')
}

// Advanced reporting endpoints
app.post(['/api/admin/reports', '/admin/reports'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { dateRange, modelFilter, userType } = req.body
    const db = await getDb()
    
    // Calculate date range
    const now = new Date()
    let startDate
    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    // Generate funnel data
    const funnelData = await generateFunnelData(db, startDate, now)
    
    // Generate revenue data
    const revenueData = await generateRevenueData(db, startDate, now)
    
    // Generate user activity data
    const userActivity = await generateUserActivityData(db, startDate, now)
    
    // Generate model performance data
    const modelPerformance = await generateModelPerformanceData(db, startDate, now)
    
    return res.status(200).json({
      funnelData,
      revenueData,
      userActivity,
      modelPerformance
    })
    
  } catch (error) {
    console.error('Advanced reporting error:', error)
    return res.status(500).json({ 
      error: 'reporting_failed', 
      message: error.message || 'Failed to generate report'
    })
  }
})

// Export advanced reports
app.post(['/api/admin/reports/export', '/admin/reports/export'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { filters, chartType, format } = req.body
    const db = await getDb()
    
    // Generate report data based on chart type
    let reportData = []
    let filename = ''
    
    switch (chartType) {
      case 'funnel':
        reportData = await generateFunnelData(db, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
        filename = 'funnel_report'
        break
      case 'revenue':
        reportData = await generateRevenueData(db, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
        filename = 'revenue_report'
        break
      case 'activity':
        reportData = await generateUserActivityData(db, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
        filename = 'activity_report'
        break
      case 'models':
        reportData = await generateModelPerformanceData(db, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
        filename = 'models_report'
        break
      default:
        return res.status(400).json({ 
          error: 'invalid_chart_type', 
          message: 'Invalid chart type' 
        })
    }
    
    if (format === 'pdf') {
      // For PDF export, return JSON data (frontend can handle PDF generation)
      return res.status(200).json({
        data: reportData,
        filename: `${filename}_${new Date().toISOString().split('T')[0]}.json`
      })
    } else {
      // CSV export
      const csv = convertToCSV(reportData)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`)
      return res.status(200).send(csv)
    }
    
  } catch (error) {
    console.error('Report export error:', error)
    return res.status(500).json({ 
      error: 'export_failed', 
      message: error.message || 'Failed to export report'
    })
  }
})

// Helper functions for report generation
async function generateFunnelData(db, startDate, endDate) {
  const analytics = await db.collection('analytics')
    .find({
      timestamp: { $gte: startDate, $lte: endDate }
    })
    .toArray()
  
  // Calculate funnel steps
  const pageViews = analytics.filter(a => a.eventName === 'page_view').length
  const modelViews = analytics.filter(a => a.eventName === 'model_view').length
  const buildsStarted = analytics.filter(a => a.eventName === 'build_started').length
  const buildsCompleted = analytics.filter(a => a.eventName === 'build_completed').length
  const ordersStarted = analytics.filter(a => a.eventName === 'order_started').length
  const ordersCompleted = analytics.filter(a => a.eventName === 'order_completed').length
  
  return [
    { name: 'Page Views', count: pageViews, percentage: 100 },
    { name: 'Model Views', count: modelViews, percentage: pageViews > 0 ? (modelViews / pageViews) * 100 : 0 },
    { name: 'Builds Started', count: buildsStarted, percentage: pageViews > 0 ? (buildsStarted / pageViews) * 100 : 0 },
    { name: 'Builds Completed', count: buildsCompleted, percentage: pageViews > 0 ? (buildsCompleted / pageViews) * 100 : 0 },
    { name: 'Orders Started', count: ordersStarted, percentage: pageViews > 0 ? (ordersStarted / pageViews) * 100 : 0 },
    { name: 'Orders Completed', count: ordersCompleted, percentage: pageViews > 0 ? (ordersCompleted / pageViews) * 100 : 0 }
  ]
}

async function generateRevenueData(db, startDate, endDate) {
  const orders = await db.collection('orders')
    .find({
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .toArray()
  
  // Group by week
  const weeklyData = {}
  orders.forEach(order => {
    const weekStart = new Date(order.createdAt)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    
    const weekKey = weekStart.toISOString().split('T')[0]
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { revenue: 0, orders: 0 }
    }
    weeklyData[weekKey].revenue += order.total || 0
    weeklyData[weekKey].orders += 1
  })
  
  return Object.entries(weeklyData).map(([week, data]) => ({
    period: `Week of ${week}`,
    revenue: data.revenue,
    orders: data.orders,
    growth: 0 // Calculate growth in frontend
  }))
}

async function generateUserActivityData(db, startDate, endDate) {
  const users = await db.collection('users').countDocuments({
    createdAt: { $gte: startDate, $lte: endDate }
  })
  
  const activeUsers = await db.collection('users').countDocuments({
    lastActivity: { $gte: startDate, $lte: endDate }
  })
  
  const returningUsers = await db.collection('users').countDocuments({
    lastActivity: { $gte: startDate, $lte: endDate },
    visitCount: { $gt: 1 }
  })
  
  return [
    { name: 'New Users', value: users, change: 5.2 },
    { name: 'Active Users', value: activeUsers, change: 12.8 },
    { name: 'Returning Users', value: returningUsers, change: 8.4 }
  ]
}

async function generateModelPerformanceData(db, startDate, endDate) {
  const analytics = await db.collection('analytics')
    .find({
      timestamp: { $gte: startDate, $lte: endDate },
      eventName: { $in: ['model_view', 'build_started', 'order_completed'] }
    })
    .toArray()
  
  // Group by model
  const modelData = {}
  analytics.forEach(event => {
    const modelName = event.properties?.modelName || 'Unknown'
    if (!modelData[modelName]) {
      modelData[modelName] = { views: 0, builds: 0, orders: 0, revenue: 0 }
    }
    
    switch (event.eventName) {
      case 'model_view':
        modelData[modelName].views++
        break
      case 'build_started':
        modelData[modelName].builds++
        break
      case 'order_completed':
        modelData[modelName].orders++
        modelData[modelName].revenue += event.properties?.total || 0
        break
    }
  })
  
  return Object.entries(modelData).map(([name, data]) => ({
    name,
    views: data.views,
    builds: data.builds,
    orders: data.orders,
    conversionRate: data.views > 0 ? (data.orders / data.views) * 100 : 0,
    revenue: data.revenue
  }))
}

// Finalize order (stub)
app.post(['/api/builds/:id/confirm', '/builds/:id/confirm'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  const b = await getBuildById(req.params.id)
  if (!b || b.userId !== auth.userId) return res.status(404).json({ error: 'not_found' })
  const now = new Date()
  const updated = await updateBuild(req.params.id, { step: 5, status: 'ORDER_PLACED', contract: { ...(b.contract||{}), status: 'signed', signedAt: now } })
  return res.status(200).json(updated)
})

// Optional parity endpoint for setting financing method explicitly
app.post(['/api/builds/:id/payment-method', '/builds/:id/payment-method'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return
  const b = await getBuildById(req.params.id)
  if (!b || b.userId !== auth.userId) return res.status(404).json({ error: 'not_found' })
  const { method } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  if (!method) return res.status(400).json({ error: 'missing_method' })
  const updated = await updateBuild(req.params.id, { financing: { ...(b.financing||{}), method } })
  return res.status(200).json(updated)
})

// PDF Generation for Order Summary
app.get(['/api/builds/:id/pdf', '/builds/:id/pdf'], async (req, res) => {
  try {
    const { id } = req.params
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return
    
    const build = await getBuildById(id)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const settings = await getOrgSettings()
    
    // Calculate comprehensive pricing
    const basePrice = Number(build.selections?.basePrice || 0)
    const options = build.selections?.options || []
    const optionsSubtotal = options.reduce((sum, opt) => sum + Number(opt.price || 0) * (opt.quantity || 1), 0)
    const subtotalBeforeFees = basePrice + optionsSubtotal
    
    const deliveryFee = Number(build.pricing?.delivery || 0)
    const titleFee = Number(settings.pricing?.title_fee_default || 500)
    const setupFee = Number(settings.pricing?.setup_fee_default || 3000)
    const taxRate = Number(settings.pricing?.tax_rate_percent || 6.25) / 100
    
    const feesSubtotal = deliveryFee + titleFee + setupFee
    const subtotalBeforeTax = subtotalBeforeFees + feesSubtotal
    const salesTax = subtotalBeforeTax * taxRate
    const total = subtotalBeforeTax + salesTax

    // Group options by category
    const optionsByCategory = options.reduce((acc, option) => {
      const category = option.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(option)
      return acc
    }, {})

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Firefly Tiny Homes - Order Summary</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            color: #333; 
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #f59e0b; 
            padding-bottom: 20px; 
          }
          .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #f59e0b; 
          }
          .order-info { 
            margin-bottom: 30px; 
            background: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
          }
          .section { 
            margin-bottom: 25px; 
          }
          .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            color: #f59e0b; 
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .model-info { 
            font-size: 16px; 
            margin-bottom: 20px; 
          }
          .price-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px; 
            padding: 4px 0;
          }
          .price-total { 
            font-weight: bold; 
            font-size: 16px; 
            border-top: 2px solid #ccc; 
            padding-top: 10px; 
            margin-top: 10px; 
          }
          .option-item { 
            margin-bottom: 10px; 
            padding: 8px; 
            background: #f9f9f9; 
            border-radius: 4px; 
          }
          .option-category { 
            font-weight: bold; 
            margin-bottom: 8px; 
            color: #666; 
          }
          .buyer-info { 
            background: #f9f9f9; 
            padding: 15px; 
            border-radius: 4px; 
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .total-row {
            font-size: 18px;
            font-weight: bold;
            color: #f59e0b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">FIREFLY TINY HOMES</div>
          <div>Order Summary</div>
        </div>

        <div class="order-info">
          <div class="price-row">
            <strong>Order ID:</strong> ${id}
          </div>
          <div class="price-row">
            <strong>Date:</strong> ${new Date().toLocaleDateString()}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Model Configuration</div>
          <div class="model-info">
            <strong>${build.modelName}</strong> (${build.modelSlug})
          </div>
          
          <div class="price-row">
            <span>Base Price</span>
            <span>$${formatCurrency(basePrice)}</span>
          </div>
        </div>

        ${Object.keys(optionsByCategory).length > 0 ? `
        <div class="section">
          <div class="section-title">Selected Options</div>
          ${Object.entries(optionsByCategory).map(([category, categoryOptions]) => `
            <div class="option-category">${category}</div>
            ${categoryOptions.map(option => `
              <div class="option-item">
                <div class="price-row">
                  <span>${option.name || option.code}${option.quantity > 1 ? ` (×${option.quantity})` : ''}</span>
                  <span>$${formatCurrency(Number(option.price || 0) * (option.quantity || 1))}</span>
                </div>
                ${option.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${option.description}</div>` : ''}
              </div>
            `).join('')}
          `).join('')}
          <div class="price-row">
            <strong>Options Subtotal</strong>
            <strong>$${formatCurrency(optionsSubtotal)}</strong>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Fees & Services</div>
          <div class="price-row">
            <span>Delivery${build.pricing?.deliveryMiles ? ` (${Math.round(build.pricing.deliveryMiles)} miles)` : ''}</span>
            <span>$${formatCurrency(deliveryFee)}</span>
          </div>
          <div class="price-row">
            <span>Title & Registration</span>
            <span>$${formatCurrency(titleFee)}</span>
          </div>
          <div class="price-row">
            <span>Setup & Installation</span>
            <span>$${formatCurrency(setupFee)}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Tax Calculation</div>
          <div class="price-row">
            <span>Sales Tax (${(taxRate * 100).toFixed(2)}%)</span>
            <span>$${formatCurrency(salesTax)}</span>
          </div>
        </div>

        <div class="price-total">
          <div class="price-row total-row">
            <span>TOTAL PURCHASE PRICE</span>
            <span>$${formatCurrency(total)}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Buyer & Delivery Information</div>
          <div class="buyer-info">
            <div><strong>Name:</strong> ${build.buyerInfo?.firstName || ''} ${build.buyerInfo?.lastName || ''}</div>
            <div><strong>Email:</strong> ${build.buyerInfo?.email || ''}</div>
            <div><strong>Phone:</strong> ${build.buyerInfo?.phone || 'Not provided'}</div>
            <div><strong>Delivery Address:</strong> ${build.buyerInfo?.deliveryAddress || [build.buyerInfo?.address, build.buyerInfo?.city, build.buyerInfo?.state, build.buyerInfo?.zip].filter(Boolean).join(', ') || 'Not specified'}</div>
          </div>
        </div>

        <div class="footer">
          <p>This is a detailed summary of your Firefly Tiny Home order.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `

    // Return JSON data for frontend PDF generation
    // This allows the frontend to use html2canvas + jsPDF for reliable PDF generation
    res.setHeader('Content-Type', 'application/json')
    res.json({
      build,
      settings,
      pricing: {
        basePrice,
        optionsSubtotal,
        deliveryFee,
        titleFee,
        setupFee,
        taxRate,
        salesTax,
        total
      },
      optionsByCategory
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
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

// ----- Clerk Webhook -----
// Temporarily disabled - causing deployment crashes
// app.post(['/api/webhooks/clerk', '/webhooks/clerk'], async (req, res) => {
//   // Webhook handler code temporarily removed
//   res.status(200).json({ success: true });
// });

// Fallback to JSON 404 to avoid hanging requests
app.use((req, res) => {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] 404', { method: req.method, url: req.url })
  res.status(404).json({ error: 'not_found', url: req.url })
})

// Vercel Node.js functions expect (req, res). Call Express directly.
export default (req, res) => app(req, res)

// Currency formatting utility
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00'
  }
  const rounded = Math.round(Number(amount) * 100) / 100
  return `$${rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}


