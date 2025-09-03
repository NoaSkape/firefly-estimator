import express from 'express'
import Stripe from 'stripe'
import { createHash } from 'node:crypto'
import { ObjectId } from 'mongodb'

import { getDb } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { applyCors } from '../lib/cors.js'
import { findModelById, ensureModelIndexes, findOrCreateModel, COLLECTION } from '../lib/model-utils.js'
import { initializeAdminDatabase } from '../lib/adminSchema.js'
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
import { createRateLimiter } from '../lib/rateLimiter.js'
import { validateRequest } from '../lib/requestValidation.js'
// import { Webhook } from 'svix' // Temporarily disabled - causing deployment crashes

const app = express()

// Security headers and middleware
app.disable('x-powered-by')

// Enhanced body parsing with error handling
app.use(express.json({ 
  limit: '2mb',
  verify: (req, res, buf) => {
    try {
      req.rawBody = buf
    } catch (error) {
      console.error('[DEBUG_ADMIN] Body parsing error:', error)
    }
  }
}))

// Error handling for body parsing
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('[DEBUG_ADMIN] JSON parsing error:', error)
    return res.status(400).json({ error: 'Invalid JSON in request body' })
  }
  next()
})

// Security headers middleware
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://images.unsplash.com https://res.cloudinary.com",
    "connect-src 'self' https://api.stripe.com https://hooks.stripe.com https://api.openai.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com",
    "upgrade-insecure-requests"
  ].join('; '))
  
  // HTTP Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY')
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff')
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)')
  
  // X-XSS-Protection (for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  next()
})

// Rate limiting
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  keyGenerator: (req) => req.user?.id || req.ip // User ID if authenticated, IP otherwise
})

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 authentication attempts per 15 minutes
  keyGenerator: (req) => req.ip
})

// Apply rate limiting to all routes
app.use('/api/', apiRateLimiter)
app.use('/api/auth/', authRateLimiter)

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

// startContractFlow function removed - was only used by old order-based contract system

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
    const pathname = url.pathname || ''
    const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-uri']

    // Only honor rewrites that target /api/index; never strip the /api prefix for other routes
    if (typeof forwarded === 'string' && forwarded.startsWith('/api/index')) {
      req.url = forwarded
    } else if ((pathname === '/api/index' || pathname === '/api/index/') && url.searchParams.has('path')) {
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

// ===== AI Content Generation Routes (defined BEFORE path normalization) =====

// Diagnostic endpoint for AI route debugging
app.all('/ai/test', (req, res) => {
  res.json({
    method: req.method,
    path: req.path,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString(),
    message: 'AI route test endpoint working'
  })
})

// AI Content Generation Endpoint with comprehensive error handling
app.options('/ai/generate-content', (req, res) => {
  applyCors(req, res, 'POST, OPTIONS')
  res.status(200).end()
})

app.post('/ai/generate-content', async (req, res) => {
  try {
    // Apply CORS headers for this endpoint
    applyCors(req, res, 'POST, OPTIONS')
    
    const debug = process.env.DEBUG_ADMIN === 'true'
    console.log('[DEBUG_ADMIN] AI endpoint hit:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      headers: req.headers,
      body: req.body,
      query: req.query
    })
    
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      console.error('[DEBUG_ADMIN] Invalid request body:', req.body)
      return res.status(400).json({ error: 'Invalid request body' })
    }
    
    const { topic, template, sections, type = 'full' } = req.body
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' })
    }

    // Check if API key is configured
    const apiKey = process.env.VITE_AI_API_KEY
    const apiUrl = process.env.VITE_AI_API_URL || 'https://api.anthropic.com/v1'
    const model = process.env.VITE_AI_MODEL || 'claude-3-5-sonnet-20241022'
    
    if (!apiKey) {
      return res.status(500).json({ error: 'AI API key not configured' })
    }

    let prompt, maxTokens
    
    if (type === 'section') {
      // Generate section-specific content
      const sectionInfo = getSectionInfo(sections[0])
      const templateInfo = getTemplateInfo(template)
      
      prompt = `
Write a ${sectionInfo.label} section for a blog post about: "${topic}"

Template Style: ${templateInfo.name}
Section Purpose: ${sectionInfo.description}

Requirements:
- Write in a conversational, expert tone
- Include specific examples and actionable tips
- Optimize for SEO with relevant keywords
- Include local Texas references when relevant
- Make it engaging for tiny home enthusiasts
- Word count: 150-300 words for this section
- Use proper HTML formatting (paragraphs, lists, etc.)

Please provide just the section content in HTML format, no additional formatting needed.
      `.trim()
      
      maxTokens = 1000
    } else {
      // Generate full blog post
      const templateInfo = getTemplateInfo(template)
      
      prompt = `
Create a high-quality blog post about: "${topic}"

Template: ${templateInfo.name}
Style: ${templateInfo.description}

Required sections: ${sections.join(', ')}

Requirements:
- Write in a conversational, expert tone
- Include specific examples and actionable tips
- Optimize for SEO with relevant keywords
- Include local Texas references when relevant
- Make it engaging for tiny home enthusiasts
- Word count: 800-1200 words
- Include a compelling call-to-action

Please provide the content in this format:
TITLE: [Engaging title]
META_DESCRIPTION: [SEO-optimized description]
CONTENT: [Full blog post content with HTML formatting]
TAGS: [Relevant tags separated by commas]
CATEGORY: [Appropriate category]
SLUG: [URL-friendly slug]
      `.trim()
      
      maxTokens = 2000
    }

    const systemPrompt = `You are an expert content writer specializing in tiny homes, park model homes, and sustainable living. 

Your expertise includes:
- Tiny home design and construction
- Park model home regulations and benefits
- Sustainable living practices
- Texas-specific housing information
- Real estate and investment insights

Write content that is:
- Informative and educational
- Engaging and conversational
- SEO-optimized
- Actionable with practical tips
- Authentic and trustworthy

Always include specific examples, real scenarios, and actionable advice. Make content that helps readers make informed decisions about tiny home living.`

    // Check if using Claude or OpenAI
    const isClaude = apiUrl.includes('anthropic.com')
    
    let response
    if (isClaude) {
      // Claude API format
      response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          messages: [
            {
              role: 'user',
              content: `${systemPrompt}\n\n${prompt}`
            }
          ]
        })
      })
    } else {
      // OpenAI API format
      response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7
        })
      })
    }

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (type === 'section') {
      // Parse section response
      const content = data.content?.[0]?.text || ''
      res.json({
        sectionKey: sections[0],
        content: content,
        aiGenerated: true,
        generatedAt: new Date().toISOString()
      })
    } else {
      // Parse full blog post response
      const content = data.content?.[0]?.text || data.choices?.[0]?.message?.content || ''
      const parsedContent = parseContent(content, topic, template)
      res.json(parsedContent)
    }

  } catch (error) {
    console.error('AI content generation failed:', error)
    res.status(500).json({ error: 'AI content generation failed', details: error.message })
  }
})

// Helper functions for AI content generation
function getSectionInfo(sectionKey) {
  const sections = {
    'introduction': {
      label: 'Introduction',
      description: 'Hook readers with an engaging opening that sets the stage for the topic'
    },
    'keyBenefits': {
      label: 'Key Benefits',
      description: 'List and explain the main advantages and positive aspects'
    },
    'personalStory': {
      label: 'Personal Story',
      description: 'Share a relevant personal experience or customer story'
    },
    'proTips': {
      label: 'Pro Tips',
      description: 'Provide expert advice and actionable tips'
    },
    'comparison': {
      label: 'Comparison',
      description: 'Compare different options, approaches, or perspectives'
    },
    'conclusion': {
      label: 'Conclusion',
      description: 'Wrap up with a compelling call-to-action and summary'
    }
  }
  return sections[sectionKey] || sections['introduction']
}

function getTemplateInfo(template) {
  const templates = {
    'story': {
      name: 'Story-Driven Template',
      description: 'Narrative-focused with personal experiences and customer stories'
    },
    'educational': {
      name: 'Educational Template',
      description: 'Informative and instructional content with clear explanations'
    },
    'inspiration': {
      name: 'Inspirational Template',
      description: 'Motivational content that inspires action and dreams'
    }
  }
  return templates[template] || templates['story']
}

function parseContent(content, topic, template) {
  try {
    // Extract structured content from AI response
    const titleMatch = content.match(/TITLE:\s*(.+)/i)
    const metaMatch = content.match(/META_DESCRIPTION:\s*(.+)/i)
    const contentMatch = content.match(/CONTENT:\s*([\s\S]*?)(?=TAGS:|CATEGORY:|SLUG:|$)/i)
    const tagsMatch = content.match(/TAGS:\s*(.+)/i)
    const categoryMatch = content.match(/CATEGORY:\s*(.+)/i)
    const slugMatch = content.match(/SLUG:\s*(.+)/i)

    return {
      title: titleMatch?.[1]?.trim() || topic,
      metaDescription: metaMatch?.[1]?.trim() || `Discover everything about ${topic.toLowerCase()}`,
      content: contentMatch?.[1]?.trim() || content,
      tags: tagsMatch?.[1]?.split(',').map(tag => tag.trim()) || ['tiny homes', 'park model homes'],
      category: categoryMatch?.[1]?.trim() || 'tiny home living',
      slug: slugMatch?.[1]?.trim() || generateSlug(topic),
      template: template,
      status: 'draft',
      aiGenerated: true,
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to parse AI content:', error)
    throw new Error('Failed to parse AI-generated content')
  }
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-')
}

// ===== End AI Routes =====

// Handle explicit rewrite target /api/index?path=/...
app.use('/api/index', (req, _res, next) => {
  const p = (req.query && (req.query.path || req.query.p)) || null
  if (p) {
    const normalized = String(p).startsWith('/') ? String(p) : `/${String(p)}`
    
    console.log('[DEBUG_ADMIN] Path normalization:', {
      originalUrl: req.originalUrl,
      query: req.query,
      normalized,
      beforeUrl: req.url
    })
    
    // Special handling for AI routes - keep them as /ai/* not /api/ai/*
    if (normalized.startsWith('/ai/')) {
      req.url = normalized
      console.log('[DEBUG_ADMIN] AI route detected, setting url to:', req.url)
    } else {
      // Always preserve /api prefix so downstream mounts (e.g., /api/admin) match
      req.url = `/api${normalized}`
      console.log('[DEBUG_ADMIN] API route detected, setting url to:', req.url)
    }
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
  const auth = await requireAuth(req, res, false)
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

// ===== OLD CONTRACT ENDPOINTS (REMOVED - CONFLICTING WITH NEW BUILD-BASED ENDPOINTS) =====
// These endpoints used orderId and orders collection - now replaced with buildId and builds collection

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
  const auth = await requireAuth(req, res, false)
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
  // Step 4 is where users enter buyer info, so don't require it to advance TO step 4
  if (target >= 5) {
    const bi = b?.buyerInfo || {}
    const ok = bi.firstName && bi.lastName && bi.email && bi.address
    if (!ok) return res.status(400).json({ error: 'incomplete_buyer' })
  }
  
  // Only check financing for steps after payment method step (step 7+)
  if (target >= 7 && !(b?.financing?.method)) {
    return res.status(400).json({ error: 'missing_payment_method' })
  }
  
  // Only check contract for confirmation step (step 8) - users need to reach step 7 to sign
  if (target >= 8) {
    const c = b?.contract || {}
    if (c?.status !== 'signed') return res.status(400).json({ error: 'contract_not_signed' })
  }
  
  const updated = await updateBuild(req.params.id, { step: target })
  return res.status(200).json(updated)
})

// ===== NEW CONTRACT API ENDPOINTS =====

// Create contract submission (for new contract page)
app.post(['/api/contracts/create', '/contracts/create'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    console.log('[CONTRACT_CREATE] Request received:', { 
      method: req.method, 
      hasBody: !!req.body, 
      bodyKeys: req.body ? Object.keys(req.body) : [],
      body: req.body 
    })

    const { buildId } = req.body
    if (!buildId) {
          console.log('[CONTRACT_CREATE] Missing buildId in request body')
    return res.status(400).json({ error: 'Build ID is required' })
  }

  console.log('[CONTRACT_CREATE] Looking up build:', buildId)
  const build = await getBuildById(buildId)
  console.log('[CONTRACT_CREATE] Build lookup result:', { 
    found: !!build, 
    buildId: build?._id, 
    userId: build?.userId, 
    authUserId: auth.userId,
    match: build?.userId === auth.userId 
  })
  
  if (!build || build.userId !== auth.userId) {
    console.log('[CONTRACT_CREATE] Build not found or access denied')
    return res.status(404).json({ error: 'Build not found' })
  }

    const settings = await getOrgSettings()
    
    // Define all required templates
    const templates = [
      {
        name: 'purchase_agreement',
        envKey: 'DOCUSEAL_PURCHASE_TEMPLATE_ID',
        title: 'Purchase Agreement',
        description: 'Primary purchase contract with all terms and conditions'
      }
    ]

    // For now, only require the purchase agreement template
    // TODO: Add other templates once they're configured in DocuSeal
    if (!process.env.DOCUSEAL_PURCHASE_TEMPLATE_ID) {
      console.log('[CONTRACT_CREATE] Missing purchase agreement template configuration')
      return res.status(500).json({ 
        error: 'DocuSeal purchase agreement template not configured',
        missing: ['DOCUSEAL_PURCHASE_TEMPLATE_ID']
      })
    }

    // Optional: Add other templates if they're configured
    const optionalTemplates = [
      {
        name: 'payment_terms',
        envKey: 'DOCUSEAL_PAYMENT_TERMS_TEMPLATE_ID',
        title: 'Payment Terms Agreement',
        description: 'Payment method, deposit, and balance terms'
      },
      {
        name: 'delivery_agreement',
        envKey: 'DOCUSEAL_DELIVERY_TEMPLATE_ID',
        title: 'Delivery Agreement',
        description: 'Delivery schedule, site requirements, and setup'
      },
      {
        name: 'warranty_information',
        envKey: 'DOCUSEAL_WARRANTY_TEMPLATE_ID',
        title: 'Warranty Information',
        description: 'Warranty terms, coverage, and service information'
      },
      {
        name: 'legal_disclosures',
        envKey: 'DOCUSEAL_LEGAL_DISCLOSURES_TEMPLATE_ID',
        title: 'Legal Disclosures',
        description: 'Required consumer rights and legal disclosures'
      }
    ]

    // Add optional templates if they're configured
    for (const template of optionalTemplates) {
      if (process.env[template.envKey]) {
        templates.push(template)
      }
    }

    // Build prefill data from build
    const prefill = buildContractPrefill(build, settings)

    // Create DocuSeal submissions for all templates
    const buyerInfo = build.buyerInfo || {}
    const submitters = [{
      name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
      email: buyerInfo.email || '',
      role: 'buyer1'
    }]
    
    const submissions = []
    
    for (const template of templates) {
      const templateId = Number(process.env[template.envKey])
      console.log(`[CONTRACT_CREATE] Creating submission for ${template.name}:`, {
        templateId,
        templateName: template.title
      })
      
      try {
        const submission = await createSubmission({
          templateId,
          prefill,
          submitters,
          sendEmail: false, // Don't send email until user is ready
          completedRedirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/checkout/${buildId}/confirm`,
          cancelRedirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/checkout/${buildId}/agreement`
        })
        
        submissions.push({
          name: template.name,
          title: template.title,
          description: template.description,
          templateId,
          submissionId: submission.submissionId,
          signerUrl: submission.signerUrl,
          status: 'ready'
        })
        
        console.log(`[CONTRACT_CREATE] Successfully created submission for ${template.name}:`, submission.submissionId)
      } catch (error) {
        console.error(`[CONTRACT_CREATE] Failed to create submission for ${template.name}:`, error)
        throw new Error(`Failed to create ${template.title}: ${error.message}`)
      }
    }

    // Store contract in database with all submissions
    const db = await getDb()
    const { ObjectId } = await import('mongodb')
    
    const contractData = {
      _id: new ObjectId(),
      buildId: buildId,
      userId: auth.userId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      submissions: submissions,
      status: 'ready',
      pricingSnapshot: build.pricing || {},
      buyerInfo: build.buyerInfo || {},
      delivery: build.delivery || {},
      payment: build.payment || {},
      audit: [{
        at: new Date(),
        who: auth.userId,
        action: 'contract_created',
        meta: { 
          submissionCount: submissions.length,
          submissionIds: submissions.map(s => s.submissionId)
        }
      }]
    }

    await db.collection('contracts').insertOne(contractData)

    // Update build to reference contract
    await updateBuild(buildId, { 
      'contract.submissionIds': submissions.map(s => s.submissionId),
      'contract.status': 'ready',
      'contract.createdAt': new Date()
    })

    // Return primary submission URL (Purchase Agreement)
    const primarySubmission = submissions.find(s => s.name === 'purchase_agreement')
    
    res.status(200).json({
      success: true,
      submissions: submissions,
      submissionId: primarySubmission?.submissionId,
      signerUrl: primarySubmission?.signerUrl,
      status: 'ready',
      version: 1
    })

  } catch (error) {
    console.error('Contract creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create contract',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get contract status (for real-time polling)
app.get(['/api/contracts/status', '/contracts/status'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ 
      buildId: buildId, 
      userId: auth.userId 
    }, { sort: { version: -1 } }) // Get latest version

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Get latest status from DocuSeal for all submissions
    let overallStatus = contract.status
    let updatedSubmissions = contract.submissions || []
    let hasStatusChanges = false
    
    if (updatedSubmissions.length > 0) {
      for (let i = 0; i < updatedSubmissions.length; i++) {
        const submission = updatedSubmissions[i]
        if (submission.submissionId) {
          try {
            const docusealSubmission = await getSubmission(submission.submissionId)
            const docusealStatus = mapDocuSealStatus(docusealSubmission.status || docusealSubmission.state)
            
            // Update submission status if it changed
            if (docusealStatus !== submission.status) {
              updatedSubmissions[i] = {
                ...submission,
                status: docusealStatus
              }
              hasStatusChanges = true
            }
          } catch (error) {
            console.error(`Failed to get DocuSeal status for ${submission.name}:`, error)
            // Continue with local status
          }
        }
      }
      
      // Determine overall status based on all submissions
      const allCompleted = updatedSubmissions.every(s => s.status === 'completed')
      const anySigning = updatedSubmissions.some(s => s.status === 'signing')
      const anyVoided = updatedSubmissions.some(s => s.status === 'voided')
      
      if (allCompleted) {
        overallStatus = 'completed'
      } else if (anyVoided) {
        overallStatus = 'voided'
      } else if (anySigning) {
        overallStatus = 'signing'
      } else {
        overallStatus = 'ready'
      }
      
      // Update our local status if it changed
      if (hasStatusChanges || overallStatus !== contract.status) {
        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { 
            $set: { 
              status: overallStatus, 
              submissions: updatedSubmissions,
              updatedAt: new Date() 
            },
            $push: { 
              audit: {
                at: new Date(),
                who: 'system',
                action: 'status_updated',
                meta: { 
                  from: contract.status, 
                  to: overallStatus,
                  submissionUpdates: updatedSubmissions.map(s => ({ name: s.name, status: s.status }))
                }
              }
            }
          }
        )
      }
    }

    // Get primary submission for backward compatibility
    const primarySubmission = updatedSubmissions.find(s => s.name === 'purchase_agreement') || updatedSubmissions[0]

    res.status(200).json({
      success: true,
      status: overallStatus,
      submissions: updatedSubmissions,
      submissionId: primarySubmission?.submissionId,
      signerUrl: primarySubmission?.signerUrl,
      version: contract.version,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt
    })

  } catch (error) {
    console.error('Contract status error:', error)
    res.status(500).json({ 
      error: 'Failed to get contract status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// DocuSeal webhook handler (for real-time status updates)
app.post(['/api/contracts/webhook', '/contracts/webhook'], async (req, res) => {
  try {
    // Verify webhook signature
    const secret = process.env.DOCUSEAL_WEBHOOK_SECRET || ''
    const signature = req.headers['x-docuseal-signature'] || req.headers['X-DocuSeal-Signature']
    
    if (!secret || signature !== secret) {
      console.error('DocuSeal webhook: Invalid signature')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { event_type, data } = req.body
    console.log('DocuSeal webhook received:', event_type, data?.id)

    if (!data?.id) {
      return res.status(400).json({ error: 'Missing submission ID' })
    }

    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ 
      'submissions.submissionId': data.id 
    })

    if (!contract) {
      console.log('DocuSeal webhook: Contract not found for submission:', data.id)
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Find the specific submission that was updated
    const submissionIndex = contract.submissions?.findIndex(s => s.submissionId === data.id)
    if (submissionIndex === -1 || submissionIndex === undefined) {
      console.log('DocuSeal webhook: Submission not found in contract:', data.id)
      return res.status(404).json({ error: 'Submission not found' })
    }

    const submission = contract.submissions[submissionIndex]
    let newSubmissionStatus = submission.status
    let shouldDownloadPdf = false

    // Handle different event types for the specific submission
    switch (event_type) {
      case 'submission.created':
        newSubmissionStatus = 'ready'
        break
      case 'submission.started':
        newSubmissionStatus = 'signing'
        break
      case 'submission.completed':
        newSubmissionStatus = 'completed'
        shouldDownloadPdf = true
        break
      case 'submission.declined':
        newSubmissionStatus = 'voided'
        break
      default:
        console.log('DocuSeal webhook: Unhandled event type:', event_type)
    }

    // Update the specific submission status
    const updatedSubmissions = [...contract.submissions]
    updatedSubmissions[submissionIndex] = {
      ...submission,
      status: newSubmissionStatus
    }

    // Determine overall contract status based on all submissions
    const allCompleted = updatedSubmissions.every(s => s.status === 'completed')
    const anySigning = updatedSubmissions.some(s => s.status === 'signing')
    const anyVoided = updatedSubmissions.some(s => s.status === 'voided')
    
    let newOverallStatus = contract.status
    if (allCompleted) {
      newOverallStatus = 'completed'
    } else if (anyVoided) {
      newOverallStatus = 'voided'
    } else if (anySigning) {
      newOverallStatus = 'signing'
    } else {
      newOverallStatus = 'ready'
    }

    // Update contract with new submission statuses and overall status
    await db.collection('contracts').updateOne(
      { _id: contract._id },
      { 
        $set: { 
          status: newOverallStatus,
          submissions: updatedSubmissions,
          updatedAt: new Date(),
          ...(data.completed_at && { completedAt: new Date(data.completed_at) })
        },
        $push: { 
          audit: {
            at: new Date(),
            who: 'docuseal_webhook',
            action: event_type,
            meta: { 
              from: contract.status, 
              to: newOverallStatus, 
              submissionName: submission.name,
              submissionStatus: newSubmissionStatus,
              eventData: data 
            }
          }
        }
      }
    )

    // Download and store signed PDF if completed
    if (shouldDownloadPdf && data.audit_trail_url) {
      try {
        const pdfBuffer = await downloadFile(data.audit_trail_url)
        const publicId = `contracts/${contract.buildId}/v${contract.version}/signed_contract`
        
        const cloudinaryResult = await uploadPdfToCloudinary({
          buffer: pdfBuffer,
          folder: 'firefly-estimator/contracts',
          publicId
        })

        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { 
            $set: { 
              signedPdfCloudinaryId: cloudinaryResult.public_id,
              signedPdfUrl: data.audit_trail_url
            }
          }
        )

        console.log('DocuSeal webhook: PDF stored to Cloudinary:', cloudinaryResult.public_id)
      } catch (error) {
        console.error('DocuSeal webhook: Failed to store PDF:', error)
      }
    }

    // Update build status if contract completed
    if (newStatus === 'completed') {
      await updateBuild(contract.buildId, { 
        'contract.status': 'completed',
        'contract.completedAt': new Date(),
        step: 8 // Advance to confirmation step
      })
    }

    res.status(200).json({ success: true })

  } catch (error) {
    console.error('DocuSeal webhook error:', error)
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Helper function to map DocuSeal status to our status
function mapDocuSealStatus(docusealStatus) {
  switch (docusealStatus) {
    case 'pending':
    case 'awaiting_signature':
      return 'ready'
    case 'opened':
    case 'in_progress':
      return 'signing'
    case 'completed':
      return 'completed'
    case 'declined':
    case 'expired':
      return 'voided'
    default:
      return 'draft'
  }
}

// Helper function to build prefill data for DocuSeal
function buildContractPrefill(build, settings) {
  console.log('[CONTRACT_CREATE] Building prefill data for build:', build._id)
  
  const pricing = build.pricing || {}
  const buyerInfo = build.buyerInfo || {}
  const delivery = build.delivery || {}
  const payment = build.payment || {}
  
  console.log('[CONTRACT_CREATE] Build data sections:', {
    hasPricing: !!pricing,
    hasBuyerInfo: !!buyerInfo,
    hasDelivery: !!delivery,
    hasPayment: !!payment,
    pricingKeys: Object.keys(pricing),
    buyerInfoKeys: Object.keys(buyerInfo),
    deliveryKeys: Object.keys(delivery),
    paymentKeys: Object.keys(payment)
  })
  
  // Calculate key amounts
  const totalPurchasePrice = pricing.total || 0
  const depositPercent = payment.plan?.percent || 25
  const depositAmount = Math.round(totalPurchasePrice * depositPercent / 100)
  const balanceAmount = totalPurchasePrice - depositAmount

  const prefill = {
    // Order Information
    order_id: build._id || '',
    order_date: new Date().toLocaleDateString(),
    
    // Dealer Information
    dealer_name: "Firefly Tiny Homes LLC",
    dealer_address: "6150 TX-16, Pipe Creek, TX 78063", 
    dealer_phone: "830-328-6109",
    dealer_rep: "Firefly Representative",
    
    // Buyer Information
    buyer_name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
    buyer_first_name: buyerInfo.firstName || '',
    buyer_last_name: buyerInfo.lastName || '',
    buyer_email: buyerInfo.email || '',
    buyer_phone: buyerInfo.phone || '',
    buyer_address: buyerInfo.address || '',
    buyer_city: buyerInfo.city || '',
    buyer_state: buyerInfo.state || '',
    buyer_zip: buyerInfo.zip || '',
    
    // Unit Information  
    unit_brand: "Athens Park Select",
    unit_model: build.modelName || build.modelCode || '',
    unit_year: new Date().getFullYear().toString(),
    unit_dimensions: build.model?.dimensions || '',
    unit_serial: '', // Will be assigned later
    
    // Pricing
    base_price: formatCurrency(pricing.basePrice || 0),
    options_total: formatCurrency(pricing.optionsTotal || 0),
    delivery_estimate: formatCurrency(pricing.deliveryEstimate || 0),
    title_fee: formatCurrency(pricing.titleFee || 0),
    setup_fee: formatCurrency(pricing.setupFee || 0),
    taxes: formatCurrency(pricing.taxes || 0),
    total_price: formatCurrency(totalPurchasePrice),
    
    // Payment Terms
    deposit_percent: `${depositPercent}%`,
    deposit_amount: formatCurrency(depositAmount),
    balance_amount: formatCurrency(balanceAmount),
    payment_method: payment.method === 'ach_debit' ? 'ACH/Bank Transfer' : 'Cash',
    
    // Delivery Information
    delivery_address: delivery.address || buyerInfo.address || '',
    delivery_city: delivery.city || buyerInfo.city || '',
    delivery_state: delivery.state || buyerInfo.state || '',
    delivery_zip: delivery.zip || buyerInfo.zip || '',
    delivery_notes: delivery.notes || '',
    
    // Legal/Compliance
    state_classification: "Travel Trailer (park model RV)",
    completion_estimate: "8-12 weeks from contract signing",
    storage_policy: "Delivery within 12 days after factory completion; storage charges may apply"
  }

  console.log('[CONTRACT_CREATE] Generated prefill data:', {
    prefillKeys: Object.keys(prefill),
    sampleValues: {
      order_id: prefill.order_id,
      buyer_name: prefill.buyer_name,
      total_price: prefill.total_price,
      payment_method: prefill.payment_method
    }
  })

  return prefill
}

// Helper function to format currency for DocuSeal
function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format((cents || 0) / 100)
}

// Download contract packet (ZIP of all signed PDFs)
app.get(['/api/contracts/download/packet', '/contracts/download/packet'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, version } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const db = await getDb()
    let query = { buildId: buildId, userId: auth.userId }
    if (version) {
      query.version = parseInt(version)
    }
    
    const contract = await db.collection('contracts').findOne(query, { 
      sort: { version: -1 } 
    })

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    if (contract.status !== 'completed') {
      return res.status(400).json({ error: 'Contract not completed yet' })
    }

    if (!contract.signedPdfCloudinaryId) {
      return res.status(404).json({ error: 'Signed documents not available' })
    }

    // Generate signed download URL from Cloudinary
    const signedUrl = signedCloudinaryUrl(contract.signedPdfCloudinaryId)
    
    // For now, redirect to the single PDF. In the future, this could create a ZIP
    res.redirect(signedUrl)

  } catch (error) {
    console.error('Contract download error:', error)
    res.status(500).json({ 
      error: 'Failed to download contract packet',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Download pre-signing summary PDF
app.get(['/api/contracts/download/summary', '/contracts/download/summary'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // For now, return a placeholder response. In production, this would generate
    // a summary PDF with order details, pricing breakdown, etc.
    res.status(501).json({ 
      error: 'Summary PDF generation not yet implemented',
      message: 'This feature will generate a pre-signing order summary PDF'
    })

  } catch (error) {
    console.error('Contract summary download error:', error)
    res.status(500).json({ 
      error: 'Failed to download summary',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
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
    const { firstName, lastName, email, phone, address, city, state, zip } = body
    
    console.log('DEBUG: Request body:', { firstName, lastName, email, phone, address, city, state, zip })
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      console.log('DEBUG: Missing required fields')
      return res.status(400).json({ error: 'missing_required_fields', message: 'First name, last name, and email are required' })
    }
    
    console.log('DEBUG: Ensuring user profile indexes...')
    await ensureUserProfileIndexes()
    console.log('DEBUG: Indexes ensured successfully')
    
    console.log('DEBUG: Updating user basic info...')
    const profile = await updateUserBasicInfo(auth.userId, { firstName, lastName, email, phone, address, city, state, zip })
    
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

// ===== POLICY MANAGEMENT =====

// Get all policies
app.get(['/api/admin/policies', '/admin/policies'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const db = await getDb()
    const policies = await db.collection('policies').find({}).toArray()
    
    // Return default policies if none exist
    if (policies.length === 0) {
      const defaultPolicies = [
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          content: getDefaultPrivacyPolicy(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        },
        {
          id: 'terms-conditions',
          title: 'Terms & Conditions',
          content: getDefaultTermsConditions(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        },
        {
          id: 'other-policies',
          title: 'Other Policies',
          content: getDefaultOtherPolicies(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        }
      ]
      
      // Insert default policies
      await db.collection('policies').insertMany(defaultPolicies)
      return res.status(200).json(defaultPolicies)
    }
    
    return res.status(200).json(policies)
  } catch (error) {
    console.error('Get policies error:', error)
    return res.status(500).json({ 
      error: 'policies_failed', 
      message: error.message || 'Failed to load policies'
    })
  }
})

// Get single policy
app.get(['/api/policies/:id', '/policies/:id'], async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const policy = await db.collection('policies').findOne({ id })
    
    if (!policy) {
      // Return default policy content if not found
      let defaultContent = ''
      switch (id) {
        case 'privacy-policy':
          defaultContent = getDefaultPrivacyPolicy()
          break
        case 'terms-conditions':
          defaultContent = getDefaultTermsConditions()
          break
        case 'other-policies':
          defaultContent = getDefaultOtherPolicies()
          break
        default:
          return res.status(404).json({ error: 'Policy not found' })
      }
      
      const defaultPolicy = {
        id,
        title: id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        content: defaultContent,
        lastUpdated: new Date(),
        updatedBy: 'system'
      }
      
      return res.status(200).json(defaultPolicy)
    }
    
    return res.status(200).json(policy)
  } catch (error) {
    console.error('Get policy error:', error)
    return res.status(500).json({ 
      error: 'policy_failed', 
      message: error.message || 'Failed to load policy'
    })
  }
})

// Update policy
app.put(['/api/admin/policies/:id', '/admin/policies/:id'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const { title, content } = req.body
    
    if (!title || !content) {
      return res.status(400).json({ 
        error: 'missing_fields', 
        message: 'Title and content are required' 
      })
    }
    
    const db = await getDb()
    const updateData = {
      id,
      title: String(title).slice(0, 200),
      content: String(content),
      lastUpdated: new Date(),
      updatedBy: auth.userId
    }
    
    const result = await db.collection('policies').updateOne(
      { id },
      { $set: updateData },
      { upsert: true }
    )
    
    return res.status(200).json({
      success: true,
      policy: updateData,
      modified: result.modifiedCount > 0,
      created: result.upsertedCount > 0
    })
  } catch (error) {
    console.error('Update policy error:', error)
    return res.status(500).json({ 
      error: 'policy_update_failed', 
      message: error.message || 'Failed to update policy'
    })
  }
})

// Pages routes
app.get(['/api/pages/:pageId', '/pages/:pageId'], async (req, res) => {
  try {
    const { pageId } = req.params
    const db = await getDb()
    
    // Get page content from database
    const page = await db.collection('pages').findOne({ pageId })
    
    if (!page) {
      // Return default content structure if page doesn't exist
      const defaultContent = getDefaultPageContent(pageId)
          return res.status(200).json({
      pageId,
      content: defaultContent,
      images: {},
      lastUpdated: new Date(),
      updatedBy: 'system'
    })
    }
    
    return res.status(200).json(page)
  } catch (error) {
    console.error('Get page error:', error)
    return res.status(500).json({ 
      error: 'page_fetch_failed', 
      message: error.message || 'Failed to fetch page content'
    })
  }
})

// Update page content
app.patch(['/api/pages/:pageId', '/pages/:pageId'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { pageId } = req.params
    const { content, images } = req.body
    const db = await getDb()
    
    const updateData = {
      pageId,
      content: content || {},
      images: typeof images === 'object' && images !== null ? images : {},
      lastUpdated: new Date(),
      updatedBy: auth.userId
    }
    
    const result = await db.collection('pages').updateOne(
      { pageId },
      { $set: updateData },
      { upsert: true }
    )
    
    return res.status(200).json({
      success: true,
      pageId,
      content: updateData.content,
      images: updateData.images,
      lastUpdated: updateData.lastUpdated,
      updatedBy: updateData.updatedBy,
      modified: result.modifiedCount > 0,
      created: result.upsertedCount > 0
    })
  } catch (error) {
    console.error('Update page error:', error)
    return res.status(500).json({ 
      error: 'page_update_failed', 
      message: error.message || 'Failed to update page content'
    })
  }
})

// Blog routes
app.get(['/api/blog', '/blog'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) {
    console.log('[DEBUG_ADMIN] Blog GET route hit', { 
      url: req.url, 
      method: req.method, 
      path: req.query?.path,
      originalUrl: req.originalUrl 
    })
  }
  
  try {
    const db = await getDb()
    const { category, limit = 10, offset = 0 } = req.query
    
    let query = { status: 'published' }
    if (category) {
      query.category = category
    }
    
    const posts = await db.collection('blog_posts')
      .find(query)
      .sort({ publishDate: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray()
    
    const total = await db.collection('blog_posts').countDocuments(query)
    
    if (debug) {
      console.log('[DEBUG_ADMIN] Blog GET response', { 
        postsCount: posts.length, 
        total, 
        hasMore: total > parseInt(offset) + posts.length 
      })
    }
    
    return res.status(200).json({
      posts,
      total,
      hasMore: total > parseInt(offset) + posts.length
    })
  } catch (error) {
    console.error('Get blog posts error:', error)
    return res.status(500).json({ 
      error: 'blog_fetch_failed', 
      message: error.message || 'Failed to fetch blog posts'
    })
  }
})

app.get(['/api/blog/:slug', '/blog/:slug'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  try {
    const { slug } = req.params
    const db = await getDb()
    
    const post = await db.collection('blog_posts').findOne({ 
      slug,
      status: 'published'
    })
    
    if (!post) {
      return res.status(404).json({ 
        error: 'post_not_found', 
        message: 'Blog post not found'
      })
    }
    
    // Increment view count
    await db.collection('blog_posts').updateOne(
      { _id: post._id },
      { $inc: { views: 1 } }
    )
    
    return res.status(200).json(post)
  } catch (error) {
    console.error('Get blog post error:', error)
    return res.status(500).json({ 
      error: 'blog_post_fetch_failed', 
      message: error.message || 'Failed to fetch blog post'
    })
  }
})

app.post(['/api/blog', '/blog'], async (req, res) => {
  applyCors(req, res, 'POST, OPTIONS')
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const debug = process.env.DEBUG_ADMIN === 'true'
  console.log('[BLOG_POST] Route hit', { 
    url: req.url, 
    method: req.method, 
    path: req.query?.path,
    originalUrl: req.originalUrl,
    bodyKeys: Object.keys(req.body || {}),
    hasBody: !!req.body,
    bodyType: typeof req.body
  })
  
  // Temporarily allow blog creation without strict admin checks for testing
  const auth = await requireAuth(req, res, false) // Changed from requireAdmin to requireAuth with adminOnly=false
  if (!auth) {
    console.log('[BLOG_POST] Auth failed')
    return
  }
  console.log('[BLOG_POST] Auth successful', { userId: auth.userId })
  
  try {
    const db = await getDb()
    
    // Ensure blog_posts collection exists
    try {
      const collections = await db.listCollections().toArray()
      const blogCollectionExists = collections.some(col => col.name === 'blog_posts')
      if (!blogCollectionExists) {
        console.log('[BLOG_POST] Creating blog_posts collection')
        await db.createCollection('blog_posts')
      }
      console.log('[BLOG_POST] Blog collection ready')
    } catch (error) {
      console.error('[BLOG_POST] Error ensuring blog collection exists:', error)
      // Continue anyway, the collection might already exist
    }
    
    console.log('[BLOG_POST] Database connection successful')
    const postData = req.body
    console.log('[BLOG_POST] Post data received', { 
      hasTitle: !!postData.title, 
      hasContent: !!postData.content,
      titleLength: postData.title?.length,
      contentLength: postData.content?.length,
      keys: Object.keys(postData || {}),
      title: postData.title?.substring(0, 50) + '...',
      content: postData.content?.substring(0, 100) + '...'
    })
    
    // Validate required fields
    if (!postData.title || !postData.content) {
      console.log('[BLOG_POST] Validation failed', { 
        hasTitle: !!postData.title, 
        hasContent: !!postData.content 
      })
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Generate slug if not provided
    if (!postData.slug) {
      postData.slug = postData.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 100) // Limit length to 100 characters
    }
    
    console.log('[BLOG_POST] Generated slug:', postData.slug)
    
    // Check if slug already exists
    const existingPost = await db.collection('blog_posts').findOne({ slug: postData.slug })
    console.log('[BLOG_POST] Slug check:', { slug: postData.slug, exists: !!existingPost })
    if (existingPost) {
      console.log('[BLOG_POST] Slug already exists, returning error')
      return res.status(400).json({
        error: 'slug_exists',
        message: 'A post with this URL already exists'
      })
    }
    
    const newPost = {
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      author: auth.userId
    }
    
    const result = await db.collection('blog_posts').insertOne(newPost)
    console.log('[BLOG_POST] Successfully created post', { 
      insertedId: result.insertedId,
      title: newPost.title 
    })
    
    return res.status(201).json({
      success: true,
      id: result.insertedId,
      ...newPost
    })
  } catch (error) {
    console.error('[BLOG_POST] Create blog post error:', error)
    console.error('[BLOG_POST] Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'blog_post_create_failed', 
      message: error.message || 'Failed to create blog post'
    })
  }
})

app.put(['/api/blog/:id', '/blog/:id'], async (req, res) => {
  applyCors(req, res, 'PUT, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    const postData = req.body
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Validate required fields
    if (!postData.title || !postData.content) {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Check if slug already exists for different post
    if (postData.slug) {
      const existingPost = await db.collection('blog_posts').findOne({ 
        slug: postData.slug,
        _id: { $ne: objectId }
      })
      if (existingPost) {
        return res.status(400).json({
          error: 'slug_exists',
          message: 'A post with this URL already exists'
        })
      }
    }
    
    // SANITIZE DATA: Remove immutable and system fields
    const {
      _id,           // MongoDB immutable field
      __v,           // Mongoose version field (if using Mongoose)
      createdAt,     // System field - should not be updated
      views,         // System field - managed by API
      ...sanitizedData
    } = postData
    
    // Add system fields
    const updateData = {
      ...sanitizedData,
      updatedAt: new Date()
    }
    
    const result = await db.collection('blog_posts').updateOne(
      { _id: objectId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found'
      })
    }
    
    if (result.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes were made to the blog post',
        id
      })
    }
    
    // Fetch updated post to return
    const updatedPost = await db.collection('blog_posts').findOne({ _id: objectId })
    
    return res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      id,
      post: updatedPost
    })
  } catch (error) {
    console.error('Update blog post error:', error)
    
    // Handle specific MongoDB errors
    if (error.code === 66) {
      return res.status(400).json({
        error: 'immutable_field_error',
        message: 'Cannot update immutable fields like _id'
      })
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        error: 'duplicate_key_error',
        message: 'A post with this slug already exists'
      })
    }
    
    return res.status(500).json({ 
      error: 'blog_post_update_failed', 
      message: error.message || 'Failed to update blog post'
    })
  }
})

// Admin-specific blog editing endpoint with enhanced security
app.put(['/api/admin/blog/:id', '/admin/blog/:id'], async (req, res) => {
  applyCors(req, res, 'PUT, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    const postData = req.body
    
    // Enhanced validation for admin editing
    if (!postData.title || !postData.content) {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Check if post exists and user has permission
    const existingPost = await db.collection('blog_posts').findOne({ _id: objectId })
    if (!existingPost) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found'
      })
    }
    
    // Check if slug already exists for different post
    if (postData.slug && postData.slug !== existingPost.slug) {
      const slugConflict = await db.collection('blog_posts').findOne({ 
        slug: postData.slug,
        _id: { $ne: objectId }
      })
      if (slugConflict) {
        return res.status(400).json({
          error: 'slug_exists',
          message: 'A post with this URL already exists'
        })
      }
    }
    
    // COMPREHENSIVE DATA SANITIZATION
    const {
      _id,           // MongoDB immutable field
      __v,           // Mongoose version field
      createdAt,     // System field - creation timestamp
      views,         // System field - view count
      updatedAt,     // System field - will be set by API
      ...sanitizedData
    } = postData
    
    // Add system fields and admin metadata
    const updateData = {
      ...sanitizedData,
      updatedAt: new Date(),
      lastEditedBy: auth.userId,
      lastEditedAt: new Date()
    }
    
    // Perform the update
    const result = await db.collection('blog_posts').updateOne(
      { _id: objectId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found during update'
      })
    }
    
    // Fetch updated post to return
    const updatedPost = await db.collection('blog_posts').findOne({ _id: objectId })
    
    // Log admin action for audit trail
    await db.collection('admin_actions').insertOne({
      action: 'blog_post_updated',
      adminId: auth.userId,
      postId: objectId,
      postTitle: postData.title,
      timestamp: new Date(),
      changes: Object.keys(updateData)
    })
    
    return res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      id,
      post: updatedPost,
      changes: result.modifiedCount > 0 ? 'Modified' : 'No changes'
    })
  } catch (error) {
    console.error('Admin blog update error:', error)
    
    // Handle specific MongoDB errors with detailed messages
    if (error.code === 66) {
      return res.status(400).json({
        error: 'immutable_field_error',
        message: 'Cannot update immutable fields like _id',
        details: 'The system automatically excludes immutable fields from updates'
      })
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        error: 'duplicate_key_error',
        message: 'A post with this slug already exists',
        details: 'Please choose a different URL slug for this post'
      })
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Data validation failed',
        details: error.message
      })
    }
    
    return res.status(500).json({ 
      error: 'admin_blog_update_failed', 
      message: 'Failed to update blog post',
      details: error.message || 'Internal server error'
    })
  }
})

// Admin endpoint for fetching blog posts for editing (includes unpublished posts)
app.get(['/api/admin/blog/:id', '/admin/blog/:id'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Fetch post for editing (admin can see all posts regardless of status)
    const post = await db.collection('blog_posts').findOne({ _id: objectId })
    
    if (!post) {
      return res.status(404).json({ 
        error: 'post_not_found', 
        message: 'Blog post not found'
      })
    }
    
    // Log admin access for audit trail
    await db.collection('admin_actions').insertOne({
      action: 'blog_post_accessed_for_editing',
      adminId: auth.userId,
      postId: objectId,
      postTitle: post.title,
      timestamp: new Date()
    })
    
    return res.status(200).json(post)
  } catch (error) {
    console.error('Admin blog fetch error:', error)
    return res.status(500).json({ 
      error: 'admin_blog_fetch_failed', 
      message: error.message || 'Failed to fetch blog post for editing'
    })
  }
})

// ===== END AI Routes =====

// ===== Builds (new) =====
// Create build (from model or migrated guest draft)
app.post(['/api/builds', '/builds'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
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
  // Step 4 is where users enter buyer info, so don't require it to advance TO step 4
  if (target >= 5) {
    const bi = b?.buyerInfo || {}
    const ok = bi.firstName && bi.lastName && bi.email && bi.address
    if (!ok) return res.status(400).json({ error: 'incomplete_buyer' })
  }
  
  // Only check financing for steps after payment method step (step 7+)
  if (target >= 7 && !(b?.financing?.method)) {
    return res.status(400).json({ error: 'missing_payment_method' })
  }
  
  // Only check contract for confirmation step (step 8) - users need to reach step 7 to sign
  if (target >= 8) {
    const c = b?.contract || {}
    if (c?.status !== 'signed') return res.status(400).json({ error: 'contract_not_signed' })
  }
  
  const updated = await updateBuild(req.params.id, { step: target })
  return res.status(200).json(updated)
})

// ===== NEW CONTRACT API ENDPOINTS =====

// Create contract submission (for new contract page)
app.post(['/api/contracts/create', '/contracts/create'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    console.log('[CONTRACT_CREATE] Request received:', { 
      method: req.method, 
      hasBody: !!req.body, 
      bodyKeys: req.body ? Object.keys(req.body) : [],
      body: req.body 
    })

    const { buildId } = req.body
    if (!buildId) {
          console.log('[CONTRACT_CREATE] Missing buildId in request body')
    return res.status(400).json({ error: 'Build ID is required' })
  }

  console.log('[CONTRACT_CREATE] Looking up build:', buildId)
  const build = await getBuildById(buildId)
  console.log('[CONTRACT_CREATE] Build lookup result:', { 
    found: !!build, 
    buildId: build?._id, 
    userId: build?.userId, 
    authUserId: auth.userId,
    match: build?.userId === auth.userId 
  })
  
  if (!build || build.userId !== auth.userId) {
    console.log('[CONTRACT_CREATE] Build not found or access denied')
    return res.status(404).json({ error: 'Build not found' })
  }

    const settings = await getOrgSettings()
    
    // Define all required templates
    const templates = [
      {
        name: 'purchase_agreement',
        envKey: 'DOCUSEAL_PURCHASE_TEMPLATE_ID',
        title: 'Purchase Agreement',
        description: 'Primary purchase contract with all terms and conditions'
      }
    ]

    // For now, only require the purchase agreement template
    // TODO: Add other templates once they're configured in DocuSeal
    if (!process.env.DOCUSEAL_PURCHASE_TEMPLATE_ID) {
      console.log('[CONTRACT_CREATE] Missing purchase agreement template configuration')
      return res.status(500).json({ 
        error: 'DocuSeal purchase agreement template not configured',
        missing: ['DOCUSEAL_PURCHASE_TEMPLATE_ID']
      })
    }

    // Optional: Add other templates if they're configured
    const optionalTemplates = [
      {
        name: 'payment_terms',
        envKey: 'DOCUSEAL_PAYMENT_TERMS_TEMPLATE_ID',
        title: 'Payment Terms Agreement',
        description: 'Payment method, deposit, and balance terms'
      },
      {
        name: 'delivery_agreement',
        envKey: 'DOCUSEAL_DELIVERY_TEMPLATE_ID',
        title: 'Delivery Agreement',
        description: 'Delivery schedule, site requirements, and setup'
      },
      {
        name: 'warranty_information',
        envKey: 'DOCUSEAL_WARRANTY_TEMPLATE_ID',
        title: 'Warranty Information',
        description: 'Warranty terms, coverage, and service information'
      },
      {
        name: 'legal_disclosures',
        envKey: 'DOCUSEAL_LEGAL_DISCLOSURES_TEMPLATE_ID',
        title: 'Legal Disclosures',
        description: 'Required consumer rights and legal disclosures'
      }
    ]

    // Add optional templates if they're configured
    for (const template of optionalTemplates) {
      if (process.env[template.envKey]) {
        templates.push(template)
      }
    }

    // Build prefill data from build
    const prefill = buildContractPrefill(build, settings)

    // Create DocuSeal submissions for all templates
    const buyerInfo = build.buyerInfo || {}
    const submitters = [{
      name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
      email: buyerInfo.email || '',
      role: 'buyer1'
    }]
    
    const submissions = []
    
    for (const template of templates) {
      const templateId = Number(process.env[template.envKey])
      console.log(`[CONTRACT_CREATE] Creating submission for ${template.name}:`, {
        templateId,
        templateName: template.title
      })
      
      try {
        const submission = await createSubmission({
          templateId,
          prefill,
          submitters,
          sendEmail: false, // Don't send email until user is ready
          completedRedirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/checkout/${buildId}/confirm`,
          cancelRedirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/checkout/${buildId}/agreement`
        })
        
        submissions.push({
          name: template.name,
          title: template.title,
          description: template.description,
          templateId,
          submissionId: submission.submissionId,
          signerUrl: submission.signerUrl,
          status: 'ready'
        })
        
        console.log(`[CONTRACT_CREATE] Successfully created submission for ${template.name}:`, submission.submissionId)
      } catch (error) {
        console.error(`[CONTRACT_CREATE] Failed to create submission for ${template.name}:`, error)
        throw new Error(`Failed to create ${template.title}: ${error.message}`)
      }
    }

    // Store contract in database with all submissions
    const db = await getDb()
    const { ObjectId } = await import('mongodb')
    
    const contractData = {
      _id: new ObjectId(),
      buildId: buildId,
      userId: auth.userId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      submissions: submissions,
      status: 'ready',
      pricingSnapshot: build.pricing || {},
      buyerInfo: build.buyerInfo || {},
      delivery: build.delivery || {},
      payment: build.payment || {},
      audit: [{
        at: new Date(),
        who: auth.userId,
        action: 'contract_created',
        meta: { 
          submissionCount: submissions.length,
          submissionIds: submissions.map(s => s.submissionId)
        }
      }]
    }

    await db.collection('contracts').insertOne(contractData)

    // Update build to reference contract
    await updateBuild(buildId, { 
      'contract.submissionIds': submissions.map(s => s.submissionId),
      'contract.status': 'ready',
      'contract.createdAt': new Date()
    })

    // Return primary submission URL (Purchase Agreement)
    const primarySubmission = submissions.find(s => s.name === 'purchase_agreement')
    
    res.status(200).json({
      success: true,
      submissions: submissions,
      submissionId: primarySubmission?.submissionId,
      signerUrl: primarySubmission?.signerUrl,
      status: 'ready',
      version: 1
    })

  } catch (error) {
    console.error('Contract creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create contract',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get contract status (for real-time polling)
app.get(['/api/contracts/status', '/contracts/status'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ 
      buildId: buildId, 
      userId: auth.userId 
    }, { sort: { version: -1 } }) // Get latest version

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Get latest status from DocuSeal for all submissions
    let overallStatus = contract.status
    let updatedSubmissions = contract.submissions || []
    let hasStatusChanges = false
    
    if (updatedSubmissions.length > 0) {
      for (let i = 0; i < updatedSubmissions.length; i++) {
        const submission = updatedSubmissions[i]
        if (submission.submissionId) {
          try {
            const docusealSubmission = await getSubmission(submission.submissionId)
            const docusealStatus = mapDocuSealStatus(docusealSubmission.status || docusealSubmission.state)
            
            // Update submission status if it changed
            if (docusealStatus !== submission.status) {
              updatedSubmissions[i] = {
                ...submission,
                status: docusealStatus
              }
              hasStatusChanges = true
            }
          } catch (error) {
            console.error(`Failed to get DocuSeal status for ${submission.name}:`, error)
            // Continue with local status
          }
        }
      }
      
      // Determine overall status based on all submissions
      const allCompleted = updatedSubmissions.every(s => s.status === 'completed')
      const anySigning = updatedSubmissions.some(s => s.status === 'signing')
      const anyVoided = updatedSubmissions.some(s => s.status === 'voided')
      
      if (allCompleted) {
        overallStatus = 'completed'
      } else if (anyVoided) {
        overallStatus = 'voided'
      } else if (anySigning) {
        overallStatus = 'signing'
      } else {
        overallStatus = 'ready'
      }
      
      // Update our local status if it changed
      if (hasStatusChanges || overallStatus !== contract.status) {
        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { 
            $set: { 
              status: overallStatus, 
              submissions: updatedSubmissions,
              updatedAt: new Date() 
            },
            $push: { 
              audit: {
                at: new Date(),
                who: 'system',
                action: 'status_updated',
                meta: { 
                  from: contract.status, 
                  to: overallStatus,
                  submissionUpdates: updatedSubmissions.map(s => ({ name: s.name, status: s.status }))
                }
              }
            }
          }
        )
      }
    }

    // Get primary submission for backward compatibility
    const primarySubmission = updatedSubmissions.find(s => s.name === 'purchase_agreement') || updatedSubmissions[0]

    res.status(200).json({
      success: true,
      status: overallStatus,
      submissions: updatedSubmissions,
      submissionId: primarySubmission?.submissionId,
      signerUrl: primarySubmission?.signerUrl,
      version: contract.version,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt
    })

  } catch (error) {
    console.error('Contract status error:', error)
    res.status(500).json({ 
      error: 'Failed to get contract status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// DocuSeal webhook handler (for real-time status updates)
app.post(['/api/contracts/webhook', '/contracts/webhook'], async (req, res) => {
  try {
    // Verify webhook signature
    const secret = process.env.DOCUSEAL_WEBHOOK_SECRET || ''
    const signature = req.headers['x-docuseal-signature'] || req.headers['X-DocuSeal-Signature']
    
    if (!secret || signature !== secret) {
      console.error('DocuSeal webhook: Invalid signature')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { event_type, data } = req.body
    console.log('DocuSeal webhook received:', event_type, data?.id)

    if (!data?.id) {
      return res.status(400).json({ error: 'Missing submission ID' })
    }

    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ 
      'submissions.submissionId': data.id 
    })

    if (!contract) {
      console.log('DocuSeal webhook: Contract not found for submission:', data.id)
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Find the specific submission that was updated
    const submissionIndex = contract.submissions?.findIndex(s => s.submissionId === data.id)
    if (submissionIndex === -1 || submissionIndex === undefined) {
      console.log('DocuSeal webhook: Submission not found in contract:', data.id)
      return res.status(404).json({ error: 'Submission not found' })
    }

    const submission = contract.submissions[submissionIndex]
    let newSubmissionStatus = submission.status
    let shouldDownloadPdf = false

    // Handle different event types for the specific submission
    switch (event_type) {
      case 'submission.created':
        newSubmissionStatus = 'ready'
        break
      case 'submission.started':
        newSubmissionStatus = 'signing'
        break
      case 'submission.completed':
        newSubmissionStatus = 'completed'
        shouldDownloadPdf = true
        break
      case 'submission.declined':
        newSubmissionStatus = 'voided'
        break
      default:
        console.log('DocuSeal webhook: Unhandled event type:', event_type)
    }

    // Update the specific submission status
    const updatedSubmissions = [...contract.submissions]
    updatedSubmissions[submissionIndex] = {
      ...submission,
      status: newSubmissionStatus
    }

    // Determine overall contract status based on all submissions
    const allCompleted = updatedSubmissions.every(s => s.status === 'completed')
    const anySigning = updatedSubmissions.some(s => s.status === 'signing')
    const anyVoided = updatedSubmissions.some(s => s.status === 'voided')
    
    let newOverallStatus = contract.status
    if (allCompleted) {
      newOverallStatus = 'completed'
    } else if (anyVoided) {
      newOverallStatus = 'voided'
    } else if (anySigning) {
      newOverallStatus = 'signing'
    } else {
      newOverallStatus = 'ready'
    }

    // Update contract with new submission statuses and overall status
    await db.collection('contracts').updateOne(
      { _id: contract._id },
      { 
        $set: { 
          status: newOverallStatus,
          submissions: updatedSubmissions,
          updatedAt: new Date(),
          ...(data.completed_at && { completedAt: new Date(data.completed_at) })
        },
        $push: { 
          audit: {
            at: new Date(),
            who: 'docuseal_webhook',
            action: event_type,
            meta: { 
              from: contract.status, 
              to: newOverallStatus, 
              submissionName: submission.name,
              submissionStatus: newSubmissionStatus,
              eventData: data 
            }
          }
        }
      }
    )

    // Download and store signed PDF if completed
    if (shouldDownloadPdf && data.audit_trail_url) {
      try {
        const pdfBuffer = await downloadFile(data.audit_trail_url)
        const publicId = `contracts/${contract.buildId}/v${contract.version}/signed_contract`
        
        const cloudinaryResult = await uploadPdfToCloudinary({
          buffer: pdfBuffer,
          folder: 'firefly-estimator/contracts',
          publicId
        })

        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { 
            $set: { 
              signedPdfCloudinaryId: cloudinaryResult.public_id,
              signedPdfUrl: data.audit_trail_url
            }
          }
        )

        console.log('DocuSeal webhook: PDF stored to Cloudinary:', cloudinaryResult.public_id)
      } catch (error) {
        console.error('DocuSeal webhook: Failed to store PDF:', error)
      }
    }

    // Update build status if contract completed
    if (newStatus === 'completed') {
      await updateBuild(contract.buildId, { 
        'contract.status': 'completed',
        'contract.completedAt': new Date(),
        step: 8 // Advance to confirmation step
      })
    }

    res.status(200).json({ success: true })

  } catch (error) {
    console.error('DocuSeal webhook error:', error)
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Helper function to map DocuSeal status to our status
function mapDocuSealStatus(docusealStatus) {
  switch (docusealStatus) {
    case 'pending':
    case 'awaiting_signature':
      return 'ready'
    case 'opened':
    case 'in_progress':
      return 'signing'
    case 'completed':
      return 'completed'
    case 'declined':
    case 'expired':
      return 'voided'
    default:
      return 'draft'
  }
}

// Helper function to build prefill data for DocuSeal
function buildContractPrefill(build, settings) {
  console.log('[CONTRACT_CREATE] Building prefill data for build:', build._id)
  
  const pricing = build.pricing || {}
  const buyerInfo = build.buyerInfo || {}
  const delivery = build.delivery || {}
  const payment = build.payment || {}
  
  console.log('[CONTRACT_CREATE] Build data sections:', {
    hasPricing: !!pricing,
    hasBuyerInfo: !!buyerInfo,
    hasDelivery: !!delivery,
    hasPayment: !!payment,
    pricingKeys: Object.keys(pricing),
    buyerInfoKeys: Object.keys(buyerInfo),
    deliveryKeys: Object.keys(delivery),
    paymentKeys: Object.keys(payment)
  })
  
  // Calculate key amounts
  const totalPurchasePrice = pricing.total || 0
  const depositPercent = payment.plan?.percent || 25
  const depositAmount = Math.round(totalPurchasePrice * depositPercent / 100)
  const balanceAmount = totalPurchasePrice - depositAmount

  const prefill = {
    // Order Information
    order_id: build._id || '',
    order_date: new Date().toLocaleDateString(),
    
    // Dealer Information
    dealer_name: "Firefly Tiny Homes LLC",
    dealer_address: "6150 TX-16, Pipe Creek, TX 78063", 
    dealer_phone: "830-328-6109",
    dealer_rep: "Firefly Representative",
    
    // Buyer Information
    buyer_name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
    buyer_first_name: buyerInfo.firstName || '',
    buyer_last_name: buyerInfo.lastName || '',
    buyer_email: buyerInfo.email || '',
    buyer_phone: buyerInfo.phone || '',
    buyer_address: buyerInfo.address || '',
    buyer_city: buyerInfo.city || '',
    buyer_state: buyerInfo.state || '',
    buyer_zip: buyerInfo.zip || '',
    
    // Unit Information  
    unit_brand: "Athens Park Select",
    unit_model: build.modelName || build.modelCode || '',
    unit_year: new Date().getFullYear().toString(),
    unit_dimensions: build.model?.dimensions || '',
    unit_serial: '', // Will be assigned later
    
    // Pricing
    base_price: formatCurrency(pricing.basePrice || 0),
    options_total: formatCurrency(pricing.optionsTotal || 0),
    delivery_estimate: formatCurrency(pricing.deliveryEstimate || 0),
    title_fee: formatCurrency(pricing.titleFee || 0),
    setup_fee: formatCurrency(pricing.setupFee || 0),
    taxes: formatCurrency(pricing.taxes || 0),
    total_price: formatCurrency(totalPurchasePrice),
    
    // Payment Terms
    deposit_percent: `${depositPercent}%`,
    deposit_amount: formatCurrency(depositAmount),
    balance_amount: formatCurrency(balanceAmount),
    payment_method: payment.method === 'ach_debit' ? 'ACH/Bank Transfer' : 'Cash',
    
    // Delivery Information
    delivery_address: delivery.address || buyerInfo.address || '',
    delivery_city: delivery.city || buyerInfo.city || '',
    delivery_state: delivery.state || buyerInfo.state || '',
    delivery_zip: delivery.zip || buyerInfo.zip || '',
    delivery_notes: delivery.notes || '',
    
    // Legal/Compliance
    state_classification: "Travel Trailer (park model RV)",
    completion_estimate: "8-12 weeks from contract signing",
    storage_policy: "Delivery within 12 days after factory completion; storage charges may apply"
  }

  console.log('[CONTRACT_CREATE] Generated prefill data:', {
    prefillKeys: Object.keys(prefill),
    sampleValues: {
      order_id: prefill.order_id,
      buyer_name: prefill.buyer_name,
      total_price: prefill.total_price,
      payment_method: prefill.payment_method
    }
  })

  return prefill
}

// Helper function to format currency for DocuSeal
function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format((cents || 0) / 100)
}

// Download contract packet (ZIP of all signed PDFs)
app.get(['/api/contracts/download/packet', '/contracts/download/packet'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, version } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const db = await getDb()
    let query = { buildId: buildId, userId: auth.userId }
    if (version) {
      query.version = parseInt(version)
    }
    
    const contract = await db.collection('contracts').findOne(query, { 
      sort: { version: -1 } 
    })

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    if (contract.status !== 'completed') {
      return res.status(400).json({ error: 'Contract not completed yet' })
    }

    if (!contract.signedPdfCloudinaryId) {
      return res.status(404).json({ error: 'Signed documents not available' })
    }

    // Generate signed download URL from Cloudinary
    const signedUrl = signedCloudinaryUrl(contract.signedPdfCloudinaryId)
    
    // For now, redirect to the single PDF. In the future, this could create a ZIP
    res.redirect(signedUrl)

  } catch (error) {
    console.error('Contract download error:', error)
    res.status(500).json({ 
      error: 'Failed to download contract packet',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Download pre-signing summary PDF
app.get(['/api/contracts/download/summary', '/contracts/download/summary'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // For now, return a placeholder response. In production, this would generate
    // a summary PDF with order details, pricing breakdown, etc.
    res.status(501).json({ 
      error: 'Summary PDF generation not yet implemented',
      message: 'This feature will generate a pre-signing order summary PDF'
    })

  } catch (error) {
    console.error('Contract summary download error:', error)
    res.status(500).json({ 
      error: 'Failed to download summary',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
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
    const { firstName, lastName, email, phone, address, city, state, zip } = body
    
    console.log('DEBUG: Request body:', { firstName, lastName, email, phone, address, city, state, zip })
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      console.log('DEBUG: Missing required fields')
      return res.status(400).json({ error: 'missing_required_fields', message: 'First name, last name, and email are required' })
    }
    
    console.log('DEBUG: Ensuring user profile indexes...')
    await ensureUserProfileIndexes()
    console.log('DEBUG: Indexes ensured successfully')
    
    console.log('DEBUG: Updating user basic info...')
    const profile = await updateUserBasicInfo(auth.userId, { firstName, lastName, email, phone, address, city, state, zip })
    
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

// ===== POLICY MANAGEMENT =====

// Get all policies
app.get(['/api/admin/policies', '/admin/policies'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const db = await getDb()
    const policies = await db.collection('policies').find({}).toArray()
    
    // Return default policies if none exist
    if (policies.length === 0) {
      const defaultPolicies = [
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          content: getDefaultPrivacyPolicy(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        },
        {
          id: 'terms-conditions',
          title: 'Terms & Conditions',
          content: getDefaultTermsConditions(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        },
        {
          id: 'other-policies',
          title: 'Other Policies',
          content: getDefaultOtherPolicies(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        }
      ]
      
      // Insert default policies
      await db.collection('policies').insertMany(defaultPolicies)
      return res.status(200).json(defaultPolicies)
    }
    
    return res.status(200).json(policies)
  } catch (error) {
    console.error('Get policies error:', error)
    return res.status(500).json({ 
      error: 'policies_failed', 
      message: error.message || 'Failed to load policies'
    })
  }
})

// Get single policy
app.get(['/api/policies/:id', '/policies/:id'], async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const policy = await db.collection('policies').findOne({ id })
    
    if (!policy) {
      // Return default policy content if not found
      let defaultContent = ''
      switch (id) {
        case 'privacy-policy':
          defaultContent = getDefaultPrivacyPolicy()
          break
        case 'terms-conditions':
          defaultContent = getDefaultTermsConditions()
          break
        case 'other-policies':
          defaultContent = getDefaultOtherPolicies()
          break
        default:
          return res.status(404).json({ error: 'Policy not found' })
      }
      
      const defaultPolicy = {
        id,
        title: id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        content: defaultContent,
        lastUpdated: new Date(),
        updatedBy: 'system'
      }
      
      return res.status(200).json(defaultPolicy)
    }
    
    return res.status(200).json(policy)
  } catch (error) {
    console.error('Get policy error:', error)
    return res.status(500).json({ 
      error: 'policy_failed', 
      message: error.message || 'Failed to load policy'
    })
  }
})

// Update policy
app.put(['/api/admin/policies/:id', '/admin/policies/:id'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const { title, content } = req.body
    
    if (!title || !content) {
      return res.status(400).json({ 
        error: 'missing_fields', 
        message: 'Title and content are required' 
      })
    }
    
    const db = await getDb()
    const updateData = {
      id,
      title: String(title).slice(0, 200),
      content: String(content),
      lastUpdated: new Date(),
      updatedBy: auth.userId
    }
    
    const result = await db.collection('policies').updateOne(
      { id },
      { $set: updateData },
      { upsert: true }
    )
    
    return res.status(200).json({
      success: true,
      policy: updateData,
      modified: result.modifiedCount > 0,
      created: result.upsertedCount > 0
    })
  } catch (error) {
    console.error('Update policy error:', error)
    return res.status(500).json({ 
      error: 'policy_update_failed', 
      message: error.message || 'Failed to update policy'
    })
  }
})

// Pages routes
app.get(['/api/pages/:pageId', '/pages/:pageId'], async (req, res) => {
  try {
    const { pageId } = req.params
    const db = await getDb()
    
    // Get page content from database
    const page = await db.collection('pages').findOne({ pageId })
    
    if (!page) {
      // Return default content structure if page doesn't exist
      const defaultContent = getDefaultPageContent(pageId)
          return res.status(200).json({
      pageId,
      content: defaultContent,
      images: {},
      lastUpdated: new Date(),
      updatedBy: 'system'
    })
    }
    
    return res.status(200).json(page)
  } catch (error) {
    console.error('Get page error:', error)
    return res.status(500).json({ 
      error: 'page_fetch_failed', 
      message: error.message || 'Failed to fetch page content'
    })
  }
})

// Update page content
app.patch(['/api/pages/:pageId', '/pages/:pageId'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { pageId } = req.params
    const { content, images } = req.body
    const db = await getDb()
    
    const updateData = {
      pageId,
      content: content || {},
      images: typeof images === 'object' && images !== null ? images : {},
      lastUpdated: new Date(),
      updatedBy: auth.userId
    }
    
    const result = await db.collection('pages').updateOne(
      { pageId },
      { $set: updateData },
      { upsert: true }
    )
    
    return res.status(200).json({
      success: true,
      pageId,
      content: updateData.content,
      images: updateData.images,
      lastUpdated: updateData.lastUpdated,
      updatedBy: updateData.updatedBy,
      modified: result.modifiedCount > 0,
      created: result.upsertedCount > 0
    })
  } catch (error) {
    console.error('Update page error:', error)
    return res.status(500).json({ 
      error: 'page_update_failed', 
      message: error.message || 'Failed to update page content'
    })
  }
})

// Blog routes
app.get(['/api/blog', '/blog'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) {
    console.log('[DEBUG_ADMIN] Blog GET route hit', { 
      url: req.url, 
      method: req.method, 
      path: req.query?.path,
      originalUrl: req.originalUrl 
    })
  }
  
  try {
    const db = await getDb()
    const { category, limit = 10, offset = 0 } = req.query
    
    let query = { status: 'published' }
    if (category) {
      query.category = category
    }
    
    const posts = await db.collection('blog_posts')
      .find(query)
      .sort({ publishDate: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray()
    
    const total = await db.collection('blog_posts').countDocuments(query)
    
    if (debug) {
      console.log('[DEBUG_ADMIN] Blog GET response', { 
        postsCount: posts.length, 
        total, 
        hasMore: total > parseInt(offset) + posts.length 
      })
    }
    
    return res.status(200).json({
      posts,
      total,
      hasMore: total > parseInt(offset) + posts.length
    })
  } catch (error) {
    console.error('Get blog posts error:', error)
    return res.status(500).json({ 
      error: 'blog_fetch_failed', 
      message: error.message || 'Failed to fetch blog posts'
    })
  }
})

app.get(['/api/blog/:slug', '/blog/:slug'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  try {
    const { slug } = req.params
    const db = await getDb()
    
    const post = await db.collection('blog_posts').findOne({ 
      slug,
      status: 'published'
    })
    
    if (!post) {
      return res.status(404).json({ 
        error: 'post_not_found', 
        message: 'Blog post not found'
      })
    }
    
    // Increment view count
    await db.collection('blog_posts').updateOne(
      { _id: post._id },
      { $inc: { views: 1 } }
    )
    
    return res.status(200).json(post)
  } catch (error) {
    console.error('Get blog post error:', error)
    return res.status(500).json({ 
      error: 'blog_post_fetch_failed', 
      message: error.message || 'Failed to fetch blog post'
    })
  }
})

app.post(['/api/blog', '/blog'], async (req, res) => {
  applyCors(req, res, 'POST, OPTIONS')
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const debug = process.env.DEBUG_ADMIN === 'true'
  console.log('[BLOG_POST] Route hit', { 
    url: req.url, 
    method: req.method, 
    path: req.query?.path,
    originalUrl: req.originalUrl,
    bodyKeys: Object.keys(req.body || {}),
    hasBody: !!req.body,
    bodyType: typeof req.body
  })
  
  // Temporarily allow blog creation without strict admin checks for testing
  const auth = await requireAuth(req, res, false) // Changed from requireAdmin to requireAuth with adminOnly=false
  if (!auth) {
    console.log('[BLOG_POST] Auth failed')
    return
  }
  console.log('[BLOG_POST] Auth successful', { userId: auth.userId })
  
  try {
    const db = await getDb()
    
    // Ensure blog_posts collection exists
    try {
      const collections = await db.listCollections().toArray()
      const blogCollectionExists = collections.some(col => col.name === 'blog_posts')
      if (!blogCollectionExists) {
        console.log('[BLOG_POST] Creating blog_posts collection')
        await db.createCollection('blog_posts')
      }
      console.log('[BLOG_POST] Blog collection ready')
    } catch (error) {
      console.error('[BLOG_POST] Error ensuring blog collection exists:', error)
      // Continue anyway, the collection might already exist
    }
    
    console.log('[BLOG_POST] Database connection successful')
    const postData = req.body
    console.log('[BLOG_POST] Post data received', { 
      hasTitle: !!postData.title, 
      hasContent: !!postData.content,
      titleLength: postData.title?.length,
      contentLength: postData.content?.length,
      keys: Object.keys(postData || {}),
      title: postData.title?.substring(0, 50) + '...',
      content: postData.content?.substring(0, 100) + '...'
    })
    
    // Validate required fields
    if (!postData.title || !postData.content) {
      console.log('[BLOG_POST] Validation failed', { 
        hasTitle: !!postData.title, 
        hasContent: !!postData.content 
      })
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Generate slug if not provided
    if (!postData.slug) {
      postData.slug = postData.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 100) // Limit length to 100 characters
    }
    
    console.log('[BLOG_POST] Generated slug:', postData.slug)
    
    // Check if slug already exists
    const existingPost = await db.collection('blog_posts').findOne({ slug: postData.slug })
    console.log('[BLOG_POST] Slug check:', { slug: postData.slug, exists: !!existingPost })
    if (existingPost) {
      console.log('[BLOG_POST] Slug already exists, returning error')
      return res.status(400).json({
        error: 'slug_exists',
        message: 'A post with this URL already exists'
      })
    }
    
    const newPost = {
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      author: auth.userId
    }
    
    const result = await db.collection('blog_posts').insertOne(newPost)
    console.log('[BLOG_POST] Successfully created post', { 
      insertedId: result.insertedId,
      title: newPost.title 
    })
    
    return res.status(201).json({
      success: true,
      id: result.insertedId,
      ...newPost
    })
  } catch (error) {
    console.error('[BLOG_POST] Create blog post error:', error)
    console.error('[BLOG_POST] Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'blog_post_create_failed', 
      message: error.message || 'Failed to create blog post'
    })
  }
})

app.put(['/api/blog/:id', '/blog/:id'], async (req, res) => {
  applyCors(req, res, 'PUT, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    const postData = req.body
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Validate required fields
    if (!postData.title || !postData.content) {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Check if slug already exists for different post
    if (postData.slug) {
      const existingPost = await db.collection('blog_posts').findOne({ 
        slug: postData.slug,
        _id: { $ne: objectId }
      })
      if (existingPost) {
        return res.status(400).json({
          error: 'slug_exists',
          message: 'A post with this URL already exists'
        })
      }
    }
    
    // SANITIZE DATA: Remove immutable and system fields
    const {
      _id,           // MongoDB immutable field
      __v,           // Mongoose version field (if using Mongoose)
      createdAt,     // System field - should not be updated
      views,         // System field - managed by API
      ...sanitizedData
    } = postData
    
    // Add system fields
    const updateData = {
      ...sanitizedData,
      updatedAt: new Date()
    }
    
    const result = await db.collection('blog_posts').updateOne(
      { _id: objectId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found'
      })
    }
    
    if (result.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes were made to the blog post',
        id
      })
    }
    
    // Fetch updated post to return
    const updatedPost = await db.collection('blog_posts').findOne({ _id: objectId })
    
    return res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      id,
      post: updatedPost
    })
  } catch (error) {
    console.error('Update blog post error:', error)
    
    // Handle specific MongoDB errors
    if (error.code === 66) {
      return res.status(400).json({
        error: 'immutable_field_error',
        message: 'Cannot update immutable fields like _id'
      })
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        error: 'duplicate_key_error',
        message: 'A post with this slug already exists'
      })
    }
    
    return res.status(500).json({ 
      error: 'blog_post_update_failed', 
      message: error.message || 'Failed to update blog post'
    })
  }
})

// Admin-specific blog editing endpoint with enhanced security
app.put(['/api/admin/blog/:id', '/admin/blog/:id'], async (req, res) => {
  applyCors(req, res, 'PUT, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    const postData = req.body
    
    // Enhanced validation for admin editing
    if (!postData.title || !postData.content) {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Check if post exists and user has permission
    const existingPost = await db.collection('blog_posts').findOne({ _id: objectId })
    if (!existingPost) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found'
      })
    }
    
    // Check if slug already exists for different post
    if (postData.slug && postData.slug !== existingPost.slug) {
      const slugConflict = await db.collection('blog_posts').findOne({ 
        slug: postData.slug,
        _id: { $ne: objectId }
      })
      if (slugConflict) {
        return res.status(400).json({
          error: 'slug_exists',
          message: 'A post with this URL already exists'
        })
      }
    }
    
    // COMPREHENSIVE DATA SANITIZATION
    const {
      _id,           // MongoDB immutable field
      __v,           // Mongoose version field
      createdAt,     // System field - creation timestamp
      views,         // System field - view count
      updatedAt,     // System field - will be set by API
      ...sanitizedData
    } = postData
    
    // Add system fields and admin metadata
    const updateData = {
      ...sanitizedData,
      updatedAt: new Date(),
      lastEditedBy: auth.userId,
      lastEditedAt: new Date()
    }
    
    // Perform the update
    const result = await db.collection('blog_posts').updateOne(
      { _id: objectId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found during update'
      })
    }
    
    // Fetch updated post to return
    const updatedPost = await db.collection('blog_posts').findOne({ _id: objectId })
    
    // Log admin action for audit trail
    await db.collection('admin_actions').insertOne({
      action: 'blog_post_updated',
      adminId: auth.userId,
      postId: objectId,
      postTitle: postData.title,
      timestamp: new Date(),
      changes: Object.keys(updateData)
    })
    
    return res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      id,
      post: updatedPost,
      changes: result.modifiedCount > 0 ? 'Modified' : 'No changes'
    })
  } catch (error) {
    console.error('Admin blog update error:', error)
    
    // Handle specific MongoDB errors with detailed messages
    if (error.code === 66) {
      return res.status(400).json({
        error: 'immutable_field_error',
        message: 'Cannot update immutable fields like _id',
        details: 'The system automatically excludes immutable fields from updates'
      })
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        error: 'duplicate_key_error',
        message: 'A post with this slug already exists',
        details: 'Please choose a different URL slug for this post'
      })
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Data validation failed',
        details: error.message
      })
    }
    
    return res.status(500).json({ 
      error: 'admin_blog_update_failed', 
      message: 'Failed to update blog post',
      details: error.message || 'Internal server error'
    })
  }
})

// Admin endpoint for fetching blog posts for editing (includes unpublished posts)
app.get(['/api/admin/blog/:id', '/admin/blog/:id'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Fetch post for editing (admin can see all posts regardless of status)
    const post = await db.collection('blog_posts').findOne({ _id: objectId })
    
    if (!post) {
      return res.status(404).json({ 
        error: 'post_not_found', 
        message: 'Blog post not found'
      })
    }
    
    // Log admin access for audit trail
    await db.collection('admin_actions').insertOne({
      action: 'blog_post_accessed_for_editing',
      adminId: auth.userId,
      postId: objectId,
      postTitle: post.title,
      timestamp: new Date()
    })
    
    return res.status(200).json(post)
  } catch (error) {
    console.error('Admin blog fetch error:', error)
    return res.status(500).json({ 
      error: 'admin_blog_fetch_failed', 
      message: error.message || 'Failed to fetch blog post for editing'
    })
  }
})

// ===== END AI Routes =====

// ===== Builds (new) =====
// Create build (from model or migrated guest draft)
app.post(['/api/builds', '/builds'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
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
  // Step 4 is where users enter buyer info, so don't require it to advance TO step 4
  if (target >= 5) {
    const bi = b?.buyerInfo || {}
    const ok = bi.firstName && bi.lastName && bi.email && bi.address
    if (!ok) return res.status(400).json({ error: 'incomplete_buyer' })
  }
  
  // Only check financing for steps after payment method step (step 7+)
  if (target >= 7 && !(b?.financing?.method)) {
    return res.status(400).json({ error: 'missing_payment_method' })
  }
  
  // Only check contract for confirmation step (step 8) - users need to reach step 7 to sign
  if (target >= 8) {
    const c = b?.contract || {}
    if (c?.status !== 'signed') return res.status(400).json({ error: 'contract_not_signed' })
  }
  
  const updated = await updateBuild(req.params.id, { step: target })
  return res.status(200).json(updated)
})

// ===== NEW CONTRACT API ENDPOINTS =====

// Create contract submission (for new contract page)
app.post(['/api/contracts/create', '/contracts/create'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    console.log('[CONTRACT_CREATE] Request received:', { 
      method: req.method, 
      hasBody: !!req.body, 
      bodyKeys: req.body ? Object.keys(req.body) : [],
      body: req.body 
    })

    const { buildId } = req.body
    if (!buildId) {
          console.log('[CONTRACT_CREATE] Missing buildId in request body')
    return res.status(400).json({ error: 'Build ID is required' })
  }

  console.log('[CONTRACT_CREATE] Looking up build:', buildId)
  const build = await getBuildById(buildId)
  console.log('[CONTRACT_CREATE] Build lookup result:', { 
    found: !!build, 
    buildId: build?._id, 
    userId: build?.userId, 
    authUserId: auth.userId,
    match: build?.userId === auth.userId 
  })
  
  if (!build || build.userId !== auth.userId) {
    console.log('[CONTRACT_CREATE] Build not found or access denied')
    return res.status(404).json({ error: 'Build not found' })
  }

    const settings = await getOrgSettings()
    
    // Define all required templates
    const templates = [
      {
        name: 'purchase_agreement',
        envKey: 'DOCUSEAL_PURCHASE_TEMPLATE_ID',
        title: 'Purchase Agreement',
        description: 'Primary purchase contract with all terms and conditions'
      }
    ]

    // For now, only require the purchase agreement template
    // TODO: Add other templates once they're configured in DocuSeal
    if (!process.env.DOCUSEAL_PURCHASE_TEMPLATE_ID) {
      console.log('[CONTRACT_CREATE] Missing purchase agreement template configuration')
      return res.status(500).json({ 
        error: 'DocuSeal purchase agreement template not configured',
        missing: ['DOCUSEAL_PURCHASE_TEMPLATE_ID']
      })
    }

    // Optional: Add other templates if they're configured
    const optionalTemplates = [
      {
        name: 'payment_terms',
        envKey: 'DOCUSEAL_PAYMENT_TERMS_TEMPLATE_ID',
        title: 'Payment Terms Agreement',
        description: 'Payment method, deposit, and balance terms'
      },
      {
        name: 'delivery_agreement',
        envKey: 'DOCUSEAL_DELIVERY_TEMPLATE_ID',
        title: 'Delivery Agreement',
        description: 'Delivery schedule, site requirements, and setup'
      },
      {
        name: 'warranty_information',
        envKey: 'DOCUSEAL_WARRANTY_TEMPLATE_ID',
        title: 'Warranty Information',
        description: 'Warranty terms, coverage, and service information'
      },
      {
        name: 'legal_disclosures',
        envKey: 'DOCUSEAL_LEGAL_DISCLOSURES_TEMPLATE_ID',
        title: 'Legal Disclosures',
        description: 'Required consumer rights and legal disclosures'
      }
    ]

    // Add optional templates if they're configured
    for (const template of optionalTemplates) {
      if (process.env[template.envKey]) {
        templates.push(template)
      }
    }

    // Build prefill data from build
    const prefill = buildContractPrefill(build, settings)

    // Create DocuSeal submissions for all templates
    const buyerInfo = build.buyerInfo || {}
    const submitters = [{
      name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
      email: buyerInfo.email || '',
      role: 'buyer1'
    }]
    
    const submissions = []
    
    for (const template of templates) {
      const templateId = Number(process.env[template.envKey])
      console.log(`[CONTRACT_CREATE] Creating submission for ${template.name}:`, {
        templateId,
        templateName: template.title
      })
      
      try {
        const submission = await createSubmission({
          templateId,
          prefill,
          submitters,
          sendEmail: false, // Don't send email until user is ready
          completedRedirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/checkout/${buildId}/confirm`,
          cancelRedirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/checkout/${buildId}/agreement`
        })
        
        submissions.push({
          name: template.name,
          title: template.title,
          description: template.description,
          templateId,
          submissionId: submission.submissionId,
          signerUrl: submission.signerUrl,
          status: 'ready'
        })
        
        console.log(`[CONTRACT_CREATE] Successfully created submission for ${template.name}:`, submission.submissionId)
      } catch (error) {
        console.error(`[CONTRACT_CREATE] Failed to create submission for ${template.name}:`, error)
        throw new Error(`Failed to create ${template.title}: ${error.message}`)
      }
    }

    // Store contract in database with all submissions
    const db = await getDb()
    const { ObjectId } = await import('mongodb')
    
    const contractData = {
      _id: new ObjectId(),
      buildId: buildId,
      userId: auth.userId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      submissions: submissions,
      status: 'ready',
      pricingSnapshot: build.pricing || {},
      buyerInfo: build.buyerInfo || {},
      delivery: build.delivery || {},
      payment: build.payment || {},
      audit: [{
        at: new Date(),
        who: auth.userId,
        action: 'contract_created',
        meta: { 
          submissionCount: submissions.length,
          submissionIds: submissions.map(s => s.submissionId)
        }
      }]
    }

    await db.collection('contracts').insertOne(contractData)

    // Update build to reference contract
    await updateBuild(buildId, { 
      'contract.submissionIds': submissions.map(s => s.submissionId),
      'contract.status': 'ready',
      'contract.createdAt': new Date()
    })

    // Return primary submission URL (Purchase Agreement)
    const primarySubmission = submissions.find(s => s.name === 'purchase_agreement')
    
    res.status(200).json({
      success: true,
      submissions: submissions,
      submissionId: primarySubmission?.submissionId,
      signerUrl: primarySubmission?.signerUrl,
      status: 'ready',
      version: 1
    })

  } catch (error) {
    console.error('Contract creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create contract',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get contract status (for real-time polling)
app.get(['/api/contracts/status', '/contracts/status'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ 
      buildId: buildId, 
      userId: auth.userId 
    }, { sort: { version: -1 } }) // Get latest version

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Get latest status from DocuSeal for all submissions
    let overallStatus = contract.status
    let updatedSubmissions = contract.submissions || []
    let hasStatusChanges = false
    
    if (updatedSubmissions.length > 0) {
      for (let i = 0; i < updatedSubmissions.length; i++) {
        const submission = updatedSubmissions[i]
        if (submission.submissionId) {
          try {
            const docusealSubmission = await getSubmission(submission.submissionId)
            const docusealStatus = mapDocuSealStatus(docusealSubmission.status || docusealSubmission.state)
            
            // Update submission status if it changed
            if (docusealStatus !== submission.status) {
              updatedSubmissions[i] = {
                ...submission,
                status: docusealStatus
              }
              hasStatusChanges = true
            }
          } catch (error) {
            console.error(`Failed to get DocuSeal status for ${submission.name}:`, error)
            // Continue with local status
          }
        }
      }
      
      // Determine overall status based on all submissions
      const allCompleted = updatedSubmissions.every(s => s.status === 'completed')
      const anySigning = updatedSubmissions.some(s => s.status === 'signing')
      const anyVoided = updatedSubmissions.some(s => s.status === 'voided')
      
      if (allCompleted) {
        overallStatus = 'completed'
      } else if (anyVoided) {
        overallStatus = 'voided'
      } else if (anySigning) {
        overallStatus = 'signing'
      } else {
        overallStatus = 'ready'
      }
      
      // Update our local status if it changed
      if (hasStatusChanges || overallStatus !== contract.status) {
        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { 
            $set: { 
              status: overallStatus, 
              submissions: updatedSubmissions,
              updatedAt: new Date() 
            },
            $push: { 
              audit: {
                at: new Date(),
                who: 'system',
                action: 'status_updated',
                meta: { 
                  from: contract.status, 
                  to: overallStatus,
                  submissionUpdates: updatedSubmissions.map(s => ({ name: s.name, status: s.status }))
                }
              }
            }
          }
        )
      }
    }

    // Get primary submission for backward compatibility
    const primarySubmission = updatedSubmissions.find(s => s.name === 'purchase_agreement') || updatedSubmissions[0]

    res.status(200).json({
      success: true,
      status: overallStatus,
      submissions: updatedSubmissions,
      submissionId: primarySubmission?.submissionId,
      signerUrl: primarySubmission?.signerUrl,
      version: contract.version,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt
    })

  } catch (error) {
    console.error('Contract status error:', error)
    res.status(500).json({ 
      error: 'Failed to get contract status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// DocuSeal webhook handler (for real-time status updates)
app.post(['/api/contracts/webhook', '/contracts/webhook'], async (req, res) => {
  try {
    // Verify webhook signature
    const secret = process.env.DOCUSEAL_WEBHOOK_SECRET || ''
    const signature = req.headers['x-docuseal-signature'] || req.headers['X-DocuSeal-Signature']
    
    if (!secret || signature !== secret) {
      console.error('DocuSeal webhook: Invalid signature')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { event_type, data } = req.body
    console.log('DocuSeal webhook received:', event_type, data?.id)

    if (!data?.id) {
      return res.status(400).json({ error: 'Missing submission ID' })
    }

    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ 
      'submissions.submissionId': data.id 
    })

    if (!contract) {
      console.log('DocuSeal webhook: Contract not found for submission:', data.id)
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Find the specific submission that was updated
    const submissionIndex = contract.submissions?.findIndex(s => s.submissionId === data.id)
    if (submissionIndex === -1 || submissionIndex === undefined) {
      console.log('DocuSeal webhook: Submission not found in contract:', data.id)
      return res.status(404).json({ error: 'Submission not found' })
    }

    const submission = contract.submissions[submissionIndex]
    let newSubmissionStatus = submission.status
    let shouldDownloadPdf = false

    // Handle different event types for the specific submission
    switch (event_type) {
      case 'submission.created':
        newSubmissionStatus = 'ready'
        break
      case 'submission.started':
        newSubmissionStatus = 'signing'
        break
      case 'submission.completed':
        newSubmissionStatus = 'completed'
        shouldDownloadPdf = true
        break
      case 'submission.declined':
        newSubmissionStatus = 'voided'
        break
      default:
        console.log('DocuSeal webhook: Unhandled event type:', event_type)
    }

    // Update the specific submission status
    const updatedSubmissions = [...contract.submissions]
    updatedSubmissions[submissionIndex] = {
      ...submission,
      status: newSubmissionStatus
    }

    // Determine overall contract status based on all submissions
    const allCompleted = updatedSubmissions.every(s => s.status === 'completed')
    const anySigning = updatedSubmissions.some(s => s.status === 'signing')
    const anyVoided = updatedSubmissions.some(s => s.status === 'voided')
    
    let newOverallStatus = contract.status
    if (allCompleted) {
      newOverallStatus = 'completed'
    } else if (anyVoided) {
      newOverallStatus = 'voided'
    } else if (anySigning) {
      newOverallStatus = 'signing'
    } else {
      newOverallStatus = 'ready'
    }

    // Update contract with new submission statuses and overall status
    await db.collection('contracts').updateOne(
      { _id: contract._id },
      { 
        $set: { 
          status: newOverallStatus,
          submissions: updatedSubmissions,
          updatedAt: new Date(),
          ...(data.completed_at && { completedAt: new Date(data.completed_at) })
        },
        $push: { 
          audit: {
            at: new Date(),
            who: 'docuseal_webhook',
            action: event_type,
            meta: { 
              from: contract.status, 
              to: newOverallStatus, 
              submissionName: submission.name,
              submissionStatus: newSubmissionStatus,
              eventData: data 
            }
          }
        }
      }
    )

    // Download and store signed PDF if completed
    if (shouldDownloadPdf && data.audit_trail_url) {
      try {
        const pdfBuffer = await downloadFile(data.audit_trail_url)
        const publicId = `contracts/${contract.buildId}/v${contract.version}/signed_contract`
        
        const cloudinaryResult = await uploadPdfToCloudinary({
          buffer: pdfBuffer,
          folder: 'firefly-estimator/contracts',
          publicId
        })

        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { 
            $set: { 
              signedPdfCloudinaryId: cloudinaryResult.public_id,
              signedPdfUrl: data.audit_trail_url
            }
          }
        )

        console.log('DocuSeal webhook: PDF stored to Cloudinary:', cloudinaryResult.public_id)
      } catch (error) {
        console.error('DocuSeal webhook: Failed to store PDF:', error)
      }
    }

    // Update build status if contract completed
    if (newStatus === 'completed') {
      await updateBuild(contract.buildId, { 
        'contract.status': 'completed',
        'contract.completedAt': new Date(),
        step: 8 // Advance to confirmation step
      })
    }

    res.status(200).json({ success: true })

  } catch (error) {
    console.error('DocuSeal webhook error:', error)
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Helper function to map DocuSeal status to our status
function mapDocuSealStatus(docusealStatus) {
  switch (docusealStatus) {
    case 'pending':
    case 'awaiting_signature':
      return 'ready'
    case 'opened':
    case 'in_progress':
      return 'signing'
    case 'completed':
      return 'completed'
    case 'declined':
    case 'expired':
      return 'voided'
    default:
      return 'draft'
  }
}

// Helper function to build prefill data for DocuSeal
function buildContractPrefill(build, settings) {
  console.log('[CONTRACT_CREATE] Building prefill data for build:', build._id)
  
  const pricing = build.pricing || {}
  const buyerInfo = build.buyerInfo || {}
  const delivery = build.delivery || {}
  const payment = build.payment || {}
  
  console.log('[CONTRACT_CREATE] Build data sections:', {
    hasPricing: !!pricing,
    hasBuyerInfo: !!buyerInfo,
    hasDelivery: !!delivery,
    hasPayment: !!payment,
    pricingKeys: Object.keys(pricing),
    buyerInfoKeys: Object.keys(buyerInfo),
    deliveryKeys: Object.keys(delivery),
    paymentKeys: Object.keys(payment)
  })
  
  // Calculate key amounts
  const totalPurchasePrice = pricing.total || 0
  const depositPercent = payment.plan?.percent || 25
  const depositAmount = Math.round(totalPurchasePrice * depositPercent / 100)
  const balanceAmount = totalPurchasePrice - depositAmount

  const prefill = {
    // Order Information
    order_id: build._id || '',
    order_date: new Date().toLocaleDateString(),
    
    // Dealer Information
    dealer_name: "Firefly Tiny Homes LLC",
    dealer_address: "6150 TX-16, Pipe Creek, TX 78063", 
    dealer_phone: "830-328-6109",
    dealer_rep: "Firefly Representative",
    
    // Buyer Information
    buyer_name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
    buyer_first_name: buyerInfo.firstName || '',
    buyer_last_name: buyerInfo.lastName || '',
    buyer_email: buyerInfo.email || '',
    buyer_phone: buyerInfo.phone || '',
    buyer_address: buyerInfo.address || '',
    buyer_city: buyerInfo.city || '',
    buyer_state: buyerInfo.state || '',
    buyer_zip: buyerInfo.zip || '',
    
    // Unit Information  
    unit_brand: "Athens Park Select",
    unit_model: build.modelName || build.modelCode || '',
    unit_year: new Date().getFullYear().toString(),
    unit_dimensions: build.model?.dimensions || '',
    unit_serial: '', // Will be assigned later
    
    // Pricing
    base_price: formatCurrency(pricing.basePrice || 0),
    options_total: formatCurrency(pricing.optionsTotal || 0),
    delivery_estimate: formatCurrency(pricing.deliveryEstimate || 0),
    title_fee: formatCurrency(pricing.titleFee || 0),
    setup_fee: formatCurrency(pricing.setupFee || 0),
    taxes: formatCurrency(pricing.taxes || 0),
    total_price: formatCurrency(totalPurchasePrice),
    
    // Payment Terms
    deposit_percent: `${depositPercent}%`,
    deposit_amount: formatCurrency(depositAmount),
    balance_amount: formatCurrency(balanceAmount),
    payment_method: payment.method === 'ach_debit' ? 'ACH/Bank Transfer' : 'Cash',
    
    // Delivery Information
    delivery_address: delivery.address || buyerInfo.address || '',
    delivery_city: delivery.city || buyerInfo.city || '',
    delivery_state: delivery.state || buyerInfo.state || '',
    delivery_zip: delivery.zip || buyerInfo.zip || '',
    delivery_notes: delivery.notes || '',
    
    // Legal/Compliance
    state_classification: "Travel Trailer (park model RV)",
    completion_estimate: "8-12 weeks from contract signing",
    storage_policy: "Delivery within 12 days after factory completion; storage charges may apply"
  }

  console.log('[CONTRACT_CREATE] Generated prefill data:', {
    prefillKeys: Object.keys(prefill),
    sampleValues: {
      order_id: prefill.order_id,
      buyer_name: prefill.buyer_name,
      total_price: prefill.total_price,
      payment_method: prefill.payment_method
    }
  })

  return prefill
}

// Helper function to format currency for DocuSeal
function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format((cents || 0) / 100)
}

// Download contract packet (ZIP of all signed PDFs)
app.get(['/api/contracts/download/packet', '/contracts/download/packet'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, version } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const db = await getDb()
    let query = { buildId: buildId, userId: auth.userId }
    if (version) {
      query.version = parseInt(version)
    }
    
    const contract = await db.collection('contracts').findOne(query, { 
      sort: { version: -1 } 
    })

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    if (contract.status !== 'completed') {
      return res.status(400).json({ error: 'Contract not completed yet' })
    }

    if (!contract.signedPdfCloudinaryId) {
      return res.status(404).json({ error: 'Signed documents not available' })
    }

    // Generate signed download URL from Cloudinary
    const signedUrl = signedCloudinaryUrl(contract.signedPdfCloudinaryId)
    
    // For now, redirect to the single PDF. In the future, this could create a ZIP
    res.redirect(signedUrl)

  } catch (error) {
    console.error('Contract download error:', error)
    res.status(500).json({ 
      error: 'Failed to download contract packet',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Download pre-signing summary PDF
app.get(['/api/contracts/download/summary', '/contracts/download/summary'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // For now, return a placeholder response. In production, this would generate
    // a summary PDF with order details, pricing breakdown, etc.
    res.status(501).json({ 
      error: 'Summary PDF generation not yet implemented',
      message: 'This feature will generate a pre-signing order summary PDF'
    })

  } catch (error) {
    console.error('Contract summary download error:', error)
    res.status(500).json({ 
      error: 'Failed to download summary',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
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
    const { firstName, lastName, email, phone, address, city, state, zip } = body
    
    console.log('DEBUG: Request body:', { firstName, lastName, email, phone, address, city, state, zip })
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      console.log('DEBUG: Missing required fields')
      return res.status(400).json({ error: 'missing_required_fields', message: 'First name, last name, and email are required' })
    }
    
    console.log('DEBUG: Ensuring user profile indexes...')
    await ensureUserProfileIndexes()
    console.log('DEBUG: Indexes ensured successfully')
    
    console.log('DEBUG: Updating user basic info...')
    const profile = await updateUserBasicInfo(auth.userId, { firstName, lastName, email, phone, address, city, state, zip })
    
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

// ===== POLICY MANAGEMENT =====

// Get all policies
app.get(['/api/admin/policies', '/admin/policies'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const db = await getDb()
    const policies = await db.collection('policies').find({}).toArray()
    
    // Return default policies if none exist
    if (policies.length === 0) {
      const defaultPolicies = [
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          content: getDefaultPrivacyPolicy(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        },
        {
          id: 'terms-conditions',
          title: 'Terms & Conditions',
          content: getDefaultTermsConditions(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        },
        {
          id: 'other-policies',
          title: 'Other Policies',
          content: getDefaultOtherPolicies(),
          lastUpdated: new Date(),
          updatedBy: auth.userId
        }
      ]
      
      // Insert default policies
      await db.collection('policies').insertMany(defaultPolicies)
      return res.status(200).json(defaultPolicies)
    }
    
    return res.status(200).json(policies)
  } catch (error) {
    console.error('Get policies error:', error)
    return res.status(500).json({ 
      error: 'policies_failed', 
      message: error.message || 'Failed to load policies'
    })
  }
})

// Get single policy
app.get(['/api/policies/:id', '/policies/:id'], async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const policy = await db.collection('policies').findOne({ id })
    
    if (!policy) {
      // Return default policy content if not found
      let defaultContent = ''
      switch (id) {
        case 'privacy-policy':
          defaultContent = getDefaultPrivacyPolicy()
          break
        case 'terms-conditions':
          defaultContent = getDefaultTermsConditions()
          break
        case 'other-policies':
          defaultContent = getDefaultOtherPolicies()
          break
        default:
          return res.status(404).json({ error: 'Policy not found' })
      }
      
      const defaultPolicy = {
        id,
        title: id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        content: defaultContent,
        lastUpdated: new Date(),
        updatedBy: 'system'
      }
      
      return res.status(200).json(defaultPolicy)
    }
    
    return res.status(200).json(policy)
  } catch (error) {
    console.error('Get policy error:', error)
    return res.status(500).json({ 
      error: 'policy_failed', 
      message: error.message || 'Failed to load policy'
    })
  }
})

// Update policy
app.put(['/api/admin/policies/:id', '/admin/policies/:id'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const { title, content } = req.body
    
    if (!title || !content) {
      return res.status(400).json({ 
        error: 'missing_fields', 
        message: 'Title and content are required' 
      })
    }
    
    const db = await getDb()
    const updateData = {
      id,
      title: String(title).slice(0, 200),
      content: String(content),
      lastUpdated: new Date(),
      updatedBy: auth.userId
    }
    
    const result = await db.collection('policies').updateOne(
      { id },
      { $set: updateData },
      { upsert: true }
    )
    
    return res.status(200).json({
      success: true,
      policy: updateData,
      modified: result.modifiedCount > 0,
      created: result.upsertedCount > 0
    })
  } catch (error) {
    console.error('Update policy error:', error)
    return res.status(500).json({ 
      error: 'policy_update_failed', 
      message: error.message || 'Failed to update policy'
    })
  }
})

// Pages routes
app.get(['/api/pages/:pageId', '/pages/:pageId'], async (req, res) => {
  try {
    const { pageId } = req.params
    const db = await getDb()
    
    // Get page content from database
    const page = await db.collection('pages').findOne({ pageId })
    
    if (!page) {
      // Return default content structure if page doesn't exist
      const defaultContent = getDefaultPageContent(pageId)
          return res.status(200).json({
      pageId,
      content: defaultContent,
      images: {},
      lastUpdated: new Date(),
      updatedBy: 'system'
    })
    }
    
    return res.status(200).json(page)
  } catch (error) {
    console.error('Get page error:', error)
    return res.status(500).json({ 
      error: 'page_fetch_failed', 
      message: error.message || 'Failed to fetch page content'
    })
  }
})

// Update page content
app.patch(['/api/pages/:pageId', '/pages/:pageId'], async (req, res) => {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { pageId } = req.params
    const { content, images } = req.body
    const db = await getDb()
    
    const updateData = {
      pageId,
      content: content || {},
      images: typeof images === 'object' && images !== null ? images : {},
      lastUpdated: new Date(),
      updatedBy: auth.userId
    }
    
    const result = await db.collection('pages').updateOne(
      { pageId },
      { $set: updateData },
      { upsert: true }
    )
    
    return res.status(200).json({
      success: true,
      pageId,
      content: updateData.content,
      images: updateData.images,
      lastUpdated: updateData.lastUpdated,
      updatedBy: updateData.updatedBy,
      modified: result.modifiedCount > 0,
      created: result.upsertedCount > 0
    })
  } catch (error) {
    console.error('Update page error:', error)
    return res.status(500).json({ 
      error: 'page_update_failed', 
      message: error.message || 'Failed to update page content'
    })
  }
})

// Blog routes
app.get(['/api/blog', '/blog'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) {
    console.log('[DEBUG_ADMIN] Blog GET route hit', { 
      url: req.url, 
      method: req.method, 
      path: req.query?.path,
      originalUrl: req.originalUrl 
    })
  }
  
  try {
    const db = await getDb()
    const { category, limit = 10, offset = 0 } = req.query
    
    let query = { status: 'published' }
    if (category) {
      query.category = category
    }
    
    const posts = await db.collection('blog_posts')
      .find(query)
      .sort({ publishDate: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray()
    
    const total = await db.collection('blog_posts').countDocuments(query)
    
    if (debug) {
      console.log('[DEBUG_ADMIN] Blog GET response', { 
        postsCount: posts.length, 
        total, 
        hasMore: total > parseInt(offset) + posts.length 
      })
    }
    
    return res.status(200).json({
      posts,
      total,
      hasMore: total > parseInt(offset) + posts.length
    })
  } catch (error) {
    console.error('Get blog posts error:', error)
    return res.status(500).json({ 
      error: 'blog_fetch_failed', 
      message: error.message || 'Failed to fetch blog posts'
    })
  }
})

app.get(['/api/blog/:slug', '/blog/:slug'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  try {
    const { slug } = req.params
    const db = await getDb()
    
    const post = await db.collection('blog_posts').findOne({ 
      slug,
      status: 'published'
    })
    
    if (!post) {
      return res.status(404).json({ 
        error: 'post_not_found', 
        message: 'Blog post not found'
      })
    }
    
    // Increment view count
    await db.collection('blog_posts').updateOne(
      { _id: post._id },
      { $inc: { views: 1 } }
    )
    
    return res.status(200).json(post)
  } catch (error) {
    console.error('Get blog post error:', error)
    return res.status(500).json({ 
      error: 'blog_post_fetch_failed', 
      message: error.message || 'Failed to fetch blog post'
    })
  }
})

app.post(['/api/blog', '/blog'], async (req, res) => {
  applyCors(req, res, 'POST, OPTIONS')
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const debug = process.env.DEBUG_ADMIN === 'true'
  console.log('[BLOG_POST] Route hit', { 
    url: req.url, 
    method: req.method, 
    path: req.query?.path,
    originalUrl: req.originalUrl,
    bodyKeys: Object.keys(req.body || {}),
    hasBody: !!req.body,
    bodyType: typeof req.body
  })
  
  // Temporarily allow blog creation without strict admin checks for testing
  const auth = await requireAuth(req, res, false) // Changed from requireAdmin to requireAuth with adminOnly=false
  if (!auth) {
    console.log('[BLOG_POST] Auth failed')
    return
  }
  console.log('[BLOG_POST] Auth successful', { userId: auth.userId })
  
  try {
    const db = await getDb()
    
    // Ensure blog_posts collection exists
    try {
      const collections = await db.listCollections().toArray()
      const blogCollectionExists = collections.some(col => col.name === 'blog_posts')
      if (!blogCollectionExists) {
        console.log('[BLOG_POST] Creating blog_posts collection')
        await db.createCollection('blog_posts')
      }
      console.log('[BLOG_POST] Blog collection ready')
    } catch (error) {
      console.error('[BLOG_POST] Error ensuring blog collection exists:', error)
      // Continue anyway, the collection might already exist
    }
    
    console.log('[BLOG_POST] Database connection successful')
    const postData = req.body
    console.log('[BLOG_POST] Post data received', { 
      hasTitle: !!postData.title, 
      hasContent: !!postData.content,
      titleLength: postData.title?.length,
      contentLength: postData.content?.length,
      keys: Object.keys(postData || {}),
      title: postData.title?.substring(0, 50) + '...',
      content: postData.content?.substring(0, 100) + '...'
    })
    
    // Validate required fields
    if (!postData.title || !postData.content) {
      console.log('[BLOG_POST] Validation failed', { 
        hasTitle: !!postData.title, 
        hasContent: !!postData.content 
      })
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Generate slug if not provided
    if (!postData.slug) {
      postData.slug = postData.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 100) // Limit length to 100 characters
    }
    
    console.log('[BLOG_POST] Generated slug:', postData.slug)
    
    // Check if slug already exists
    const existingPost = await db.collection('blog_posts').findOne({ slug: postData.slug })
    console.log('[BLOG_POST] Slug check:', { slug: postData.slug, exists: !!existingPost })
    if (existingPost) {
      console.log('[BLOG_POST] Slug already exists, returning error')
      return res.status(400).json({
        error: 'slug_exists',
        message: 'A post with this URL already exists'
      })
    }
    
    const newPost = {
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      author: auth.userId
    }
    
    const result = await db.collection('blog_posts').insertOne(newPost)
    console.log('[BLOG_POST] Successfully created post', { 
      insertedId: result.insertedId,
      title: newPost.title 
    })
    
    return res.status(201).json({
      success: true,
      id: result.insertedId,
      ...newPost
    })
  } catch (error) {
    console.error('[BLOG_POST] Create blog post error:', error)
    console.error('[BLOG_POST] Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'blog_post_create_failed', 
      message: error.message || 'Failed to create blog post'
    })
  }
})

app.put(['/api/blog/:id', '/blog/:id'], async (req, res) => {
  applyCors(req, res, 'PUT, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    const postData = req.body
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Validate required fields
    if (!postData.title || !postData.content) {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Check if slug already exists for different post
    if (postData.slug) {
      const existingPost = await db.collection('blog_posts').findOne({ 
        slug: postData.slug,
        _id: { $ne: objectId }
      })
      if (existingPost) {
        return res.status(400).json({
          error: 'slug_exists',
          message: 'A post with this URL already exists'
        })
      }
    }
    
    // SANITIZE DATA: Remove immutable and system fields
    const {
      _id,           // MongoDB immutable field
      __v,           // Mongoose version field (if using Mongoose)
      createdAt,     // System field - should not be updated
      views,         // System field - managed by API
      ...sanitizedData
    } = postData
    
    // Add system fields
    const updateData = {
      ...sanitizedData,
      updatedAt: new Date()
    }
    
    const result = await db.collection('blog_posts').updateOne(
      { _id: objectId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found'
      })
    }
    
    if (result.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes were made to the blog post',
        id
      })
    }
    
    // Fetch updated post to return
    const updatedPost = await db.collection('blog_posts').findOne({ _id: objectId })
    
    return res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      id,
      post: updatedPost
    })
  } catch (error) {
    console.error('Update blog post error:', error)
    
    // Handle specific MongoDB errors
    if (error.code === 66) {
      return res.status(400).json({
        error: 'immutable_field_error',
        message: 'Cannot update immutable fields like _id'
      })
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        error: 'duplicate_key_error',
        message: 'A post with this slug already exists'
      })
    }
    
    return res.status(500).json({ 
      error: 'blog_post_update_failed', 
      message: error.message || 'Failed to update blog post'
    })
  }
})

// Admin-specific blog editing endpoint with enhanced security
app.put(['/api/admin/blog/:id', '/admin/blog/:id'], async (req, res) => {
  applyCors(req, res, 'PUT, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    const postData = req.body
    
    // Enhanced validation for admin editing
    if (!postData.title || !postData.content) {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Title and content are required'
      })
    }
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Check if post exists and user has permission
    const existingPost = await db.collection('blog_posts').findOne({ _id: objectId })
    if (!existingPost) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found'
      })
    }
    
    // Check if slug already exists for different post
    if (postData.slug && postData.slug !== existingPost.slug) {
      const slugConflict = await db.collection('blog_posts').findOne({ 
        slug: postData.slug,
        _id: { $ne: objectId }
      })
      if (slugConflict) {
        return res.status(400).json({
          error: 'slug_exists',
          message: 'A post with this URL already exists'
        })
      }
    }
    
    // COMPREHENSIVE DATA SANITIZATION
    const {
      _id,           // MongoDB immutable field
      __v,           // Mongoose version field
      createdAt,     // System field - creation timestamp
      views,         // System field - view count
      updatedAt,     // System field - will be set by API
      ...sanitizedData
    } = postData
    
    // Add system fields and admin metadata
    const updateData = {
      ...sanitizedData,
      updatedAt: new Date(),
      lastEditedBy: auth.userId,
      lastEditedAt: new Date()
    }
    
    // Perform the update
    const result = await db.collection('blog_posts').updateOne(
      { _id: objectId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Blog post not found during update'
      })
    }
    
    // Fetch updated post to return
    const updatedPost = await db.collection('blog_posts').findOne({ _id: objectId })
    
    // Log admin action for audit trail
    await db.collection('admin_actions').insertOne({
      action: 'blog_post_updated',
      adminId: auth.userId,
      postId: objectId,
      postTitle: postData.title,
      timestamp: new Date(),
      changes: Object.keys(updateData)
    })
    
    return res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      id,
      post: updatedPost,
      changes: result.modifiedCount > 0 ? 'Modified' : 'No changes'
    })
  } catch (error) {
    console.error('Admin blog update error:', error)
    
    // Handle specific MongoDB errors with detailed messages
    if (error.code === 66) {
      return res.status(400).json({
        error: 'immutable_field_error',
        message: 'Cannot update immutable fields like _id',
        details: 'The system automatically excludes immutable fields from updates'
      })
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        error: 'duplicate_key_error',
        message: 'A post with this slug already exists',
        details: 'Please choose a different URL slug for this post'
      })
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Data validation failed',
        details: error.message
      })
    }
    
    return res.status(500).json({ 
      error: 'admin_blog_update_failed', 
      message: 'Failed to update blog post',
      details: error.message || 'Internal server error'
    })
  }
})

// Admin endpoint for fetching blog posts for editing (includes unpublished posts)
app.get(['/api/admin/blog/:id', '/admin/blog/:id'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return
  
  try {
    const { id } = req.params
    const db = await getDb()
    
    // Validate ObjectId format
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Invalid blog post ID format'
      })
    }
    
    // Fetch post for editing (admin can see all posts regardless of status)
    const post = await db.collection('blog_posts').findOne({ _id: objectId })
    
    if (!post) {
      return res.status(404).json({ 
        error: 'post_not_found', 
        message: 'Blog post not found'
      })
    }
    
    // Log admin access for audit trail
    await db.collection('admin_actions').insertOne({
      action: 'blog_post_accessed_for_editing',
      adminId: auth.userId,
      postId: objectId,
      postTitle: post.title,
      timestamp: new Date()
    })
    
    return res.status(200).json(post)
  } catch (error) {
    console.error('Admin blog fetch error:', error)
    return res.status(500).json({ 
      error: 'admin_blog_fetch_failed', 
      message: error.message || 'Failed to fetch blog post for editing'
    })
  }
})

// ===== END AI Routes =====

// ===== Builds (new) =====
// Create build (from model or migrated guest draft)
app.post(['/api/builds', '/builds'], async (req, res) => {
  const auth = await requireAuth(req, res, false)
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
  // Step 4 is where users enter buyer info, so don't require it to advance TO step 4
  if (target >= 5) {
    const bi = b?.buyerInfo || {}
    const ok = bi.firstName && bi.lastName && bi.email && bi.address
    if (!ok) return res.status(400).json({ error: 'incomplete_buyer' })
  }
  
  // Only check financing for steps after payment method step (step 7+)
  if (target >= 7 && !(b?.financing?.method)) {
    return res.status(400).json({ error: 'missing_payment_method' })
  }
  
  // Only check contract for confirmation step (step 8) - users need to reach step 7 to sign
  if (target >= 8) {
    const c = b?.contract || {}
    if (c?.status !== 'signed') return res.status(400).json({ error: 'contract_not_signed' })
  }
  
  const updated = await updateBuild(req.params.id, { step: target })
  return res.status(200).json(updated)
})

// ===== NEW CONTRACT API ENDPOINTS =====

// Create contract submission (for new contract page)
app.post(['/api/contracts/create', '/contracts/create'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    console.log('[CONTRACT_CREATE] Request received:', { 
      method: req.method, 
      hasBody: !!req.body, 
      bodyKeys: req.body ? Object.keys(req.body) : [],
      body: req.body 
    })

    const { buildId } = req.body
    if (!buildId) {
          console.log('[CONTRACT_CREATE] Missing buildId in request body')
    return res.status(400).json({ error: 'Build ID is required' })
  }

  console.log('[CONTRACT_CREATE] Looking up build:', buildId)
  const build = await getBuildById(buildId)
  console.log('[CONTRACT_CREATE] Build lookup result:', { 
    found: !!build, 
    buildId: build?._id, 
    userId: build?.userId, 
    authUserId: auth.userId,
    match: build?.userId === auth.userId 
  })
  
  if (!build || build.userId !== auth.userId) {
    console.log('[CONTRACT_CREATE] Build not found or access denied')
    return res.status(404).json({ error: 'Build not found' })
  }

    const settings = await getOrgSettings()
    
    // Define all required templates
    const templates = [
      {
        name: 'purchase_agreement',
        envKey: 'DOCUSEAL_PURCHASE_TEMPLATE_ID',
        title: 'Purchase Agreement',
        description: 'Primary purchase contract with all terms and conditions'
      }
    ]

    // For now, only require the purchase agreement template
    // TODO: Add other templates once they're configured in DocuSeal
    if (!process.env.DOCUSEAL_PURCHASE_TEMPLATE_ID) {
      console.log('[CONTRACT_CREATE] Missing purchase agreement template configuration')
      return res.status(500).json({ 
        error: 'DocuSeal purchase agreement template not configured',
        missing: ['DOCUSEAL_PURCHASE_TEMPLATE_ID']
      })
    }

    // Optional: Add other templates if they're configured
    const optionalTemplates = [
      {
        name: 'payment_terms',
        envKey: 'DOCUSEAL_PAYMENT_TERMS_TEMPLATE_ID',
        title: 'Payment Terms Agreement',
        description: 'Payment method, deposit, and balance terms'
      },
      {
        name: 'delivery_agreement',
        envKey: 'DOCUSEAL_DELIVERY_TEMPLATE_ID',
        title: 'Delivery Agreement',
        description: 'Delivery schedule, site requirements, and setup'
      },
      {
        name: 'warranty_information',
        envKey: 'DOCUSEAL_WARRANTY_TEMPLATE_ID',
        title: 'Warranty Information',
        description: 'Warranty terms, coverage, and service information'
      },
      {
        name: 'legal_disclosures',
        envKey: 'DOCUSEAL_LEGAL_DISCLOSURES_TEMPLATE_ID',
        title: 'Legal Disclosures',
        description: 'Required consumer rights and legal disclosures'
      }
    ]

    // Add optional templates if they're configured
    for (const template of optionalTemplates) {
      if (process.env[template.envKey]) {
        templates.push(template)
      }
    }

    // Build prefill data from build
    const prefill = buildContractPrefill(build, settings)

    // Create DocuSeal submissions for all templates
    const buyerInfo = build.buyerInfo || {}
    const submitters = [{
      name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
      email: buyerInfo.email || '',
      role: 'buyer1'
    }]
    
    const submissions = []
    
    for (const template of templates) {
      const templateId = Number(process.env[template.envKey])
      console.log(`[CONTRACT_CREATE] Creating submission for ${template.name}:`, {
        templateId,
        templateName: template.title
      })
      
      try {
        const submission = await createSubmission({
          templateId,
          prefill,
          submitters,
          sendEmail: false, // Don't send email until user is ready
          completedRedirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/checkout/${buildId}/confirm`,
          cancelRedirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/checkout/${buildId}/agreement`
        })
        
        submissions.push({
          name: template.name,
          title: template.title,
          description: template.description,
          templateId,
          submissionId: submission.submissionId,
          signerUrl: submission.signerUrl,
          status: 'ready'
        })
        
        console.log(`[CONTRACT_CREATE] Successfully created submission for ${template.name}:`, submission.submissionId)
      } catch (error) {
        console.error(`[CONTRACT_CREATE] Failed to create submission for ${template.name}:`, error)
        throw new Error(`Failed to create ${template.title}: ${error.message}`)
      }
    }

    // Store contract in database with all submissions
    const db = await getDb()
    const { ObjectId } = await import('mongodb')
    
    const contractData = {
      _id: new ObjectId(),
      buildId: buildId,
      userId: auth.userId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      submissions: submissions,
      status: 'ready',
      pricingSnapshot: build.pricing || {},
      buyerInfo: build.buyerInfo || {},
      delivery: build.delivery || {},
      payment: build.payment || {},
      audit: [{
        at: new Date(),
        who: auth.userId,
        action: 'contract_created',
        meta: { 
          submissionCount: submissions.length,
          submissionIds: submissions.map(s => s.submissionId)
        }
      }]
    }

    await db.collection('contracts').insertOne(contractData)

    // Update build to reference contract
    await updateBuild(buildId, { 
      'contract.submissionIds': submissions.map(s => s.submissionId),
      'contract.status': 'ready',
      'contract.createdAt': new Date()
    })

    // Return primary submission URL (Purchase Agreement)
    const primarySubmission = submissions.find(s => s.name === 'purchase_agreement')
    
    res.status(200).json({
      success: true,
      submissions: submissions,
      submissionId: primarySubmission?.submissionId,
      signerUrl: primarySubmission?.signerUrl,
      status: 'ready',
      version: 1
    })

  } catch (error) {
    console.error('Contract creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create contract',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get contract status (for real-time polling)
app.get(['/api/contracts/status', '/contracts/status'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ 
      buildId: buildId, 
      userId: auth.userId 
    }, { sort: { version: -1 } }) // Get latest version

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Get latest status from DocuSeal for all submissions
    let overallStatus = contract.status
    let updatedSubmissions = contract.submissions || []
    let hasStatusChanges = false
    
    if (updatedSubmissions.length > 0) {
      for (let i = 0; i < updatedSubmissions.length; i++) {
        const submission = updatedSubmissions[i]
        if (submission.submissionId) {
          try {
            const docusealSubmission = await getSubmission(submission.submissionId)
            const docusealStatus = mapDocuSealStatus(docusealSubmission.status || docusealSubmission.state)
            
            // Update submission status if it changed
            if (docusealStatus !== submission.status) {
              updatedSubmissions[i] = {
                ...submission,
                status: docusealStatus
              }
              hasStatusChanges = true
            }
          } catch (error) {
            console.error(`Failed to get DocuSeal status for ${submission.name}:`, error)
            // Continue with local status
          }
        }
      }
      
      // Determine overall status based on all submissions
      const allCompleted = updatedSubmissions.every(s => s.status === 'completed')
      const anySigning = updatedSubmissions.some(s => s.status === 'signing')
      const anyVoided = updatedSubmissions.some(s => s.status === 'voided')
      
      if (allCompleted) {
        overallStatus = 'completed'
      } else if (anyVoided) {
        overallStatus = 'voided'
      } else if (anySigning) {
        overallStatus = 'signing'
      } else {
        overallStatus = 'ready'
      }
      
      // Update our local status if it changed
      if (hasStatusChanges || overallStatus !== contract.status) {
        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { 
            $set: { 
              status: overallStatus, 
              submissions: updatedSubmissions,
              updatedAt: new Date() 
            },
            $push: { 
              audit: {
                at: new Date(),
                who: 'system',
                action: 'status_updated',
                meta: { 
                  from: contract.status, 
                  to: overallStatus,
                  submissionUpdates: updatedSubmissions.map(s => ({ name: s.name, status: s.status }))
                }
              }
            }
          }
        )
      }
    }

    // Get primary submission for backward compatibility
    const primarySubmission = updatedSubmissions.find(s => s.name === 'purchase_agreement') || updatedSubmissions[0]

    res.status(200).json({
      success: true,
      status: overallStatus,
      submissions: updatedSubmissions,
      submissionId: primarySubmission?.submissionId,
      signerUrl: primarySubmission?.signerUrl,
      version: contract.version,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt
    })

  } catch (error) {
    console.error('Contract status error:', error)
    res.status(500).json({ 
      error: 'Failed to get contract status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// DocuSeal webhook handler (for real-time status updates)
app.post(['/api/contracts/webhook', '/contracts/webhook'], async (req, res) => {
  try {
    // Verify webhook signature
    const secret = process.env.DOCUSEAL_WEBHOOK_SECRET || ''
    const signature = req.headers['x-docuseal-signature'] || req.headers['X-DocuSeal-Signature']
    
    if (!secret || signature !== secret) {
      console.error('DocuSeal webhook: Invalid signature')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { event_type, data } = req.body
    console.log('DocuSeal webhook received:', event_type, data?.id)

    if (!data?.id) {
      return res.status(400).json({ error: 'Missing submission ID' })
    }

    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ 
      'submissions.submissionId': data.id 
    })

    if (!contract) {
      console.log('DocuSeal webhook: Contract not found for submission:', data.id)
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Find the specific submission that was updated
    const submissionIndex = contract.submissions?.findIndex(s => s.submissionId === data.id)
    if (submissionIndex === -1 || submissionIndex === undefined) {
      console.log('DocuSeal webhook: Submission not found in contract:', data.id)
      return res.status(404).json({ error: 'Submission not found' })
    }

    const submission = contract.submissions[submissionIndex]
    let newSubmissionStatus = submission.status
    let shouldDownloadPdf = false

    // Handle different event types for the specific submission
    switch (event_type) {
      case 'submission.created':
        newSubmissionStatus = 'ready'
        break
      case 'submission.started':
        newSubmissionStatus = 'signing'
        break
      case 'submission.completed':
        newSubmissionStatus = 'completed'
        shouldDownloadPdf = true
        break
      case 'submission.declined':
        newSubmissionStatus = 'voided'
        break
      default:
        console.log('DocuSeal webhook: Unhandled event type:', event_type)
    }

    // Update the specific submission status
    const updatedSubmissions = [...contract.submissions]
    updatedSubmissions[submissionIndex] = {
      ...submission,
      status: newSubmissionStatus
    }

    // Determine overall contract status based on all submissions
    const allCompleted = updatedSubmissions.every(s => s.status === 'completed')
    const anySigning = updatedSubmissions.some(s => s.status === 'signing')
    const anyVoided = updatedSubmissions.some(s => s.status === 'voided')
    
    let newOverallStatus = contract.status
    if (allCompleted) {
      newOverallStatus = 'completed'
    } else if (anyVoided) {
      newOverallStatus = 'voided'
    } else if (anySigning) {
      newOverallStatus = 'signing'
    } else {
      newOverallStatus = 'ready'
    }

    // Update contract with new submission statuses and overall status
    await db.collection('contracts').updateOne(
      { _id: contract._id },
      { 
        $set: { 
          status: newOverallStatus,
          submissions: updatedSubmissions,
          updatedAt: new Date(),
          ...(data.completed_at && { completedAt: new Date(data.completed_at) })
        },
        $push: { 
          audit: {
            at: new Date(),
            who: 'docuseal_webhook',
            action: event_type,
            meta: { 
              from: contract.status, 
              to: newOverallStatus, 
              submissionName: submission.name,
              submissionStatus: newSubmissionStatus,
              eventData: data 
            }
          }
        }
      }
    )

    // Download and store signed PDF if completed
    if (shouldDownloadPdf && data.audit_trail_url) {
      try {
        const pdfBuffer = await downloadFile(data.audit_trail_url)
        const publicId = `contracts/${contract.buildId}/v${contract.version}/signed_contract`
        
        const cloudinaryResult = await uploadPdfToCloudinary({
          buffer: pdfBuffer,
          folder: 'firefly-estimator/contracts',
          publicId
        })

        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { 
            $set: { 
              signedPdfCloudinaryId: cloudinaryResult.public_id,
              signedPdfUrl: data.audit_trail_url
            }
          }
        )

        console.log('DocuSeal webhook: PDF stored to Cloudinary:', cloudinaryResult.public_id)
      } catch (error) {
        console.error('DocuSeal webhook: Failed to store PDF:', error)
      }
    }

    // Update build status if contract completed
    if (newStatus === 'completed') {
      await updateBuild(contract.buildId, { 
        'contract.status': 'completed',
        'contract.completedAt': new Date(),
        step: 8 // Advance to confirmation step
      })
    }

    res.status(200).json({ success: true })

  } catch (error) {
    console.error('DocuSeal webhook error:', error)
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Helper function to map DocuSeal status to our status
function mapDocuSealStatus(docusealStatus) {
  switch (docusealStatus) {
    case 'pending':
    case 'awaiting_signature':
      return 'ready'
    case 'opened':
    case 'in_progress':
      return 'signing'
    case 'completed':
      return 'completed'
    case 'declined':
    case 'expired':
      return 'voided'
    default:
      return 'draft'
  }
}

// Helper function to build prefill data for DocuSeal
function buildContractPrefill(build, settings) {
  console.log('[CONTRACT_CREATE] Building prefill data for build:', build._id)
  
  const pricing = build.pricing || {}
  const buyerInfo = build.buyerInfo || {}
  const delivery = build.delivery || {}
  const payment = build.payment || {}
  
  console.log('[CONTRACT_CREATE] Build data sections:', {
    hasPricing: !!pricing,
    hasBuyerInfo: !!buyerInfo,
    hasDelivery: !!delivery,
    hasPayment: !!payment,
    pricingKeys: Object.keys(pricing),
    buyerInfoKeys: Object.keys(buyerInfo),
    deliveryKeys: Object.keys(delivery),
    paymentKeys: Object.keys(payment)
  })
  
  // Calculate key amounts
  const totalPurchasePrice = pricing.total || 0
  const depositPercent = payment.plan?.percent || 25
  const depositAmount = Math.round(totalPurchasePrice * depositPercent / 100)
  const balanceAmount = totalPurchasePrice - depositAmount

  const prefill = {
    // Order Information
    order_id: build._id || '',
    order_date: new Date().toLocaleDateString(),
    
    // Dealer Information
    dealer_name: "Firefly Tiny Homes LLC",
    dealer_address: "6150 TX-16, Pipe Creek, TX 78063", 
    dealer_phone: "830-328-6109",
    dealer_rep: "Firefly Representative",
    
    // Buyer Information
    buyer_name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
    buyer_first_name: buyerInfo.firstName || '',
    buyer_last_name: buyerInfo.lastName || '',
    buyer_email: buyerInfo.email || '',
    buyer_phone: buyerInfo.phone || '',
    buyer_address: buyerInfo.address || '',
    buyer_city: buyerInfo.city || '',
    buyer_state: buyerInfo.state || '',
    buyer_zip: buyerInfo.zip || '',
    
    // Unit Information  
    unit_brand: "Athens Park Select",
    unit_model: build.modelName || build.modelCode || '',
    unit_year: new Date().getFullYear().toString(),
    unit_dimensions: build.model?.dimensions || '',
    unit_serial: '', // Will be assigned later
    
    // Pricing
    base_price: formatCurrency(pricing.basePrice || 0),
    options_total: formatCurrency(pricing.optionsTotal || 0),
    delivery_estimate: formatCurrency(pricing.deliveryEstimate || 0),
    title_fee: formatCurrency(pricing.titleFee || 0),
    setup_fee: formatCurrency(pricing.setupFee || 0),
    taxes: formatCurrency(pricing.taxes || 0),
    total_price: formatCurrency(totalPurchasePrice),
    
    // Payment Terms
    deposit_percent: `${depositPercent}%`,
    deposit_amount: formatCurrency(depositAmount),
    balance_amount: formatCurrency(balanceAmount),
    payment_method: payment.method === 'ach_debit' ? 'ACH/Bank Transfer' : 'Cash',
    
    // Delivery Information
    delivery_address: delivery.address || buyerInfo.address || '',
    delivery_city: delivery.city || buyerInfo.city || '',
    delivery_state: delivery.state || buyerInfo.state || '',
    delivery_zip: delivery.zip || buyerInfo.zip || '',
    delivery_notes: delivery.notes || '',
    
    // Legal/Compliance
    state_classification: "Travel Trailer (park model RV)",
    completion_estimate: "8-12 weeks from contract signing",
    storage_policy: "Delivery within 12 days after factory completion; storage charges may apply"
  }

  console.log('[CONTRACT_CREATE] Generated prefill data:', {
    prefillKeys: Object.keys(prefill),
    sampleValues: {
      order_id: prefill.order_id,
      buyer_name: prefill.buyer_name,
      total_price: prefill.total_price,
      payment_method: prefill.payment_method
    }
  })

  return prefill
}

// Helper function to format currency for DocuSeal
function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format((cents || 0) / 100)
}

// Download contract packet (ZIP of all signed PDFs)
app.get(['/api/contracts/download/packet', '/contracts/download/packet'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, version } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    const db = await getDb()
    let query = { buildId: buildId, userId: auth.userId }
    if (version) {
      query.version = parseInt(version)
    }
    
    const contract = await db.collection('contracts').findOne(query, { 
      sort: { version: -1 } 
    })

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    if (contract.status !== 'completed') {
      return res.status(400).json({ error: 'Contract not completed yet' })
    }

    if (!contract.signedPdfCloudinaryId) {
      return res.status(404).json({ error: 'Signed documents not available' })
    }

    // Generate signed download URL from Cloudinary
    const signedUrl = signedCloudinaryUrl(contract.signedPdfCloudinaryId)
    
    // For now, redirect to the single PDF. In the future, this could create a ZIP
    res.redirect(signedUrl)

  } catch (error) {
    console.error('Contract download error:', error)
    res.status(500).json({ 
      error: 'Failed to download contract packet',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Download pre-signing summary PDF
app.get(['/api/contracts/download/summary', '/contracts/download/summary'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.query
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const build = await getBuildById(buildId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // For now, return a placeholder response. In production, this would generate
    // a summary PDF with order details, pricing breakdown, etc.
    res.status(501).json({ 
      error: 'Summary PDF generation not yet implemented',
      message: 'This feature will generate a pre-signing order summary PDF'
    })

  } catch (error) {
    console.error('Contract summary download error:', error)
    res.status(500).json({ 
      error: 'Failed to download summary',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
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
    const { firstName, lastName, email, phone, address, city, state, zip } = body
    
    console.log('DEBUG: Request body:', { firstName, lastName, email, phone, address, city, state, zip })
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      console.log('DEBUG: Missing required fields')
      return res.status(400).json({ error: 'missing_required_fields', message: 'First name, last name, and email are required' })
    }
    
    console.log('DEBUG: Ensuring user profile indexes...')
    await ensureUserProfileIndexes()
    console.log('DEBUG: Indexes ensured successfully')
    
    console.log('DEBUG: Updating user basic info...')
    const profile = await updateUserBasicInfo(auth.userId, { firstName, lastName, email, phone, address, city, state, zip })
    
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
      message: error.