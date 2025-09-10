import express from 'express'
import Stripe from 'stripe'
import { createHash } from 'node:crypto'
import { ObjectId } from 'mongodb'

import { getDb } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { applyCors } from '../lib/cors.js'
import { findModelById, ensureModelIndexes, findOrCreateModel, COLLECTION, isModelCode, isSlug } from '../lib/model-utils.js'
import { initializeAdminDatabase } from '../lib/adminSchema.js'
import { ensureOrderIndexes, createOrderDraft, getOrderById, updateOrder, listOrdersForUser, listOrdersAdmin, ORDERS_COLLECTION, setOrderPricingSnapshot, setOrderDelivery } from '../lib/orders.js'
import { ensureBuildIndexes, createBuild, getBuildById, listBuildsForUser, updateBuild, duplicateBuild, deleteBuild, renameBuild } from '../lib/builds.js'
// ensure mongodb import is only used where needed to avoid bundling issues
import { ensureIdempotencyIndexes, withIdempotency } from '../lib/idempotency.js'
import { quoteDelivery } from '../lib/delivery.js'
import { getOrgSettings, updateOrgSettings } from '../lib/settings.js'
import { getDeliveryQuote, roundToCents } from '../lib/delivery-quote.js'
import { getTemplate, createSubmission, downloadFile, uploadPdfToCloudinary, signedCloudinaryUrl } from '../lib/docuseal.js'
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
import { isAdmin as isAdminServer } from '../lib/canEditModels.js'
import { validateRequest } from '../lib/requestValidation.js'
// import { Webhook } from 'svix' // Temporarily disabled - causing deployment crashes

const app = express()

// Export runtime for Vercel
export const runtime = 'nodejs'

// Security headers and middleware
app.disable('x-powered-by')

// Stripe webhook must receive the raw body for signature verification.
// Register this BEFORE express.json() so req.body is a Buffer here.
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature']
    if (!sig || !stripeWebhookSecret) {
      return res.status(400).send('Missing webhook signature or secret not configured')
    }
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret)
    } catch (err) {
      console.error('Stripe webhook verification failed:', err?.message || err)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Dispatch handling based on event type
    const type = event.type
    const id = event.id
    console.log('Stripe webhook received:', { type, id })

    const db = await getDb()

    // Helpers
    const updateOrderPaymentStatus = async (orderId, fields) => {
      try {
        const _id = new ObjectId(String(orderId))
        await db.collection('orders').updateOne({ _id }, { $set: fields })
        console.log('Updated order payment status', { orderId, fields })
      } catch (e) {
        console.error('Failed to update order payment status', { orderId, error: e?.message })
      }
    }

    try {
      switch (type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object
          const orderId = pi?.metadata?.orderId
          if (orderId) {
            await updateOrderPaymentStatus(orderId, {
              'payment.status': 'succeeded',
              'payment.paymentIntentId': pi.id,
              'payment.processedAt': new Date()
            })
          }
          break
        }
        case 'payment_intent.payment_failed': {
          const pi = event.data.object
          const orderId = pi?.metadata?.orderId
          if (orderId) {
            await updateOrderPaymentStatus(orderId, {
              'payment.status': 'failed',
              'payment.paymentIntentId': pi.id,
              'payment.lastError': pi?.last_payment_error?.message || 'Payment failed',
              'payment.failedAt': new Date()
            })
          }
          break
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object
          const { buildId, milestone, intentId } = invoice?.metadata || {}
          if (buildId && intentId) {
            // Mark bank transfer intent paid (or generic intent)
            try {
              await db.collection('bankTransferIntents').updateOne(
                { _id: new ObjectId(String(intentId)) },
                { $set: {
                  status: 'paid',
                  stripeInvoiceId: invoice.id,
                  paidAmount: invoice.amount_paid,
                  paidAt: new Date(),
                  updatedAt: new Date()
                } }
              )
            } catch (e) {
              console.warn('invoice.payment_succeeded: failed to update bankTransferIntent', e?.message)
            }

            // Update build payment flags
            const updateFields = {
              'payment.lastPaymentAt': new Date(),
              'payment.updatedAt': new Date()
            }
            if (milestone === 'deposit') {
              updateFields['payment.depositPaid'] = true
              updateFields['payment.depositPaidAt'] = new Date()
            } else if (milestone === 'final') {
              updateFields['payment.finalPaid'] = true
              updateFields['payment.finalPaidAt'] = new Date()
            } else if (milestone === 'full') {
              updateFields['payment.fullPaid'] = true
              updateFields['payment.fullPaidAt'] = new Date()
            }
            await db.collection('builds').updateOne(
              { _id: new ObjectId(String(buildId)) },
              { $set: updateFields }
            )

            // If plan completed, mark fully paid
            const build = await db.collection('builds').findOne({ _id: new ObjectId(String(buildId)) })
            if (build?.payment) {
              const planType = build.payment.plan?.type
              let allPaid = false
              if (planType === 'deposit') allPaid = build.payment.depositPaid && build.payment.finalPaid
              if (planType === 'full') allPaid = build.payment.fullPaid
              if (allPaid) {
                await db.collection('builds').updateOne(
                  { _id: new ObjectId(String(buildId)) },
                  { $set: { 'payment.status': 'fully_paid', 'payment.fullyPaidAt': new Date() } }
                )
              }
            }
          }
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object
          const { buildId, intentId } = invoice?.metadata || {}
          if (buildId && intentId) {
            try {
              await db.collection('bankTransferIntents').updateOne(
                { _id: new ObjectId(String(intentId)) },
                { $set: {
                  status: 'payment_failed',
                  stripeInvoiceId: invoice.id,
                  lastError: 'Payment failed',
                  failedAt: new Date(),
                  updatedAt: new Date()
                } }
              )
            } catch (e) {
              console.warn('invoice.payment_failed: failed to update bankTransferIntent', e?.message)
            }
          }
          break
        }
        case 'treasury.inbound_transfer.succeeded': {
          const transfer = event.data.object
          // Match by virtual account ID stored with order
          const order = await db.collection('orders').findOne({ 'payment.bankTransfer.virtualAccountId': transfer.financial_account })
          if (order) {
            await db.collection('orders').updateOne(
              { _id: order._id },
              { $set: { 'payment.status': 'succeeded', 'payment.transferId': transfer.id, 'payment.processedAt': new Date() } }
            )
          }
          break
        }
        case 'treasury.inbound_transfer.failed': {
          const transfer = event.data.object
          const order = await db.collection('orders').findOne({ 'payment.bankTransfer.virtualAccountId': transfer.financial_account })
          if (order) {
            await db.collection('orders').updateOne(
              { _id: order._id },
              { $set: { 'payment.status': 'failed', 'payment.transferId': transfer.id, 'payment.failedAt': new Date() } }
            )
          }
          break
        }
        default: {
          // Unhandled types are acknowledged
          console.log('Unhandled Stripe event type:', type)
        }
      }
    } catch (handleErr) {
      console.error('Stripe webhook handler error:', handleErr)
      return res.status(500).json({ error: 'Webhook handler failed' })
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Stripe webhook route error:', error)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// JSON body parser comes after webhook to preserve raw body for that route
app.use(express.json({ limit: '2mb' }))

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

// Simple admin status endpoint for client-side checks
app.get(['/api/admin/is-admin', '/admin/is-admin'], async (req, res) => {
  try {
    // Authenticate user, do not enforce admin; compute admin explicitly
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return
    const admin = await isAdminServer(auth.userId)
    res.json({ isAdmin: !!admin, userId: auth.userId })
  } catch (error) {
    console.error('is-admin error:', error)
    res.status(500).json({ error: 'internal_error' })
  }
})

// Admin-only configuration status (no secrets)
app.get(['/api/admin/config-status', '/admin/config-status'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, true)
    if (!auth?.userId) return
    const aiConfigured = !!process.env.AI_API_KEY
    const stripeMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_') ? 'live' : 'test'
    const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET
    const redisEnabled = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    res.json({
      ai: { configured: aiConfigured, model: process.env.AI_MODEL || null, apiUrl: process.env.AI_API_URL ? 'custom' : 'default' },
      stripe: { mode: stripeMode, webhookConfigured },
      rateLimiter: { mode: redisEnabled ? 'redis' : 'memory' }
    })
  } catch (error) {
    console.error('config-status error:', error)
    res.status(500).json({ error: 'internal_error' })
  }
})

// Apply rate limiting to all routes, except high-volume public model GETs
app.use('/api/', (req, res, next) => {
  try {
    const p = req.path || ''
    const qPath = (req.query && (req.query.path || req.query.p)) || ''
    const target = typeof qPath === 'string' && qPath ? qPath : p
    if (req.method === 'GET' && (target === '/models' || target.startsWith('/models/'))) {
      return next()
    }
  } catch {}
  return apiRateLimiter(req, res, next)
})
app.use('/api/auth/', authRateLimiter)

// ===== AI Content Generation Routes =====

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

// Health check endpoint for monitoring database connectivity
app.get('/health', async (req, res) => {
  try {
    const { healthCheck } = await import('../lib/db.js')
    const dbHealthy = await healthCheck()
    
    const health = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    res.status(dbHealthy ? 200 : 503).json(health)
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error.message,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'unknown'
    })
  }
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

    const { topic, template, sections = [], type = 'full', excerpt, sources, includeResearch, seoOptimization } = req.body

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' })
    }

    // Ensure sections is an array for compatibility
    const safeSections = Array.isArray(sections) ? sections : []

    // Check if API key is configured
    const apiKey = process.env.AI_API_KEY
    const apiUrl = process.env.AI_API_URL || 'https://api.anthropic.com/v1'
    const model = process.env.AI_MODEL || 'claude-sonnet-4-20250514'

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

Required sections: ${safeSections.length > 0 ? safeSections.join(', ') : 'Standard blog post structure with introduction, main content, and conclusion'}

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
      const errorText = await response.text()
      console.error('[DEBUG_ADMIN] AI API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
        requestHeaders: {
          'x-api-key': apiKey ? `${apiKey.slice(0, 10)}...` : 'MISSING',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      })
      throw new Error(`AI API error: ${response.status} - ${errorText}`)
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

// Debug endpoint to check blog posts in database - BEFORE normalization middleware
app.get(['/api/debug/blog-posts', '/debug/blog-posts'], async (req, res) => {
  try {
    const db = await getDb()
    const allPosts = await db.collection('blog_posts').find({}).toArray()
    const publishedPosts = await db.collection('blog_posts').find({ status: 'published' }).toArray()
    const draftPosts = await db.collection('blog_posts').find({ status: 'draft' }).toArray()
    
    return res.json({
      timestamp: new Date().toISOString(),
      totalPosts: allPosts.length,
      publishedPosts: publishedPosts.length,
      draftPosts: draftPosts.length,
      allPostsInfo: allPosts.map(p => ({
        id: p._id,
        title: p.title,
        status: p.status,
        slug: p.slug,
        createdAt: p.createdAt
      })),
      apiQueryResult: `Query { status: 'published' } returns ${publishedPosts.length} posts`,
      latestPost: allPosts.length > 0 ? {
        id: allPosts[allPosts.length - 1]._id,
        title: allPosts[allPosts.length - 1].title,
        status: allPosts[allPosts.length - 1].status,
        createdAt: allPosts[allPosts.length - 1].createdAt
      } : null
    })
  } catch (error) {
    console.error('Debug blog posts error:', error)
    return res.status(500).json({ 
      error: 'debug_failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Debug endpoint to test AI endpoints specifically - BEFORE normalization middleware
app.get(['/api/debug/ai-test', '/debug/ai-test'], (req, res) => {
  try {
    const aiEndpointTests = []
    
    // Test if endpoints are reachable
    const testPaths = [
      '/ai/generate-content',
      '/ai/generate-topics'
    ]
    
    testPaths.forEach(path => {
      try {
        // Try to match against Express router
        const matchFound = app._router.stack.some(layer => {
          if (layer.route && layer.route.path === path) {
            return true
          }
          return false
        })
        
        aiEndpointTests.push({
          path: path,
          registered: matchFound,
          methods: matchFound ? ['POST', 'OPTIONS'] : ['NONE']
        })
      } catch (error) {
        aiEndpointTests.push({
          path: path,
          registered: false,
          error: error.message
        })
      }
    })
    
    return res.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      aiApiKey: process.env.AI_API_KEY ? `${process.env.AI_API_KEY.slice(0, 10)}...` : 'MISSING',
      endpointTests: aiEndpointTests,
      requestDetails: {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        path: req.path
      },
      deploymentTest: 'SUCCESS - This debug endpoint works, confirming code deployment',
      middlewarePosition: 'BEFORE URL normalization - should work correctly'
    })
  } catch (error) {
    console.error('Debug AI endpoints error:', error)
    return res.status(500).json({ 
      error: 'debug_failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// WORKING AI Topic Generation Endpoint - Copy exact pattern from generate-content
app.options('/ai/generate-topics', (req, res) => {
  applyCors(req, res, 'POST, OPTIONS')
  res.status(200).end()
})

app.post('/ai/generate-topics', async (req, res) => {
  try {
    // Apply CORS headers for this endpoint
    applyCors(req, res, 'POST, OPTIONS')

    const debug = process.env.DEBUG_ADMIN === 'true'
    if (debug) {
      console.log('[DEBUG_ADMIN] AI topic generation endpoint hit:', {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl
      })
    }
    
    console.log('[DEBUG_ADMIN] AI topic generation request:', req.body)
    
    const { sources = [], count = 6, industry = 'park-model-homes', location = 'Texas', avoidDuplicates = true, seoOptimized = true } = req.body

    // Ensure sources is an array
    const safeSources = Array.isArray(sources) ? sources : []
    if (safeSources.length === 0) {
      safeSources.push('fireflytinyhomes.com', 'athens-park-models', 'champion-park-models', 'modern-park-models')
    }
    
    // Get existing blog posts to avoid duplicates
    let existingTopics = []
    if (avoidDuplicates) {
      try {
        const db = await getDb()
        const blogPosts = await db.collection('blog_posts').find({}, { title: 1 }).toArray()
        existingTopics = blogPosts.map(post => post.title.toLowerCase())
        console.log('[DEBUG_ADMIN] Found existing topics:', existingTopics.length)
      } catch (dbError) {
        console.warn('[DEBUG_ADMIN] Could not fetch existing topics:', dbError.message)
      }
    }

    // Create comprehensive prompt for topic generation
    const prompt = `You are an expert content strategist for ${industry} industry in ${location}. 

TASK: Generate ${count} fresh, SEO-optimized blog post topics that will rank well and drive conversions.

RESEARCH SOURCES TO CONSIDER:
${safeSources.map(source => `- ${source}`).join('\n')}

EXISTING TOPICS TO AVOID:
${existingTopics.length > 0 ? existingTopics.map(topic => `- ${topic}`).join('\n') : '- None found'}

REQUIREMENTS:
1. Topics must be unique and not duplicate existing content
2. Focus on ${industry} specifically in ${location}
3. Include SEO-friendly keywords naturally
4. Target different stages of the customer journey
5. Mix of educational, inspirational, and problem-solving content
6. Each topic should have conversion potential

FORMAT: Return a JSON array with exactly ${count} topics, each containing:
{
  "title": "Compelling blog post title",
  "description": "Brief description of what the post would cover",
  "seoScore": 85,
  "competition": "low|medium|high",
  "targetKeywords": ["keyword1", "keyword2"],
  "customerJourneyStage": "awareness|consideration|decision"
}

Generate topics that would perform well against competitors like Athens Park Models, Champion Park Models, and Modern Park Models.`

    console.log('[DEBUG_ADMIN] Sending prompt to AI (first 500 chars):', prompt.substring(0, 500) + '...')

    // Call AI service
    const apiKey = process.env.AI_API_KEY
    const apiUrl = process.env.AI_API_URL || 'https://api.anthropic.com/v1'
    const model = process.env.AI_MODEL || 'claude-sonnet-4-20250514'

    if (!apiKey) {
      throw new Error('AI API key not configured')
    }

    const response = await fetch(`${apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[DEBUG_ADMIN] AI Topic Generation Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`AI API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    const content = result.content?.[0]?.text || ''
    
    console.log('[DEBUG_ADMIN] Raw AI response:', content)

    // Parse JSON response
    let topics = []
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON array found in response')
      }
    } catch (parseError) {
      console.error('[DEBUG_ADMIN] Failed to parse AI response:', parseError)
      
      // Fallback to manual parsing or default topics
      topics = [
        {
          title: "Why Texas Park Model Homes Are Perfect for Year-Round Living",
          description: "Explore the benefits of park model living in Texas climate",
          seoScore: 85,
          competition: "low",
          targetKeywords: ["texas park models", "year round living"],
          customerJourneyStage: "awareness"
        },
        {
          title: "Park Model vs Traditional Home: Complete Cost Comparison",
          description: "Compare total costs, maintenance, and value over time",
          seoScore: 92,
          competition: "medium",
          targetKeywords: ["park model cost", "home comparison"],
          customerJourneyStage: "consideration"
        },
        {
          title: "Inside Look: Modern Park Model Interior Design Trends 2024",
          description: "Latest design trends making park models feel like luxury homes",
          seoScore: 88,
          competition: "low",
          targetKeywords: ["park model interior", "design trends"],
          customerJourneyStage: "consideration"
        },
        {
          title: "Park Model Communities in Texas: Your Complete Guide",
          description: "Find the best park model communities across Texas",
          seoScore: 90,
          competition: "medium",
          targetKeywords: ["texas park model communities", "rv parks"],
          customerJourneyStage: "decision"
        },
        {
          title: "Financing Your Park Model Home: Options and Strategies",
          description: "Complete guide to park model financing and loan options",
          seoScore: 86,
          competition: "low",
          targetKeywords: ["park model financing", "tiny home loans"],
          customerJourneyStage: "decision"
        },
        {
          title: "Park Model Maintenance: Seasonal Care Guide for Texas Owners",
          description: "Keep your park model in perfect condition year-round",
          seoScore: 84,
          competition: "low",
          targetKeywords: ["park model maintenance", "texas weather"],
          customerJourneyStage: "awareness"
        }
      ]
    }

    // Ensure we have the right number of topics
    if (topics.length > count) {
      topics = topics.slice(0, count)
    }

    console.log('[DEBUG_ADMIN] Generated topics:', topics)

    res.json({
      success: true,
      topics,
      existingTopicsChecked: existingTopics.length,
      message: `Generated ${topics.length} unique topics based on competitor research`
    })

  } catch (error) {
    console.error('[DEBUG_ADMIN] AI topic generation failed:', error)
    res.status(500).json({ 
      error: 'Topic generation failed', 
      details: error.message,
      fallbackAvailable: true
    })
  }
})

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
  console.log('[DEBUG_ADMIN] Path middleware:', { originalUrl: req.originalUrl, path: p, newUrl: req.url })
  if (p) {
    req.url = String(p).startsWith('/') ? String(p) : `/${String(p)}`
    console.log('[DEBUG_ADMIN] Rewrote URL to:', req.url)
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
    // Cache model details at the CDN to avoid function invocations
    // Cache for 10 minutes at the edge, allow 1 day stale-while-revalidate
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
    return res.status(200).json(normalized)
  } catch (err) {
    if (debug) console.error('[DEBUG_ADMIN] models GET error', err?.message || err)
    return res.status(500).json({ error: 'server_error' })
  }
})

// ----- GET models batch -----
// Example: /api/models/batch?ids=aps-630,aps-601,apx-150
app.get(['/api/models/batch', '/models/batch'], async (req, res) => {
  const debug = process.env.DEBUG_ADMIN === 'true'
  try {
    const raw = (req.query?.ids || req.query?.codes || req.query?.slugs || '')
    const ids = String(raw)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    if (!ids.length) return res.status(400).json({ error: 'missing_ids' })

    await ensureModelIndexes()

    // Partition into modelCodes and slugs for efficient querying
    const codes = ids.filter(isModelCode).map(s => s.toUpperCase())
    const slugs = ids.filter(id => !isModelCode(id) && isSlug(id)).map(s => s.toLowerCase())

    const db = await getDb()
    const collection = db.collection(COLLECTION)

    const or = []
    if (codes.length) or.push({ modelCode: { $in: codes } })
    if (slugs.length) or.push({ slug: { $in: slugs } })

    let docs = []
    if (or.length) {
      docs = await collection.find({ $or: or }).toArray()
    }

    // Build a quick lookup map
    const byCode = new Map(docs.map(d => [String(d.modelCode || '').toUpperCase(), d]))
    const bySlug = new Map(docs.map(d => [String(d.slug || '').toLowerCase(), d]))

    // Preserve order of requested ids; fall back to individual lookup when not found
    const results = []
    for (const id of ids) {
      let doc = null
      if (isModelCode(id)) {
        doc = byCode.get(id.toUpperCase()) || null
      } else if (isSlug(id)) {
        doc = bySlug.get(id.toLowerCase()) || null
      }
      if (!doc) {
        // Last-chance: use existing resolver which handles various fallbacks
        // Avoid blocking the whole request if one fails
        try {
          doc = await findModelById(id)
        } catch {}
      }
      if (doc) {
        results.push({
          ...doc,
          features: Array.isArray(doc.features) ? doc.features : [],
          images: Array.isArray(doc.images) ? doc.images : [],
        })
      } else {
        results.push(null)
      }
    }

    // Cache batched response at the CDN to minimize function invocations
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
    return res.status(200).json({ models: results })
  } catch (err) {
    if (debug) console.error('[DEBUG_ADMIN] models batch error', err?.message || err)
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

// Debug endpoint to verify all registered routes
app.get(['/api/debug/routes', '/debug/routes'], (req, res) => {
  try {
    const routes = []
    
    // Extract routes from Express app
    function extractRoutes(stack, basePath = '') {
      stack.forEach((layer) => {
        if (layer.route) {
          // Regular route
          const methods = Object.keys(layer.route.methods)
          routes.push({
            path: basePath + layer.route.path,
            methods: methods,
            type: 'route'
          })
        } else if (layer.name === 'router') {
          // Router middleware
          const routerPath = layer.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace('^', '')
            .replace('$', '')
          extractRoutes(layer.handle.stack, basePath + routerPath)
        } else if (layer.regexp && layer.regexp.source) {
          // Other middleware
          routes.push({
            path: layer.regexp.source,
            name: layer.name,
            type: 'middleware'
          })
        }
      })
    }
    
    extractRoutes(app._router.stack)
    
    // Filter for AI routes specifically
    const aiRoutes = routes.filter(route => 
      route.path && (
        route.path.includes('/ai/') || 
        route.path.includes('generate-') ||
        route.type === 'route'
      )
    )
    
    return res.json({
      timestamp: new Date().toISOString(),
      totalRoutes: routes.length,
      aiRoutesFound: aiRoutes.length,
      aiRoutes: aiRoutes,
      searchedFor: ['/ai/generate-topics', '/ai/generate-content'],
      allRoutes: routes.filter(r => r.type === 'route').slice(0, 20) // First 20 routes
    })
  } catch (error) {
    console.error('Debug routes error:', error)
    return res.status(500).json({ 
      error: 'debug_failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    })
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

// ===== FIREFLY CONTRACT API ENDPOINTS =====
import DocuSealClient from '../lib/docuseal-client.js'

// Helper function to map build data to Order interface
function buildToOrder(build) {
  const buyerInfo = build.buyerInfo || {}
  const pricing = build.pricing || {}
  const selections = build.selections || {}
  
  return {
    id: build._id,
    version: 1,
    buyer: {
      firstName: buyerInfo.firstName || '',
      lastName: buyerInfo.lastName || '',
      email: buyerInfo.email || '',
      phone: buyerInfo.phone || '',
      mailing: buyerInfo.address ? {
        line1: buyerInfo.address,
        city: buyerInfo.city || '',
        state: buyerInfo.state || '',
        zip: buyerInfo.zip || ''
      } : undefined
    },
    coBuyer: buyerInfo.coBuyer ? {
      firstName: buyerInfo.coBuyer.firstName || '',
      lastName: buyerInfo.coBuyer.lastName || '',
      email: buyerInfo.coBuyer.email || '',
      phone: buyerInfo.coBuyer.phone || ''
    } : undefined,
    deliveryAddress: {
      line1: buyerInfo.deliveryAddress?.street || buyerInfo.address || '',
      city: buyerInfo.deliveryAddress?.city || buyerInfo.city || '',
      state: buyerInfo.deliveryAddress?.state || buyerInfo.state || '',
      zip: buyerInfo.deliveryAddress?.zip || buyerInfo.zip || ''
    },
    model: {
      brand: build.model?.brand || 'Firefly',
      model: build.model?.name || build.modelCode || 'Custom Build',
      year: new Date().getFullYear(),
      dimensions: build.model?.dimensions || 'TBD'
    },
    pricing: {
      base: pricing.base || selections.basePrice || 0,
      options: pricing.options || 0,
      tax: pricing.tax || 0,
      titleFee: pricing.titleFee || 0,
      delivery: pricing.delivery || 0,
      setup: pricing.setup || 0,
      discounts: pricing.discounts || 0,
      total: pricing.total || 0,
      depositDue: pricing.depositDue || 0
    },
    options: (selections.options || []).map(opt => ({
      code: opt.id || opt.code || '',
      label: opt.name || opt.label || '',
      value: opt.value || '',
      qty: opt.quantity || 1,
      price: opt.price || 0
    })),
    paymentMethod: build.payment?.method === 'card' ? 'credit_card' : 
                   build.payment?.method === 'ach_debit' ? 'cash_ach' :
                   build.payment?.method === 'bank_transfer' ? 'cash_ach' : 'cash_ach',
    depositRequired: build.payment?.plan?.type === 'deposit' || false,
    estimatedFactoryCompletion: build.timeline?.estimatedCompletion || undefined,
    jurisdiction: {
      state: buyerInfo.state || 'TX'
    },
    status: {
      step: build.step || 7,
      contracts: undefined // Will be populated separately
    }
  }
}

// Create DocuSeal session for a specific pack
app.post(['/api/contracts/:orderId/docuseal/session', '/contracts/:orderId/docuseal/session'], async (req, res) => {
  try {
    console.log('[DOCUSEAL_SESSION] Creating session for order:', req.params.orderId, 'pack:', req.body.pack)
    
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) {
      console.error('[DOCUSEAL_SESSION] Authentication failed')
      return
    }

    const { orderId } = req.params
    const { pack } = req.body

    console.log('[DOCUSEAL_SESSION] Request params:', { orderId, pack, userId: auth.userId })

    if (!pack || !['agreement', 'delivery', 'final'].includes(pack)) {
      console.error('[DOCUSEAL_SESSION] Invalid pack:', pack)
      return res.status(400).json({ error: 'Invalid pack. Must be: agreement, delivery, or final' })
    }

    // Get build data
    const build = await getBuildById(orderId)
    console.log('[DOCUSEAL_SESSION] Build found:', !!build, 'userId match:', build?.userId === auth.userId)
    
    if (!build || build.userId !== auth.userId) {
      console.error('[DOCUSEAL_SESSION] Build not found or unauthorized:', orderId, !!build, build?.userId, auth.userId)
      return res.status(404).json({ error: 'Build not found' })
    }

    // Convert build to order format
    const order = buildToOrder(build)
    console.log('[DOCUSEAL_SESSION] Order prepared:', order.id)

    // Check environment variables
    console.log('[DOCUSEAL_SESSION] Environment check:', {
      hasApiKey: !!process.env.DOCUSEAL_API_KEY,
      agreementTemplateId: process.env.DOCUSEAL_TEMPLATE_ID_AGREEMENT,
      deliveryTemplateId: process.env.DOCUSEAL_TEMPLATE_ID_DELIVERY
    })

    // Create DocuSeal session
    const { createPackEnvelope } = await import('../lib/docuseal/client.js')
    const envelope = await createPackEnvelope(orderId, pack, order)

    console.log('[DOCUSEAL_SESSION] Envelope created:', envelope.envelopeId)

    res.json({
      signingUrl: envelope.signingUrl,
      envelopeId: envelope.envelopeId,
      status: envelope.status
    })

  } catch (error) {
    console.error('[DOCUSEAL_SESSION] Session creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create signing session',
      message: error.message,
      stack: error.stack
    })
  }
})

// Test DocuSeal configuration
app.get(['/api/admin/docuseal/test', '/admin/docuseal/test'], async (req, res) => {
  try {
    console.log('[DOCUSEAL_TEST] Testing DocuSeal configuration...')
    
    const config = {
      hasApiKey: !!process.env.DOCUSEAL_API_KEY,
      baseUrl: process.env.DOCUSEAL_BASE_URL || 'https://api.docuseal.co',
      templates: {
        agreement: process.env.DOCUSEAL_TEMPLATE_ID_AGREEMENT,
        delivery: process.env.DOCUSEAL_TEMPLATE_ID_DELIVERY,
        final: process.env.DOCUSEAL_TEMPLATE_ID_FINAL
      }
    }
    
    // Test API connection
    const testResponse = await fetch(`${config.baseUrl}/templates`, {
      method: 'GET',
      headers: {
        'X-Auth-Token': process.env.DOCUSEAL_API_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    const templates = testResponse.ok ? await testResponse.json() : null
    
    res.json({
      config,
      apiTest: {
        status: testResponse.status,
        ok: testResponse.ok,
        templatesCount: templates?.length || 0
      },
      templates: templates?.slice(0, 5) || [] // First 5 templates for debugging
    })
    
  } catch (error) {
    console.error('[DOCUSEAL_TEST] Test failed:', error)
    res.status(500).json({
      error: 'DocuSeal test failed',
      message: error.message
    })
  }
})

// Get contract status for all packs
app.get(['/api/contracts/:orderId/status', '/contracts/:orderId/status'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { orderId } = req.params

    // Get build data
    const build = await getBuildById(orderId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // Get contract status from database
    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ orderId })

    if (!contract) {
      return res.json({
        packs: {
          summary: 'ready',
          agreement: 'not_started',
          delivery: 'not_started',
          final: 'not_started'
        }
      })
    }

    // Check status of each pack
    const docuseal = new DocuSealClient()
    const packStatuses = {}

    for (const pack of ['agreement', 'delivery', 'final']) {
      try {
        packStatuses[pack] = await docuseal.getPackStatus(orderId, pack)
      } catch (error) {
        console.error(`Failed to get ${pack} status:`, error)
        packStatuses[pack] = 'error'
      }
    }

    res.json({
      packs: {
        summary: contract.summaryReviewed ? 'reviewed' : 'ready',
        ...packStatuses
      },
      envelopeIds: contract.envelopeIds || {},
      combinedPdfUrl: contract.status?.combinedPdfUrl,
      auditCertUrl: contract.status?.auditCertUrl
    })

  } catch (error) {
    console.error('Contract status error:', error)
    res.status(500).json({ 
      error: 'Failed to get contract status',
      message: error.message 
    })
  }
})

// Assemble final contract when all packs are completed
app.post(['/api/contracts/:orderId/assemble', '/contracts/:orderId/assemble'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { orderId } = req.params

    // Get build data
    const build = await getBuildById(orderId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // Check if all packs are completed
    const docuseal = new DocuSealClient()
    const allCompleted = await docuseal.checkAllPacksCompleted(orderId)

    if (!allCompleted) {
      return res.status(400).json({ error: 'Not all packs are completed' })
    }

    // Assemble contract
    const pdfUrls = await docuseal.assembleContract(orderId)

    res.json({
      success: true,
      combinedPdfUrl: pdfUrls,
      message: 'Contract assembled successfully'
    })

  } catch (error) {
    console.error('Contract assembly error:', error)
    res.status(500).json({ 
      error: 'Failed to assemble contract',
      message: error.message 
    })
  }
})

// Generate Order Summary PDF (Pack 1)
app.get(['/api/contracts/:orderId/summary-pdf', '/contracts/:orderId/summary-pdf'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { orderId } = req.params
    
    console.log('[PDF_ENDPOINT] Generating summary PDF for order:', orderId)

    // Get build data
    const build = await getBuildById(orderId)
    if (!build || build.userId !== auth.userId) {
      console.error('[PDF_ENDPOINT] Build not found or unauthorized:', orderId, !!build, build?.userId, auth.userId)
      return res.status(404).json({ error: 'Build not found' })
    }

    // Load settings to calculate proper pricing (same as Step 5)
    const settings = await getOrgSettings()
    
    // Calculate pricing the same way as Step 5
    const basePrice = Number(build?.selections?.basePrice || 0)
    const options = build?.selections?.options || []
    const optionsSubtotal = options.reduce((sum, opt) => sum + Number(opt.price || 0) * (opt.quantity || 1), 0)
    
    // Get fees from settings
    const deliveryFee = Number(build?.pricing?.delivery || 0)
    const titleFee = Number(settings?.pricing?.title_fee_default || 500)
    const setupFee = Number(settings?.pricing?.setup_fee_default || 3000)
    const taxRate = Number(settings?.pricing?.tax_rate_percent || 6.25) / 100
    
    // Calculate totals
    const subtotalBeforeFees = basePrice + optionsSubtotal
    const feesSubtotal = deliveryFee + titleFee + setupFee
    const subtotalBeforeTax = subtotalBeforeFees + feesSubtotal
    const salesTax = subtotalBeforeTax * taxRate
    const total = subtotalBeforeTax + salesTax
    
    // Prepare order data the same way as Step 5
    const orderData = {
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
      }
    }
    
    console.log('[PDF_ENDPOINT] Order data prepared using Step 5 method for:', build._id)

    // Generate PDF using Step 5 method - create HTML and convert to PDF
    const result = await generatePDFFromOrderData(orderData)
    
    // Check if we got a valid PDF buffer or text fallback
    if (Buffer.isBuffer(result) && result.length > 100) {
      // We have a valid PDF
      console.log('[PDF_ENDPOINT] Serving PDF for order:', orderId, 'size:', Math.round(result.length / 1024), 'KB')
      
      // Set CORS headers to prevent blocking
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="order-summary-${orderId}.pdf"`)
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cache-Control', 'public, max-age=300')
      
      res.send(result)
    } else {
      // Fallback to text content
      console.log('[PDF_ENDPOINT] Serving text fallback for order:', orderId)
      const textContent = typeof result === 'string' ? result : 
                         (result?.content || result?.toString() || 'Order summary generation failed')
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Content-Disposition', `inline; filename="order-summary-${orderId}.txt"`)
      res.send(textContent)
    }

  } catch (error) {
    console.error('Order summary PDF error:', error)
    res.status(500).json({ 
      error: 'Failed to generate order summary PDF',
      message: error.message 
    })
  }
})

// Pack-specific PDF generation endpoint
app.get(['/api/contracts/:orderId/pack-pdf', '/contracts/:orderId/pack-pdf'], async (req, res) => {
  try {
    const { orderId } = req.params
    const { pack } = req.query
    console.log('[PACK_PDF_ENDPOINT] Generating pack PDF for order:', orderId, 'pack:', pack)

    if (!pack || !['agreement', 'delivery', 'final'].includes(pack)) {
      return res.status(400).json({ error: 'Invalid pack parameter. Must be: agreement, delivery, or final' })
    }

    // Get build data
    const build = await getBuildById(orderId)
    if (!build) {
      console.error('[PACK_PDF_ENDPOINT] Build not found:', orderId)
      return res.status(404).json({ error: 'Build not found' })
    }

    // Convert build to order format
    const order = buildToOrder(build)
    console.log('[PACK_PDF_ENDPOINT] Order data prepared for:', order.id)

    // For now, generate the agreement HTML and convert to PDF
    let htmlContent = ''
    
    if (pack === 'agreement') {
      // Use the existing agreement HTML builder
      const { buildAgreementHtml } = await import('../lib/contracts/html/agreement.js')
      htmlContent = buildAgreementHtml(order)
    } else {
      // For delivery and final packs, use placeholder content for now
      htmlContent = generatePackHTML(pack, order)
    }

    // Generate PDF from HTML using the same PDF generator
    const { generateOrderSummaryPDF } = await import('../lib/pdf/order-summary-generator.js')
    
    // Create a custom PDF using the HTML content
    const pdfResult = await generatePDFFromHTML(htmlContent)
    
    // Check if we got a valid PDF buffer
    if (Buffer.isBuffer(pdfResult) && pdfResult.length > 100) {
      console.log('[PACK_PDF_ENDPOINT] Serving pack PDF:', pack, 'size:', Math.round(pdfResult.length / 1024), 'KB')
      
      // Set CORS headers to prevent blocking
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${pack}-${orderId}.pdf"`)
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'")
      
      res.send(pdfResult)
    } else {
      // Fallback to text content
      console.log('[PACK_PDF_ENDPOINT] Serving text fallback for pack:', pack)
      const textContent = typeof pdfResult === 'string' ? pdfResult : 
                         `${pack} document content for order ${orderId}`
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Content-Disposition', `inline; filename="${pack}-${orderId}.txt"`)
      res.send(textContent)
    }

  } catch (error) {
    console.error('Pack PDF error:', error)
    res.status(500).json({ 
      error: 'Failed to generate pack PDF',
      message: error.message 
    })
  }
})

// Helper function to generate pack-specific HTML content
function generatePackHTML(pack, order) {
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$0'
    return '$' + (amount / 100).toLocaleString()
  }

  if (pack === 'delivery') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Site & Delivery Agreement</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.6; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 2rem; }
          .section { margin: 2rem 0; }
          .info-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
          .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 30%; }
        </style>
      </head>
      <body>
        <h1>Site & Delivery Agreement</h1>
        
        <div class="section">
          <h2>Order Information</h2>
          <table class="info-table">
            <tr><td>Order ID:</td><td>${order.id}</td></tr>
            <tr><td>Customer:</td><td>${order.buyer.firstName} ${order.buyer.lastName}</td></tr>
            <tr><td>Email:</td><td>${order.buyer.email}</td></tr>
            <tr><td>Phone:</td><td>${order.buyer.phone}</td></tr>
            <tr><td>Model:</td><td>${order.model.brand} ${order.model.model}</td></tr>
            <tr><td>Year:</td><td>${order.model.year}</td></tr>
            <tr><td>Total:</td><td>${formatCurrency(order.pricing.total)}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>Delivery Information</h2>
          <table class="info-table">
            <tr><td>Delivery Address:</td><td>${order.deliveryAddress?.line1 || 'TBD'}<br>${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} ${order.deliveryAddress?.zip || ''}</td></tr>
            <tr><td>Delivery Fee:</td><td>${formatCurrency(order.pricing.delivery || 0)}</td></tr>
            <tr><td>Setup Fee:</td><td>${formatCurrency(order.pricing.setup || 0)}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>Terms & Conditions</h2>
          <p>This document contains the site preparation requirements and delivery terms for your tiny home purchase.</p>
          <p><strong>Note:</strong> This is a preview document. The actual signing will occur through DocuSeal.</p>
        </div>
      </body>
      </html>
    `
  } else if (pack === 'final') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Final Acknowledgments & Variations</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.6; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 2rem; }
          .section { margin: 2rem 0; }
          .info-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
          .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 30%; }
        </style>
      </head>
      <body>
        <h1>Final Acknowledgments & Variations</h1>
        
        <div class="section">
          <h2>Order Summary</h2>
          <table class="info-table">
            <tr><td>Order ID:</td><td>${order.id}</td></tr>
            <tr><td>Customer:</td><td>${order.buyer.firstName} ${order.buyer.lastName}</td></tr>
            <tr><td>Model:</td><td>${order.model.brand} ${order.model.model}</td></tr>
            <tr><td>Final Total:</td><td>${formatCurrency(order.pricing.total)}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>Final Acknowledgments</h2>
          <p>This document contains the final acknowledgments and any variations to the original purchase agreement.</p>
          <p><strong>Note:</strong> This is a preview document. The actual signing will occur through DocuSeal.</p>
        </div>

        <div class="section">
          <h2>Completion & Delivery</h2>
          <p>By signing this document, you acknowledge receipt of all required documentation and confirm the completion of your tiny home purchase.</p>
        </div>
      </body>
      </html>
    `
  }
  
  return '<html><body><h1>Document Preview</h1><p>Content loading...</p></body></html>'
}

// Helper function to generate PDF from HTML
async function generatePDFFromHTML(html) {
  try {
    // Check if we're in a serverless environment
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    
    if (isServerless) {
      console.log('[PDF_GENERATOR] Serverless environment detected, using @sparticuz/chromium')
      
      const chromium = await import('@sparticuz/chromium')
      const puppeteer = await import('puppeteer-core')
      
      const browser = await puppeteer.default.launch({
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
      })
      
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '1in',
          right: '1in', 
          bottom: '1in',
          left: '1in'
        },
        printBackground: true
      })
      
      await browser.close()
      return Buffer.from(pdfBuffer)
      
    } else {
      console.log('[PDF_GENERATOR] Local environment detected, using regular puppeteer')
      
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in', 
          left: '1in'
        },
        printBackground: true
      })
      
      await browser.close()
      return Buffer.from(pdfBuffer)
    }
    
  } catch (error) {
    console.error('[PDF_GENERATOR] Pack PDF generation failed:', error)
    return `Failed to generate PDF: ${error.message}`
  }
}

// Helper function to generate PDF from order data using the professional order-summary.js formatter
async function generatePDFFromOrderData(orderData) {
  try {
    const { build, settings, pricing } = orderData
    
    // Import the professional order summary HTML builder
    const { buildOrderSummaryHtml } = await import('../lib/contracts/html/order-summary.js')
    
    // Convert build data structure to order data structure expected by the formatter
    const order = {
      id: build._id,
      buyer: {
        firstName: build.buyerInfo?.firstName || '',
        lastName: build.buyerInfo?.lastName || '',
        email: build.buyerInfo?.email || '',
        phone: build.buyerInfo?.phone || ''
      },
      coBuyer: build.buyerInfo?.coBuyer ? {
        firstName: build.buyerInfo.coBuyer.firstName || '',
        lastName: build.buyerInfo.coBuyer.lastName || '',
        email: build.buyerInfo.coBuyer.email || ''
      } : null,
      deliveryAddress: {
        line1: build.buyerInfo?.address || '',
        line2: build.buyerInfo?.address2 || '',
        city: build.buyerInfo?.city || '',
        state: build.buyerInfo?.state || '',
        zip: build.buyerInfo?.zip || ''
      },
      model: {
        brand: 'Firefly',
        name: build.modelName || 'Custom Build',
        modelCode: build.modelSlug ? (() => {
          // Convert slug to model code
          const modelMapping = {
            'magnolia': 'APS-630',
            'oak': 'APS-520',
            'cedar': 'APS-720',
            'pine': 'APS-820',
            'bluebonnet': 'APS-601',
            'nest': 'APS-520MS',
            'azul': 'APS-523',
            'meadow': 'APS-528'
          }
          return modelMapping[build.modelSlug] || build.modelSlug.toUpperCase()
        })() : '',
        year: new Date().getFullYear().toString(),
        dimensions: 'TBD'
      },
      options: (build.selections?.options || []).map(option => ({
        code: option.name || option.code || '',
        label: option.description || option.name || '',
        qty: option.quantity || 1,
        price: Math.round((Number(option.price || 0) * (option.quantity || 1)) * 100) // Convert to cents
      })),
      pricing: {
        base: Math.round(pricing.basePrice * 100), // Convert to cents
        options: Math.round(pricing.optionsSubtotal * 100),
        tax: Math.round(pricing.salesTax * 100),
        titleFee: Math.round(pricing.titleFee * 100),
        delivery: Math.round(pricing.deliveryFee * 100),
        setup: Math.round(pricing.setupFee * 100),
        total: Math.round(pricing.total * 100)
      },
      paymentMethod: build.payment?.method || build.financing?.method || 'cash',
      depositRequired: !!build.financing?.depositRequired,
      estimatedFactoryCompletion: build.estimatedFactoryCompletion || null,
      build: build // Include the full build data for the HTML template
    }
    
    console.log('[PDF_GENERATOR] Using professional order-summary.js formatter for order:', order.id)
    console.log('[PDF_GENERATOR] Order data structure:', {
      model: order.model,
      paymentMethod: order.paymentMethod,
      build: {
        modelName: order.build?.modelName,
        modelSlug: order.build?.modelSlug,
        financing: order.build?.financing
      }
    })
    
    // Generate HTML using the professional formatter
    const htmlContent = buildOrderSummaryHtml(order)
    
    // Generate PDF from HTML using the same method as pack PDFs
    return await generatePDFFromHTML(htmlContent)
    
  } catch (error) {
    console.error('[generatePDFFromOrderData] Error:', error)
    return `Order Summary generation failed: ${error.message}`
  }
}

// Mark Pack 1 (Order Summary) as reviewed
app.post(['/api/contracts/:orderId/mark-summary-reviewed', '/contracts/:orderId/mark-summary-reviewed'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { orderId } = req.params

    // Get build data
    const build = await getBuildById(orderId)
    if (!build || build.userId !== auth.userId) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // Update contract record
    const db = await getDb()
    await db.collection('contracts').updateOne(
      { orderId },
      {
        $set: {
          summaryReviewed: true,
          summaryReviewedAt: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          orderId,
          createdAt: new Date(),
          version: 1
        }
      },
      { upsert: true }
    )

    res.json({ success: true })

  } catch (error) {
    console.error('Mark summary reviewed error:', error)
    res.status(500).json({ 
      error: 'Failed to mark summary as reviewed',
      message: error.message 
    })
  }
})

// Import PDF generator
async function generateOrderSummaryPDF(order) {
  const { generateOrderSummaryPDF: generatePDF } = await import('../lib/pdf/order-summary-generator.js')
  return generatePDF(order)
}

// Unified DocuSeal template initialization (v2 templates)
app.post(['/api/admin/docuseal/init-templates', '/admin/docuseal/init-templates'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    console.info("[TEMPLATE_INIT] Starting unified template initialization...")
    
    // Check environment variables
    if (!process.env.DOCUSEAL_API_KEY) {
      throw new Error('DOCUSEAL_API_KEY environment variable is required')
    }

    const results = {}
    
    console.info("[TEMPLATE_INIT] Creating Agreement v2...")
    const { buildAgreementTemplate } = await import('../lib/docuseal/builders/agreement.js')
    results["Agreement v2"] = await buildAgreementTemplate()
    
    console.info("[TEMPLATE_INIT] Creating Delivery/Site Readiness v2...")
    const { buildDeliveryTemplate } = await import('../lib/docuseal/builders/pack3_delivery.js')
    results["Delivery/Site Readiness v2"] = await buildDeliveryTemplate()
    
    console.info("[TEMPLATE_INIT] All templates created successfully:", results)
    
    const envInstructions = [
      `DOCUSEAL_TEMPLATE_ID_AGREEMENT=${results["Agreement v2"]}`,
      `DOCUSEAL_TEMPLATE_ID_DELIVERY=${results["Delivery/Site Readiness v2"]}`
    ]
    
    res.json({ 
      ok: true, 
      success: true,
      templates: results,
      message: "All templates created successfully with v2 versions",
      envInstructions: envInstructions,
      dashboardUrl: "https://docuseal.com/templates",
      nextSteps: [
        "1. Update your .env file with the new template IDs above",
        "2. Verify templates in DocuSeal dashboard have readable content",
        "3. Archive or delete the old v1 templates to avoid confusion",
        "4. Test Step 7 contract flow with new template IDs"
      ]
    })

  } catch (error) {
    console.error('[TEMPLATE_INIT] Init templates failed:', error)
    res.status(500).json({ 
      ok: false,
      error: 'Failed to initialize templates',
      message: error.message,
      details: error.stack
    })
  }
})

// Initialize Agreement Template with DOCX endpoint
app.post(['/api/admin/docuseal/init-templates/agreement', '/admin/docuseal/init-templates/agreement'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    console.log('[AGREEMENT_TEMPLATE] Creating DOCX-based agreement template...')

    const { buildAgreementTemplate } = await import('../lib/docuseal/builders/agreement.js')
    const templateId = await buildAgreementTemplate()

    console.log('[AGREEMENT_TEMPLATE] Agreement template created:', templateId)

    res.json({
      success: true,
      templateId,
      message: 'Agreement template created successfully via DocuSeal DOCX endpoint',
      envVariable: 'DOCUSEAL_TEMPLATE_ID_AGREEMENT',
      instructions: `Add this to your .env file: DOCUSEAL_TEMPLATE_ID_AGREEMENT=${templateId}`
    })

  } catch (error) {
    console.error('Agreement template creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create agreement template',
      message: error.message 
    })
  }
})

// Initialize Delivery Template with DOCX endpoint
app.post(['/api/admin/docuseal/init-templates/pack3_delivery', '/admin/docuseal/init-templates/pack3_delivery'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    console.log('[DELIVERY_TEMPLATE] Creating DOCX-based delivery template...')

    const { buildDeliveryTemplate } = await import('../lib/docuseal/builders/pack3_delivery.js')
    const templateId = await buildDeliveryTemplate()

    console.log('[DELIVERY_TEMPLATE] Delivery template created:', templateId)

    res.json({
      success: true,
      templateId,
      templateName: "Firefly – Delivery, Set & Site Readiness Agreement v1",
      message: 'Delivery template created successfully via DocuSeal DOCX endpoint',
      envVariable: 'DOCUSEAL_TEMPLATE_ID_DELIVERY',
      instructions: `Add this to your .env file: DOCUSEAL_TEMPLATE_ID_DELIVERY=${templateId}`,
      dashboardUrl: "https://docuseal.com/templates"
    })

  } catch (error) {
    console.error('Delivery template creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create delivery template',
      message: error.message,
      details: error.stack
    })
  }
})

// Get DocuSeal template status
app.get(['/api/admin/docuseal/templates', '/admin/docuseal/templates'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { getExistingTemplates } = await import('../lib/docuseal-templates.js')
    const templates = await getExistingTemplates()

    const status = {
      agreement: process.env.DOCUSEAL_TEMPLATE_ID_AGREEMENT || null,
      delivery: process.env.DOCUSEAL_TEMPLATE_ID_DELIVERY || null,
      final: process.env.DOCUSEAL_TEMPLATE_ID_FINAL || null
    }

    res.json({
      existing: templates,
      configured: status,
      ready: Object.values(status).every(id => id !== null)
    })

  } catch (error) {
    console.error('Template status error:', error)
    res.status(500).json({ 
      error: 'Failed to get template status',
      message: error.message 
    })
  }
})


// New contract submission endpoint that returns submitter URLs
app.post(['/api/contracts/:templateKey/start', '/contracts/:templateKey/start'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { templateKey } = req.params
    const { buildId, coBuyerEnabled = false } = req.body

    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    console.log('[CONTRACT_START] Starting contract for template:', templateKey, 'build:', buildId)

    // Import the existing working modules
    const { createSubmission } = await import('../lib/docuseal.js')
    const { getTemplate } = await import('../lib/docuseal/templates.js')

    // Get template configuration
    const template = getTemplate(templateKey)
    console.log('[CONTRACT_START] Using template:', template.name, 'ID:', template.id)

    // Get build data
    const build = await getBuildById(buildId)
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    // Get organization settings for prefill data
    const settings = await getOrgSettings()

    // Build prefill data
    const prefillData = await buildContractPrefill(build, settings)

    // Build a filtered map just for FIELD elements (DocuSeal ignores unknown fields).
    // Keep the full prefill object for HTML {{var}} replacement used by DocuSeal's native Download.
    const templateFieldMap = template.fieldMap || {}
    const validFieldNames = new Set(Object.keys(templateFieldMap))

    const fieldsPrefill = {}
    for (const [key, value] of Object.entries(prefillData)) {
      if (validFieldNames.has(key)) fieldsPrefill[key] = value
    }

    console.log('[CONTRACT_START] Template field validation:', {
      templateKey,
      totalPrefillFields: Object.keys(prefillData).length,
      validTemplateFields: Array.from(validFieldNames),
      fieldElementsUsed: Object.keys(fieldsPrefill),
      ignoredForFields: Object.keys(prefillData).filter(key => !validFieldNames.has(key))
    })

    // Build submitters array (without fields - the existing function will add them)
    const buyerInfo = build.buyerInfo || {}
    const submitters = [{
      name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
      email: buyerInfo.email || '',
      role: 'buyer' // Match DocuSeal template role names
    }]

    // Add co-buyer if enabled and data exists
    if (coBuyerEnabled && buyerInfo.coBuyerEmail) {
      submitters.push({
        name: `${buyerInfo.coBuyerFirstName || ''} ${buyerInfo.coBuyerLastName || ''}`.trim(),
        email: buyerInfo.coBuyerEmail,
        role: 'cobuyer' // Match DocuSeal template role names
      })
    }

    // Create submission using the existing working function
    const submission = await createSubmission({
      templateId: template.id,
      // Send full prefill so DocuSeal can merge {{var}} when generating PDFs
      prefill: prefillData,
      // Use filtered fields for actual field elements overlay
      fieldsPrefill,
      submitters,
      sendEmail: false,
      completedRedirectUrl: `${process.env.APP_URL || 'https://www.fireflyestimator.com'}/checkout/${buildId}/document-signed`,
      cancelRedirectUrl: `${process.env.APP_URL || 'https://www.fireflyestimator.com'}/checkout/${buildId}/agreement`
    })

    console.log('[CONTRACT_START] Submission created:', submission.id)

    // Debug: Log the full submission response
    console.log('[CONTRACT_START] Full submission response:', {
      submissionId: submission.submissionId,
      signerUrl: submission.signerUrl,
      rawResponse: submission.raw
    })

    // Use the signing URL extracted by the createSubmission function
    const signingUrl = submission.signerUrl

    console.log('[CONTRACT_START] Extracted signing URL:', signingUrl)

    // If we still don't have a signing URL, this is a problem
    if (!signingUrl) {
      console.error('[CONTRACT_START] No signing URL found in DocuSeal response')
      return res.status(500).json({
        error: 'No signing URL received from DocuSeal',
        message: 'DocuSeal submission was created but no signing URL was provided',
        submissionId: submission.submissionId,
        rawResponse: submission.raw
      })
    }

    // Return submitter URLs (using the existing function's return format)
    const result = {
      submissionId: submission.submissionId,
      embedUrl: signingUrl,
      templateName: template.name
    }

    // Add co-buyer URL if applicable
    if (coBuyerEnabled && buyerInfo.coBuyerEmail && submission.raw?.submitters?.[1]) {
      result.coBuyerEmbedUrl = submission.raw.submitters[1].url
    }

    console.log('[CONTRACT_START] Final result:', result)
    res.json(result)

  } catch (error) {
    console.error('[CONTRACT_START] Error:', error)
    res.status(500).json({ 
      error: 'Failed to start contract signing',
      message: error.message 
    })
  }
})

// Legacy contract creation endpoint (for backward compatibility)
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
    const prefill = await buildContractPrefill(build, settings)

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
          completedRedirectUrl: `${process.env.APP_URL || 'https://www.fireflyestimator.com'}/checkout/${buildId}/document-signed`,
          cancelRedirectUrl: `${process.env.APP_URL || 'https://www.fireflyestimator.com'}/checkout/${buildId}/agreement`
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

    // Convert submissions to packs format for contract page compatibility
    const packs = {
      summary: contract.summaryReviewed ? 'reviewed' : 'ready',
      agreement: 'not_started',
      delivery: 'not_started', 
      final: 'not_started'
    }

    // Map submission statuses to pack statuses
    updatedSubmissions.forEach(submission => {
      if (submission.name === 'purchase_agreement' || submission.name === 'masterRetail') {
        if (submission.status === 'completed') {
          packs.agreement = 'completed'
        } else if (submission.status === 'signing') {
          packs.agreement = 'in_progress'
        } else if (submission.status === 'ready') {
          packs.agreement = 'ready'
        }
      } else if (submission.name === 'delivery') {
        if (submission.status === 'completed') {
          packs.delivery = 'completed'
        } else if (submission.status === 'signing') {
          packs.delivery = 'in_progress'
        } else if (submission.status === 'ready') {
          packs.delivery = 'ready'
        }
      }
    })

    res.status(200).json({
      success: true,
      status: overallStatus,
      packs: packs,
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
    if (newOverallStatus === 'completed') {
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
async function buildContractPrefill(build, settings) {
  console.log('[CONTRACT_CREATE] Building prefill data for build:', build._id)
  
  const selections = build.selections || {}
  const pricing = build.pricing || {}
  const buyerInfo = build.buyerInfo || {}
  const financing = build.financing || {}
  const delivery = build.delivery || {}
  
  console.log('[CONTRACT_CREATE] Build data sections:', {
    hasSelections: !!selections,
    hasPricing: !!pricing,
    hasBuyerInfo: !!buyerInfo,
    hasFinancing: !!financing,
    hasDelivery: !!delivery,
    selectionsKeys: Object.keys(selections),
    pricingKeys: Object.keys(pricing),
    buyerInfoKeys: Object.keys(buyerInfo),
    financingKeys: Object.keys(financing),
    deliveryKeys: Object.keys(delivery)
  })
  
  // Calculate key amounts from the correct data structure
  const basePrice = selections.basePrice || 0
  const optionsTotal = pricing.optionsTotal || 0
  const deliveryEstimate = pricing.deliveryEstimate || 0
  const titleFee = pricing.titleFee || 0
  const setupFee = pricing.setupFee || 0
  const taxes = pricing.taxes || 0
  const totalPurchasePrice = pricing.total || (basePrice + optionsTotal + deliveryEstimate + titleFee + setupFee + taxes)
  
  // Calculate deposit (default to 25% if not specified)
  const depositPercent = 25 // Default deposit percentage
  const depositAmount = Math.round(totalPurchasePrice * depositPercent / 100)
  const balanceAmount = totalPurchasePrice - depositAmount

  // Get model information
  const modelName = build.modelName || 'Unknown Model'
  const modelSlug = build.modelSlug || ''
  
  // Get model code from slug if available
  let modelCode = ''
  let modelDimensions = ''
  
  if (modelSlug) {
    // Convert slug to model code (e.g., 'magnolia' -> 'APS-630')
    const modelMapping = {
      'magnolia': 'APS-630',
      'oak': 'APS-520',
      'cedar': 'APS-720',
      'pine': 'APS-820',
      'bluebonnet': 'APS-601',
      'nest': 'APS-520MS',
      'azul': 'APS-523',
      'meadow': 'APS-528'
    }
    modelCode = modelMapping[modelSlug] || modelSlug.toUpperCase()
    
    // Get dimensions from model data if available
    try {
      const { findModelById } = await import('../lib/model-utils.js')
      const modelData = await findModelById(modelSlug)
      if (modelData && modelData.length && modelData.width && modelData.height) {
        modelDimensions = `${modelData.length} x ${modelData.width} x ${modelData.height}`
      }
    } catch (error) {
      console.log('[CONTRACT_CREATE] Could not fetch model dimensions:', error.message)
    }
  }

  // Format payment method with detailed information
  const getPaymentMethodDisplay = () => {
    const paymentMethod = financing.method
    
    if (paymentMethod === 'ach_debit') {
      return 'ACH Debit (Bank Account)'
    } else if (paymentMethod === 'bank_transfer') {
      return 'Bank Transfer (Wire/ACH Credit)'
    } else if (paymentMethod === 'credit_card') {
      return 'Credit Card'
    } else if (paymentMethod === 'financing') {
      return `Financing (${financing.lender || 'Third Party Lender'})`
    } else {
      return 'Cash'
    }
  }

  // CRITICAL: Use ONLY the exact field names from FIELD_MAPS
  // This ensures perfect matching with DocuSeal template fields
  const prefill = {
    // Buyer Information - EXACT field names from FIELD_MAPS.masterRetail
    buyer_full_name: `${buyerInfo.firstName || ''} ${buyerInfo.lastName || ''}`.trim(),
    buyer_email: buyerInfo.email || '',
    buyer_address: buyerInfo.address || '',
    buyer_phone: buyerInfo.phone || '',
    // Co-buyer fields (optional)
    cobuyer_full_name: (buyerInfo.coBuyerFirstName || buyerInfo.coBuyer?.firstName)
      ? `${buyerInfo.coBuyerFirstName || buyerInfo.coBuyer?.firstName || ''} ${buyerInfo.coBuyerLastName || buyerInfo.coBuyer?.lastName || ''}`.trim()
      : '',
    cobuyer_email: buyerInfo.coBuyerEmail || buyerInfo.coBuyer?.email || '',
    
    // Unit Information - EXACT field names from FIELD_MAPS.masterRetail
    model_brand: "Athens Park Select",
    model_code: modelCode || '',
    model_year: new Date().getFullYear().toString(),
    dimensions: modelDimensions,
    
    // Pricing Information - EXACT field names from FIELD_MAPS.masterRetail
    price_base: formatCurrency(basePrice),
    price_options: formatCurrency(optionsTotal),
    price_freight_est: formatCurrency(deliveryEstimate),
    price_setup: formatCurrency(setupFee),
    price_other: formatCurrency(titleFee + taxes), // Combined title fee and taxes
    price_total: formatCurrency(totalPurchasePrice),
    
    // Payment Terms
    deposit_percent: `${depositPercent}%`,
    deposit_amount: formatCurrency(depositAmount),
    balance_amount: formatCurrency(balanceAmount),
    payment_method: getPaymentMethodDisplay(),
    
    // Delivery Information - Format for DocuSeal template
    delivery_address: [delivery.address || buyerInfo.address || '', delivery.city || buyerInfo.city || '', delivery.state || buyerInfo.state || '', delivery.zip || buyerInfo.zip || ''].filter(Boolean).join(', '),
    delivery_city: delivery.city || buyerInfo.city || '',
    delivery_state: delivery.state || buyerInfo.state || '',
    delivery_zip: delivery.zip || buyerInfo.zip || '',
    delivery_notes: delivery.notes || '',
    
    // Estimated completion date (8-12 weeks from now)
    est_completion_date: new Date(Date.now() + (10 * 7 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    
    // Legal/Compliance
    state_classification: "Travel Trailer (park model RV)",
    completion_estimate: "8-12 weeks from contract signing",
    storage_policy: "Delivery within 12 days after factory completion; storage charges may apply",
    
    // Buyer Initials for all templates
    buyer_initials: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    
    // Co-Buyer Initials (if available)
    cobuyer_initials: buyerInfo.coBuyerFirstName && buyerInfo.coBuyerLastName ? 
      `${buyerInfo.coBuyerFirstName.charAt(0)}${buyerInfo.coBuyerLastName.charAt(0)}`.toUpperCase() : '',
    
    // Delivery Agreement Specific Fields
    site_initials_1: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    site_initials_2: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    site_initials_3: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    site_initials_4: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    site_initials_5: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    site_initials_6: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    delivery_initials_1: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    delivery_initials_2: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    delivery_initials_3: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    fees_initials_1: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    fees_initials_2: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    fees_initials_3: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    risk_initials_1: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    risk_initials_2: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    insurance_initials: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    storage_initials: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    indemnification_initials: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    buyer_page_initials: `${buyerInfo.firstName?.charAt(0) || ''}${buyerInfo.lastName?.charAt(0) || ''}`.toUpperCase(),
    cobuyer_page_initials: buyerInfo.coBuyerFirstName && buyerInfo.coBuyerLastName ? 
      `${buyerInfo.coBuyerFirstName.charAt(0)}${buyerInfo.coBuyerLastName.charAt(0)}`.toUpperCase() : '',
    
    // Signature fields (these will be filled by DocuSeal during signing)
    buyer_signature: '', // Will be filled during signing
    cobuyer_signature: '', // Will be filled during signing (if co-buyer exists)
    firefly_signature: '' // Will be filled by Firefly representative
  }

  console.log('[CONTRACT_CREATE] Generated prefill data:', {
    prefillKeys: Object.keys(prefill),
    sampleValues: {
      order_id: prefill.order_id,
      buyer_name: prefill.buyer_name,
      buyer_full_name: prefill.buyer_full_name,
      buyer_email: prefill.buyer_email,
      buyer_phone: prefill.buyer_phone,
      buyer_address: prefill.buyer_address,
      model_brand: prefill.model_brand,
      model_code: prefill.model_code,
      model_year: prefill.model_year,
      dimensions: prefill.dimensions,
      unit_model: prefill.unit_model,
      total_price: prefill.total_price,
      payment_method: prefill.payment_method
    }
  })
  
  console.log('[CONTRACT_CREATE] Full prefill data:', JSON.stringify(prefill, null, 2))

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
    
    // Store analytics event in database with enhanced error handling
    const db = await getDb()
    let analyticsCol = db.collection('Analytics')
    
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
    
    // Add retry logic for database operations
    let insertAttempt = 0;
    const maxRetries = 3;
    
    while (insertAttempt < maxRetries) {
      try {
        await analyticsCol.insertOne(analyticsEvent)
        break;
      } catch (insertError) {
        insertAttempt++;
        console.warn(`Analytics insert attempt ${insertAttempt} failed:`, insertError.message);
        
        if (insertAttempt >= maxRetries) {
          throw insertError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, insertAttempt) * 500));
        
        // Try to get a fresh database connection
        const { closeConnection } = await import('../lib/db.js')
        await closeConnection();
        const freshDb = await getDb();
        analyticsCol = freshDb.collection('Analytics');  // Use fresh collection reference
      }
    }
    
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Analytics event error:', {
      message: error?.message || error,
      code: error?.code,
      name: error?.name,
      stack: process.env.DEBUG_ADMIN === 'true' ? error?.stack : undefined
    })
    
    // Check if this is a database connection error
    if (error?.message?.includes('tlsv1 alert internal error') || 
        error?.message?.includes('MongoServerSelectionError') || 
        error?.message?.includes('MongoNetworkError')) {
      return res.status(503).json({ 
        error: 'database_unavailable', 
        message: 'Database connection failed. Please try again later.' 
      })
    }
    
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

// Admin endpoint for fetching draft blog posts
app.get(['/api/admin/drafts', '/admin/drafts'], async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS')
  const auth = await requireAdmin(req, res)
  if (!auth) return

  try {
    const db = await getDb()
    const { limit = 10, offset = 0 } = req.query
    
    // Query for draft posts only
    const query = { status: 'draft' }
    
    const drafts = await db.collection('blog_posts')
      .find(query)
      .sort({ updatedAt: -1 }) // Most recently updated first
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray()
    
    // Get total count for pagination
    const total = await db.collection('blog_posts').countDocuments(query)
    
    // Transform the data for the frontend
    const transformedDrafts = drafts.map(draft => ({
      _id: draft._id,
      title: draft.title,
      excerpt: draft.excerpt,
      status: draft.status,
      slug: draft.slug,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      author: draft.author,
      template: draft.template,
      featuredImage: draft.featuredImage
    }))
    
    return res.status(200).json({
      posts: transformedDrafts,
      total: total,
      hasMore: total > parseInt(offset) + parseInt(limit),
      postsLength: transformedDrafts.length
    })
  } catch (error) {
    console.error('Admin drafts fetch error:', error)
    return res.status(500).json({ 
      error: 'fetch_failed', 
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

// Helper function to get default content for pages
function getDefaultPageContent(pageId) {
  const defaults = {
    'about': {
      hero: {
        title: 'About Firefly Tiny Homes',
        subtitle: 'Texas\'s online dealership for Champion Park Model Homes—built for transparency, speed, and savings.'
      },
      story: {
        title: 'Our Story',
        content: 'Firefly Tiny Homes was founded to make park model home buying simple and modern. Instead of a large sales lot with high overhead, we built a streamlined online experience that connects you directly with the factory. The result: faster timelines, transparent pricing, and real savings.'
      },
      benefits: {
        title: 'Why Online Saves You Money',
        content: 'Lower overhead vs traditional dealerships, no hidden lot fees or surprise markups, factory-direct scheduling and communication, digital contracts and payments for a faster close.'
      },
      comparison: {
        title: 'Traditional Dealer vs Firefly',
        content: 'Traditional: high lot overhead, slow quotes, salesperson pressure. Firefly: transparent pricing, online design, expert help when you want it. Traditional: paper contracts and weeks of back‑and‑forth. Firefly: digital e‑sign + payment—secure and convenient.'
      },
      location: {
        title: 'Proudly Serving the Texas Hill Country',
        content: 'Based in Pipe Creek, our team supports customers across Texas—from design through delivery and setup. Visit our FAQ, explore models, or contact us for help.'
      }
    },
    'about-manufacturer': {
      hero: {
        title: 'About the Manufacturer: Champion Homes — Athens Park Model Homes',
        subtitle: 'Park model tiny homes built with precision in modern, climate-controlled factories—certified, comfortable, and made to last.'
      },
      overview: {
        title: 'Who Builds Our Park Model Tiny Homes?',
        content: 'Champion Homes is one of America\'s most established factory-home builders, and their Athens Park Model Homes division focuses specifically on park model RVs (often called "park model tiny homes"). Athens Park blends residential-grade materials, tight factory quality controls, and modern design to deliver small homes that live big—year after year.'
      },
      quality: {
        title: 'Inside the Factory: How Athens Park Models Are Built',
        content: 'Athens Park models are assembled on steel chassis in a controlled production line. Walls, floors, and roofs are framed square with jigs, fastened to spec, insulated, sheathed, and finished to residential standards. Building indoors keeps materials dry and allows stringent quality checks at each station. Plumbing and electrical are tested before the home leaves the plant.'
      },
      certifications: {
        title: 'Certified for Safety, Placement, and Peace of Mind',
        content: 'Park models from Athens Park are built to the ANSI A119.5 park model RV standard—a nationally recognized safety and construction code for this category. Translation: electrical, plumbing, fire safety, egress, and structure are held to a clear benchmark.'
      },
      benefits: {
        title: 'Real-World Benefits You\'ll Feel',
        content: 'Certifications + labeling make it easier to place your unit in compliant locations and arrange financing/insurance. Full-size appliances, real bathrooms, and smart storage mean no daily compromises. Factory checks at every stage + a manufacturer warranty give long-term peace of mind.'
      },
      partnership: {
        title: 'Why We Partner with Champion',
        content: 'We chose Champion\'s Athens Park division because their process quality, materials, and design options consistently deliver the best value to our customers. Firefly\'s role is to guide your selection, lock your build spec, and coordinate documents, payment, and delivery.'
      }
    },
    'how-it-works': {
      hero: {
        title: 'How It Works',
        subtitle: 'Order your dream tiny home in under an hour from the comfort of your phone or computer.'
      },
      introduction: {
        title: 'Becoming a tiny homeowner has never been easier',
        content: 'At Firefly, you can shop, customize, and secure your new home in under an hour—all from the comfort of your phone or computer. Follow our simple 8-step process, then sit back while your home is built at the factory and delivered to your property.'
      },
      process: {
        title: 'The Firefly 8-Step Process',
        content: 'We designed our online experience to be clear, fast, and stress-free. Each step is visual, interactive, and only takes a few minutes. Within about an hour, you\'ll have a tiny home officially on order.'
      },
      timeline: {
        title: 'After Your Order',
        content: 'Once you\'ve completed the 8 steps, here\'s what happens next: Factory Build (4-8 weeks), Delivery & Site Prep (1-2 weeks), Setup & Leveling (1-2 days), Move-In Ready (same day).'
      },
      benefits: {
        title: 'Why Firefly Is Different',
        content: 'Fast & Simple: Order a home in under an hour. Transparent Pricing: No hidden fees, no surprises. Human Support: Always a live team member just a call away. Fully Digital: Modern, streamlined, and secure from start to finish.'
      },
      cta: {
        title: 'Ready to Begin?',
        content: 'Your dream tiny home is just a few clicks away. Start customizing today and be on your way to ownership within an hour.'
      }
    },
    'faq': {
      title: 'Park Model Homes FAQ | Firefly Tiny Homes',
      description: 'Find answers to everything about park model homes—and why Firefly Tiny Homes is your ideal online dealership for Champion Park Models.',
      headerDescription: 'Welcome to our FAQ section! Here\'s everything you need to know about park model homes, Champion Park Model Homes, and the advantages of working with Firefly Tiny Homes—your online dealership for better pricing, personalized service, and the future of park model home buying.',
      faqSections: [
        {
          title: 'Park Model Basics',
          items: [
            {
              question: 'What is a park model home?',
              answer: 'A park model home is a small, factory-built home on a wheeled chassis that is limited to 400 square feet of living space (not counting porches or lofts). Park models are perfect for downsizing, vacation properties, AirBNBs. or full-time living in areas where permitted.'
            },
            {
              question: 'Where can I place a park model home?',
              answer: 'Park models can be placed in RV resorts, tiny home communities, mobile home parks, or on private land, depending on local zoning rules. Always check your city or county requirements before setting up your home. <a className="text-yellow-500 hover:underline" href="mailto:office@fireflytinyhomes.com">Contact us</a> if you need help.'
            },
            {
              question: 'Can I live in a park model full-time?',
              answer: 'Yes, in many areas park models can be lived in full-time. Some places allow them only as seasonal or vacation residences. Firefly Tiny Homes can help you check local zoning to make sure your home is set up legally.'
            },
            {
              question: 'How big are park model homes?',
              answer: 'By definition, park models are 399 sq. ft. or less, but many include lofts or porches that add usable space without counting toward that limit. Most are around 11–12 feet wide and 34–39 feet long.'
            },
            {
              question: 'How much do park model homes cost?',
              answer: 'Prices vary widely by size, features, and finishes. Entry-level homes may start around $50,000–$70,000, while more upgraded or luxury models can exceed $100,000. Firefly Tiny Homes provides clear, upfront pricing with no hidden overhead costs. See our <a className="text-yellow-500 hover:underline" href="#models">Models &amp; Options</a>.'
            },
            {
              question: 'Can I finance a park model home?',
              answer: 'Yes. Park models can qualify for RV loans, personal loans, or financing through specialty lenders. While they don\'t always qualify for traditional mortgages, our team can connect you with financing options to make ownership simple.'
            },
            {
              question: 'Are park model homes good investments?',
              answer: 'Park models are affordable, durable, and can generate rental income as vacation properties or short-term rentals. With proper maintenance, they hold their value well, especially in high-demand vacation or retirement destinations.'
            },
            {
              question: 'What about maintenance and energy efficiency?',
              answer: 'Park models are built with modern materials, insulation, and energy-efficient appliances. They are low-maintenance compared to traditional houses, and their smaller size keeps utility bills affordable.'
            },
            {
              question: 'What are common pitfalls when buying a park model?',
              answer: 'Some buyers overlook zoning rules, don\'t budget for delivery and setup, or choose layouts that don\'t fit their lifestyle. Working with Firefly ensures you avoid these mistakes by getting expert guidance from day one.'
            }
          ]
        },
        {
          title: 'Champion Park Models',
          items: [
            {
              question: 'Why choose Champion Park Models?',
              answer: 'Champion is one of the most trusted names in the industry, with over 60 years of experience and multiple manufacturing facilities across the U.S. Champion Park Models are known for their quality, durability, and innovative designs that feel like a full-size home in a compact space.'
            },
            {
              question: 'What makes Champion\'s park models unique?',
              answer: 'Champion builds with full-size appliances, high ceilings, stylish finishes, and smart layouts. Their models balance efficiency with comfort, and they offer customizable options so you can create a home that matches your exact style and needs.'
            }
          ]
        },
        {
          title: 'Why Firefly Tiny Homes',
          items: [
            {
              question: 'Why partner with Firefly instead of a traditional dealership?',
              answer: 'Because our dealership is primarily online, we don\'t have the overhead costs of a brick-and-mortar dealership who have large lots with expensive models onsite. We pass those savings directly to you, giving us a competitive edge, and offering you better prices and more streamlined service.'
            },
            {
              question: 'How is the online dealership experience better?',
              answer: 'You can browse models, customize your home, and complete the buying process from anywhere—no long drives to a sales lot required, and no hard-ball salesperson to contend with. Though our team of experts are always available for in-person or virtual consultations, that\'s entirely optional, as our online purchase flow is simple and intuitive.'
            },
            {
              question: 'How are we paving the future of park model home buying?',
              answer: 'The people have spoken, and just like the car industry shifted to online dealerships for customer convenience, we\'re doing the same with park model homes. Firefly is at the forefront of this change, giving buyers a faster, smarter, and more affordable way to purchase their dream home.'
            }
          ]
        },
        {
          title: 'Ordering, Delivery & Support',
          items: [
            {
              question: 'How do I order a park model from Firefly?',
              answer: 'Simply choose your model, pick any options or add-ons you\'d like, and place your order with cash payment or financing. We immediately process your order, and get your home\'s construction scheduled with the manufacturing team. Once they give us an ETA for completion, we schedule the delivery with one of our professional haulers, and update you with the final estimated delivery date.'
            },
            {
              question: 'How does delivery and setup work?',
              answer: 'Your park model will be delivered on its chassis. You\'ll need a prepared site and utility hookups. Firefly Tiny Homes works with trusted local contractors to handle delivery, leveling, tie-downs, and connections so you can move in with confidence.'
            },
            {
              question: 'Do your homes include inspections or warranties?',
              answer: 'Yes. Every home undergoes factory inspections, and Champion provides warranties on workmanship and materials. Firefly also supports you through the delivery and setup stages to ensure your experience is stress-free and you are 100% satisfied with your new home.'
            }
          ]
        }
      ]
    }
  }
  
  return defaults[pageId] || {}
}

// Default policy content functions
function getDefaultPrivacyPolicy() {
  return `Firefly Tiny Homes respects your privacy. This policy explains how we collect, use, and protect your information.

## Information We Collect

- Contact details (name, email, phone, mailing address) when you request a quote or place an order.
- Payment information processed securely through third-party providers (e.g., Stripe).
- Website usage data (cookies, analytics) to improve our services.

## How We Use Your Information

- To process orders and provide customer service.
- To send order confirmations, delivery updates, and warranty reminders.
- To share updates, promotions, or newsletters if you opt in.

## Sharing of Information
We only share your information with trusted partners (manufacturers, shipping providers, financing partners) as necessary to complete your transaction. We never sell your data.

## Data Security
We use industry-standard safeguards to protect your information.

## Your Rights
You may request access, correction, or deletion of your personal data at any time by contacting us at [insert email].

## Updates
This Privacy Policy may change from time to time. Updates will be posted here.`
}

function getDefaultTermsConditions() {
  return `By using this website, you agree to the following terms:

## Website Purpose
This site provides information about Firefly Tiny Homes, allows customization of models, and facilitates purchases.

## Intellectual Property
All photos, logos, text, and design belong to Firefly Tiny Homes and may not be copied without permission.

## Accuracy of Information
We strive for accuracy but do not guarantee that all pricing, options, or availability are error-free. Final contracts govern.

## User Conduct
You agree not to misuse the site (e.g., hacking, scraping, reverse-engineering).

## Links to Other Sites
We are not responsible for content or policies of external sites linked here.

## Limitation of Liability
Firefly Tiny Homes is not liable for damages from use of this website, including errors, downtime, or reliance on posted content.

## Governing Law
These terms are governed by the laws of Texas.`
}

function getDefaultOtherPolicies() {
  return `Additional policies and terms governing your purchase and delivery experience with Firefly Tiny Homes.

## Purchase Terms & Conditions

- Deposits are non-refundable.
- Final payment is due before the home leaves the factory.
- Prices may change if the manufacturer updates pricing.
- Freight and setup charges are estimates and may vary.
- Buyer is responsible for site readiness, permits, and insurance coverage once the home is complete.
- Storage fees of $50/day apply if delivery is delayed more than 12 days after completion.
- All modifications require a signed change order. No verbal promises are binding.
- Manufacturer warranties apply; dealer provides no additional warranty.
- Disputes are resolved by binding arbitration in Texas.

## Refund & Cancellation Policy

**Order Cancellations:**
- Orders may be canceled within 24 hours of placement for a full refund
- After 24 hours, a 25% cancellation fee applies
- Orders cannot be canceled once production has begun (typically 7-14 business days)

**Deposit Refunds:**
- Deposits are generally non-refundable once paid
- Exceptions may be made for extraordinary circumstances at our discretion
- Processing fees are non-refundable in all cases

**Change Orders:**
- Changes to specifications must be approved in writing
- Additional charges may apply for changes made after production begins
- Some changes may not be possible once manufacturing has commenced

## Delivery & Installation Policy

**Delivery Scheduling:**
- Delivery dates are estimates and may vary due to weather, manufacturing delays, or other factors
- Customer will receive 48-72 hours advance notice of delivery
- Delivery window is typically 8AM-5PM on scheduled day
- Customer or representative must be present for delivery

**Site Requirements:**
- Level, stable surface capable of supporting the home's weight
- Clear access path for delivery truck (minimum 12 feet wide, 14 feet high)
- All necessary permits obtained prior to delivery
- Utilities stubbed to delivery location (if applicable)

**Installation Services:**
- Professional setup available for additional fee
- Customer responsible for local permits and inspections
- Warranty begins upon delivery, not installation completion

## Consumer Rights & Disputes

**Right to Inspection:**
- Customer has 48 hours from delivery to report any damage or defects
- Inspection must be documented with photos and written notice
- Concealed defects covered under manufacturer warranty

**Dispute Resolution:**
- Good faith attempt to resolve disputes directly with company
- Binding arbitration required for unresolved disputes
- Arbitration conducted under Texas Arbitration Act
- Customer responsible for arbitration fees if claim deemed frivolous

**Limitation of Liability:**
- Company liability limited to original purchase price
- No liability for consequential or punitive damages
- Customer assumes all risks of use and operation

## Warranty Information

**Manufacturer Warranty:**
- Structural: 10 years from delivery date
- Electrical/Plumbing: 1 year from delivery date
- Appliances: Per manufacturer specifications
- Cosmetic items: 90 days from delivery date

**Warranty Exclusions:**
- Normal wear and tear
- Damage from misuse, neglect, or accidents
- Modifications not approved by manufacturer
- Damage from acts of nature or extreme weather

**Warranty Service:**
- Contact manufacturer directly for warranty claims
- Dealer facilitates communication but does not perform warranty work
- Customer responsible for service call fees if no defect found`
}

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
            <span>Delivery${build.pricing?.deliveryMiles ? ` (Approx. ${Math.round(build.pricing.deliveryMiles)} miles to factory)` : ''}</span>
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
  const { name, price, description, specs, features, packages, addOns, tourUrl } = body

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

  // 3D Tour URL
  if (typeof tourUrl === 'string') {
    $set.tourUrl = String(tourUrl).slice(0, 500)
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
  const auth = await requireAuth(req, res, false) // Allow any authenticated user for blog uploads
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

// ===== Payment Routes =====

// Test payment route
app.get(['/api/payments/test', '/payments/test'], (req, res) => {
  res.status(200).json({ success: true, message: 'Payment routes are working' })
})

// Setup ACH
app.post(['/api/payments/setup-ach', '/payments/setup-ach'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId } = req.body
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ 
        error: 'server_configuration_error',
        details: 'STRIPE_SECRET_KEY environment variable is missing' 
      })
    }

    const build = await getBuildById(buildId)
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Create or retrieve Stripe customer
    let customerId = build.customerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.user?.emailAddresses?.[0]?.emailAddress || `user+${auth.userId}@example.com`,
        metadata: {
          userId: auth.userId,
          buildId: buildId
        }
      })
      customerId = customer.id

      // Save customer ID to build
      const db = await getDb()
      await db.collection('builds').updateOne(
        { _id: build._id },
        { $set: { customerId } }
      )
    }

    // Create SetupIntent for ACH/bank account
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account', 'card'],
      usage: 'off_session',
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances']
          },
          verification_method: 'automatic'
        }
      },
      metadata: {
        buildId: buildId,
        userId: auth.userId
      }
    })

    res.status(200).json(setupIntent)
  } catch (error) {
    console.error('Setup ACH error:', error)
    res.status(500).json({ 
      error: 'setup_failed', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Save ACH Method
app.post(['/api/payments/save-ach-method', '/payments/save-ach-method'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, paymentMethodId, accountId, balanceCents, authAccepted } = req.body
    if (!buildId || !paymentMethodId) {
      return res.status(400).json({ error: 'Build ID and Payment Method ID are required' })
    }

    const build = await getBuildById(buildId)
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const db = await getDb()
    // Update build with payment method
    await db.collection('builds').updateOne(
      { _id: build._id },
      {
        $set: {
          'payment.method': 'ach_debit',
          'payment.paymentMethodId': paymentMethodId,
          'payment.accountId': accountId,
          'payment.balanceCents': balanceCents,
          'payment.authAccepted': authAccepted || false,
          'payment.ready': true,
          'payment.updatedAt': new Date()
        }
      }
    )

    // Also update the corresponding order if it exists
    await db.collection('orders').updateOne(
      { buildId: buildId },
      {
        $set: {
          'payment.method': 'ach_debit',
          'payment.paymentMethodId': paymentMethodId,
          'payment.accountId': accountId,
          'payment.balanceCents': balanceCents,
          'payment.authAccepted': authAccepted || false,
          'payment.ready': true,
          'payment.updatedAt': new Date()
        }
      }
    )

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Save ACH method error:', error)
    res.status(500).json({ error: 'save_failed', message: error.message })
  }
})

// Mark Payment Ready
app.post(['/api/payments/mark-ready', '/payments/mark-ready'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, plan, method, mandateAccepted, transferInstructions, transferConfirmed, transferReference } = req.body
    if (!buildId) {
      return res.status(400).json({ error: 'Build ID is required' })
    }

    const db = await getDb()
    const build = await getBuildById(buildId)
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Mark payment as ready, preserving existing auth status
    await db.collection('builds').updateOne(
      { _id: build._id },
      {
        $set: {
          'payment.ready': true,
          'payment.readyAt': new Date(),
          ...(plan && { 'payment.plan': plan }),
          ...(method && { 'payment.method': method }),
          ...(mandateAccepted !== undefined && { 'payment.mandateAccepted': mandateAccepted }),
          ...(transferInstructions && { 'payment.transferInstructions': transferInstructions }),
          ...(transferConfirmed !== undefined && { 'payment.transferConfirmed': transferConfirmed }),
          ...(transferReference && { 'payment.transferReference': transferReference })
        }
      }
    )

    // Also update the corresponding order if it exists
    await db.collection('orders').updateOne(
      { buildId: buildId },
      {
        $set: {
          'payment.ready': true,
          'payment.readyAt': new Date(),
          ...(plan && { 'payment.plan': plan }),
          ...(method && { 'payment.method': method }),
          ...(mandateAccepted !== undefined && { 'payment.mandateAccepted': mandateAccepted }),
          ...(transferInstructions && { 'payment.transferInstructions': transferInstructions }),
          ...(transferConfirmed !== undefined && { 'payment.transferConfirmed': transferConfirmed }),
          ...(transferReference && { 'payment.transferReference': transferReference })
        }
      }
    )

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Mark payment ready error:', error)
    res.status(500).json({ error: 'mark_ready_failed', message: error.message })
  }
})

// Update Payment Authorization Status
app.post(['/api/payments/update-auth-status', '/payments/update-auth-status'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, authAccepted } = req.body
    if (!buildId || authAccepted === undefined) {
      return res.status(400).json({ error: 'Build ID and auth status are required' })
    }

    const build = await getBuildById(buildId)
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const db = await getDb()
    
    // Update build with payment authorization status
    await db.collection('builds').updateOne(
      { _id: build._id },
      {
        $set: {
          'payment.authAccepted': authAccepted,
          'payment.updatedAt': new Date()
        }
      }
    )

    // Also update the corresponding order if it exists
    await db.collection('orders').updateOne(
      { buildId: buildId },
      {
        $set: {
          'payment.authAccepted': authAccepted,
          'payment.updatedAt': new Date()
        }
      }
    )

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Update payment auth status error:', error)
    res.status(500).json({ error: 'update_failed', message: error.message })
  }
})

// Provision Bank Transfer - UNIFIED IMPLEMENTATION
app.post(['/api/payments/provision-bank-transfer', '/payments/provision-bank-transfer'], async (req, res) => {
  console.log('[PROVISION-BANK-TRANSFER] Request received:', {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY
  })

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) {
      console.error('[PROVISION-BANK-TRANSFER] Authentication failed')
      return
    }

    const { buildId } = req.body
    if (!buildId) {
      console.error('[PROVISION-BANK-TRANSFER] Missing buildId')
      return res.status(400).json({ 
        error: 'validation_error', 
        message: 'Build ID is required' 
      })
    }

    console.log('[PROVISION-BANK-TRANSFER] Processing for build:', buildId, 'user:', auth.userId)

    const build = await getBuildById(buildId)
    if (!build) {
      console.error('[PROVISION-BANK-TRANSFER] Build not found:', buildId)
      return res.status(404).json({ 
        error: 'not_found', 
        message: 'Build not found' 
      })
    }

    if (build.userId !== auth.userId) {
      console.error('[PROVISION-BANK-TRANSFER] Access denied. Build userId:', build.userId, 'Request userId:', auth.userId)
      return res.status(403).json({ 
        error: 'access_denied', 
        message: 'Access denied' 
      })
    }

    // Check if bank transfer is already provisioned
    if (build.payment?.bankTransfer?.virtualAccountId) {
      console.log('[PROVISION-BANK-TRANSFER] Bank transfer already provisioned:', build.payment.bankTransfer.virtualAccountId)
      return res.status(200).json({
        success: true,
        virtualAccount: {
          id: build.payment.bankTransfer.virtualAccountId,
          referenceCode: build.payment.bankTransfer.referenceCode,
          instructions: build.payment.bankTransfer.instructions
        }
      })
    }

    // Get or create Stripe customer
    let customerId = build.customerId
    if (!customerId) {
      console.log('[PROVISION-BANK-TRANSFER] Creating new Stripe customer...')
      const customer = await stripe.customers.create({
        email: build.buyerInfo?.email,
        name: `${build.buyerInfo?.firstName} ${build.buyerInfo?.lastName}`,
        metadata: {
          buildId: buildId,
          userId: auth.userId
        }
      })
      customerId = customer.id
      
      // Update build with customer ID
      const db = await getDb()
      await db.collection('builds').updateOne(
        { _id: build._id },
        { $set: { customerId: customerId } }
      )
      console.log('[PROVISION-BANK-TRANSFER] Created and saved customer:', customerId)
    }

    // Generate unique reference code
    const referenceCode = `FF-${buildId.toString().slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    // Create virtual account details (in production, this would integrate with real banking APIs)
    const virtualAccount = {
      id: `va_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      referenceCode: referenceCode,
      instructions: {
        beneficiary: 'Firefly Tiny Homes',
        bankName: 'Stripe Treasury Bank',
        routingNumber: '011401533',
        accountNumber: '4000003947011000',
        referenceCode: referenceCode
      }
    }

    // Update build with bank transfer details
    const db = await getDb()
    await db.collection('builds').updateOne(
      { _id: build._id },
      { 
        $set: {
          'payment.method': 'bank_transfer',
          'payment.bankTransfer': {
            virtualAccountId: virtualAccount.id,
            referenceCode: referenceCode,
            instructions: virtualAccount.instructions,
            provisionedAt: new Date()
          }
        }
      }
    )

    console.log('[PROVISION-BANK-TRANSFER] Successfully provisioned bank transfer:', virtualAccount.id)

    res.status(200).json({
      success: true,
      virtualAccount: virtualAccount
    })

  } catch (error) {
    console.error('[PROVISION-BANK-TRANSFER] Error:', error)
    res.status(500).json({ 
      error: 'provision_failed', 
      message: 'Failed to provision bank transfer account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Collect at Confirmation
app.post(['/api/payments/collect-at-confirmation', '/payments/collect-at-confirmation'], async (req, res) => {
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, amount } = req.body
    if (!buildId || !amount) {
      return res.status(400).json({ error: 'Build ID and amount are required' })
    }

    const build = await getBuildById(buildId)
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // This would integrate with the payment processor to collect the payment
    // For now, we'll just mark it as collected
    const db = await getDb()
    await db.collection('builds').updateOne(
      { _id: build._id },
      {
        $set: {
          'payment.collected': true,
          'payment.collectedAt': new Date(),
          'payment.collectedAmount': amount
        }
      }
    )

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Collect payment error:', error)
    res.status(500).json({ error: 'collection_failed', message: error.message })
  }
})

// Setup Card Payment - UNIFIED IMPLEMENTATION
app.post(['/api/payments/setup-card', '/payments/setup-card'], async (req, res) => {
  console.log('[SETUP-CARD] Request received:', {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY
  })

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) {
      console.error('[SETUP-CARD] Authentication failed')
      return
    }

    const { buildId } = req.body
    if (!buildId) {
      console.error('[SETUP-CARD] Missing buildId')
      return res.status(400).json({ 
        error: 'validation_error', 
        message: 'Build ID is required' 
      })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[SETUP-CARD] Missing Stripe secret key')
      return res.status(500).json({ 
        error: 'server_configuration_error',
        message: 'Stripe not configured',
        details: 'STRIPE_SECRET_KEY environment variable is missing' 
      })
    }

    console.log('[SETUP-CARD] Setting up card payment for build:', buildId, 'user:', auth.userId)

    const build = await getBuildById(buildId)
    if (!build) {
      console.error('[SETUP-CARD] Build not found:', buildId)
      return res.status(404).json({ 
        error: 'not_found', 
        message: 'Build not found' 
      })
    }

    if (build.userId !== auth.userId) {
      console.error('[SETUP-CARD] Access denied. Build userId:', build.userId, 'Request userId:', auth.userId)
      return res.status(403).json({ 
        error: 'access_denied', 
        message: 'Access denied' 
      })
    }

    // Check if card payment is already set up
    if (build.payment?.paymentIntentId && build.payment?.method === 'card') {
      console.log('[SETUP-CARD] Card payment already set up:', build.payment.paymentIntentId)
      return res.status(200).json({
        success: true,
        clientSecret: build.payment.clientSecret,
        paymentIntentId: build.payment.paymentIntentId,
        amount: build.payment.amountCents,
        currency: 'usd'
      })
    }

    // Get or create Stripe customer
    let customerId = build.customerId
    if (!customerId) {
      console.log('[SETUP-CARD] Creating new Stripe customer...')
      const customer = await stripe.customers.create({
        email: build.buyerInfo?.email,
        name: `${build.buyerInfo?.firstName} ${build.buyerInfo?.lastName}`,
        metadata: {
          buildId: buildId,
          userId: auth.userId
        }
      })
      customerId = customer.id
      
      // Update build with customer ID
      const db = await getDb()
      await db.collection('builds').updateOne(
        { _id: build._id },
        { $set: { customerId: customerId } }
      )
      console.log('[SETUP-CARD] Created and saved customer:', customerId)
    }

    // Calculate payment amount
    const { calculateTotalPurchasePrice } = await import('../../src/utils/calculateTotal.js')
    const totalAmount = calculateTotalPurchasePrice(build)
    const totalCents = Math.round(totalAmount * 100)
    
    // Get payment plan from build or default to deposit
    const paymentPlan = build.payment?.plan || { type: 'deposit', percent: 25 }
    const depositCents = Math.round(totalCents * ((paymentPlan.percent || 25) / 100))
    const currentAmountCents = paymentPlan.type === 'deposit' ? depositCents : totalCents

    console.log('[SETUP-CARD] Payment calculation:', {
      totalAmount,
      totalCents,
      depositCents,
      currentAmountCents,
      paymentPlanType: paymentPlan.type
    })

    // Create PaymentIntent for card payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: currentAmountCents,
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        buildId: buildId,
        userId: auth.userId,
        paymentPlan: paymentPlan.type,
        paymentMethod: 'card'
      },
      description: `Firefly Tiny Home - ${build.modelName || 'Custom Build'} - ${paymentPlan.type === 'deposit' ? 'Deposit' : 'Full Payment'}`
    })

    console.log('[SETUP-CARD] Created PaymentIntent:', paymentIntent.id)

    // Update build with payment intent
    const db = await getDb()
    await db.collection('builds').updateOne(
      { _id: build._id },
      { 
        $set: {
          'payment.method': 'card',
          'payment.paymentIntentId': paymentIntent.id,
          'payment.clientSecret': paymentIntent.client_secret,
          'payment.plan': paymentPlan,
          'payment.amountCents': currentAmountCents,
          'payment.status': 'setup_complete',
          'payment.setupAt': new Date()
        }
      }
    )

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: currentAmountCents,
      currency: 'usd'
    })

  } catch (error) {
    console.error('[SETUP-CARD] Error:', error)
    res.status(500).json({ 
      error: 'setup_failed', 
      message: 'Failed to setup card payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Process Card Payment - UNIFIED IMPLEMENTATION
app.post(['/api/payments/process-card', '/payments/process-card'], async (req, res) => {
  console.log('[PROCESS-CARD] Request received:', {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : []
  })

  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) {
      console.error('[PROCESS-CARD] Authentication failed')
      return
    }

    const { buildId, paymentIntentId } = req.body
    if (!buildId || !paymentIntentId) {
      console.error('[PROCESS-CARD] Missing required parameters')
      return res.status(400).json({ 
        error: 'validation_error', 
        message: 'Build ID and Payment Intent ID are required' 
      })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[PROCESS-CARD] Missing Stripe secret key')
      return res.status(500).json({ 
        error: 'server_configuration_error',
        message: 'Stripe not configured',
        details: 'STRIPE_SECRET_KEY environment variable is missing' 
      })
    }

    console.log('[PROCESS-CARD] Processing card payment for build:', buildId, 'paymentIntent:', paymentIntentId)

    const build = await getBuildById(buildId)
    if (!build) {
      console.error('[PROCESS-CARD] Build not found:', buildId)
      return res.status(404).json({ 
        error: 'not_found', 
        message: 'Build not found' 
      })
    }

    if (build.userId !== auth.userId) {
      console.error('[PROCESS-CARD] Access denied. Build userId:', build.userId, 'Request userId:', auth.userId)
      return res.status(403).json({ 
        error: 'access_denied', 
        message: 'Access denied' 
      })
    }

    // Verify the payment intent belongs to this build
    if (build.payment?.paymentIntentId !== paymentIntentId) {
      console.error('[PROCESS-CARD] Invalid payment intent for build. Expected:', build.payment?.paymentIntentId, 'Received:', paymentIntentId)
      return res.status(400).json({ 
        error: 'validation_error', 
        message: 'Invalid payment intent for this build' 
      })
    }

    // Retrieve the payment intent to check its current status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    console.log('[PROCESS-CARD] Payment intent status:', paymentIntent.status)
    
    if (paymentIntent.status === 'succeeded') {
      console.log('[PROCESS-CARD] Payment already succeeded:', paymentIntentId)
      
      // Update build with success status
      const db = await getDb()
      await db.collection('builds').updateOne(
        { _id: build._id },
        { 
          $set: {
            'payment.status': 'succeeded',
            'payment.processedAt': new Date(),
            'payment.transactionId': paymentIntent.latest_charge
          }
        }
      )

      return res.status(200).json({
        success: true,
        status: 'succeeded',
        message: 'Payment already processed successfully'
      })
    }

    if (paymentIntent.status === 'requires_confirmation') {
      console.log('[PROCESS-CARD] Confirming payment intent...')
      // Confirm the payment intent
      const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId)
      
      if (confirmedIntent.status === 'succeeded') {
        console.log('[PROCESS-CARD] Payment confirmed successfully:', paymentIntentId)
        
        // Update build with success status
        const db = await getDb()
        await db.collection('builds').updateOne(
          { _id: build._id },
          { 
            $set: {
              'payment.status': 'succeeded',
              'payment.processedAt': new Date(),
              'payment.transactionId': confirmedIntent.latest_charge
            }
          }
        )

        return res.status(200).json({
          success: true,
          status: 'succeeded',
          message: 'Payment processed successfully'
        })
      } else if (confirmedIntent.status === 'requires_action') {
        console.log('[PROCESS-CARD] Payment requires additional action:', confirmedIntent.status)
        
        return res.status(200).json({
          success: false,
          status: 'requires_action',
          clientSecret: confirmedIntent.client_secret,
          message: 'Additional authentication required'
        })
      } else {
        console.error('[PROCESS-CARD] Payment confirmation failed:', confirmedIntent.status)
        
        return res.status(400).json({
          success: false,
          status: confirmedIntent.status,
          message: 'Payment confirmation failed',
          error: confirmedIntent.last_payment_error?.message || 'Unknown error'
        })
      }
    } else {
      console.error('[PROCESS-CARD] Payment intent in unexpected state:', paymentIntent.status)
      
      return res.status(400).json({
        success: false,
        status: paymentIntent.status,
        message: 'Payment intent is not ready for processing',
        error: paymentIntent.last_payment_error?.message || 'Invalid payment intent state'
      })
    }

  } catch (error) {
    console.error('[PROCESS-CARD] Error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: 'card_error',
        message: error.message,
        code: error.code
      })
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: error.message
      })
    }
    
    res.status(500).json({ 
      success: false,
      error: 'processing_failed',
      message: 'Failed to process card payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// ============================================================================
// CREDIT CARD PAYMENT ROUTES (NEW)
// ============================================================================

// Verify credit card and create payment method
app.post(['/api/payments/verify-card', '/payments/verify-card'], async (req, res) => {
  await applyCors(req, res)
  
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { 
      buildId, 
      paymentMethodId, 
      cardholderName, 
      billingAddress 
    } = req.body

    if (!buildId || !paymentMethodId || !cardholderName) {
      return res.status(400).json({ error: 'Build ID, payment method ID, and cardholder name are required' })
    }

    // Validate billing address
    const addressFields = ['street', 'city', 'state', 'zip']
    for (const field of addressFields) {
      if (!billingAddress?.[field]?.trim()) {
        return res.status(400).json({ 
          error: `Billing address ${field} is required`,
          field: `billingAddress.${field}`
        })
      }
    }

    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get or create Stripe customer
    let customerId = build.customerId
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: build.buyerInfo?.email,
        name: cardholderName,
        address: {
          line1: billingAddress.street,
          city: billingAddress.city,
          state: billingAddress.state,
          postal_code: billingAddress.zip,
          country: 'US'
        },
        metadata: {
          buildId: String(buildId),
          userId: auth.userId
        }
      })
      customerId = customer.id

      // Update build with customer ID
      const db = await getDb()
      await db.collection('builds').updateOne(
        { _id: new ObjectId(String(buildId)) },
        { $set: { customerId: customerId } }
      )
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    })

    // Verify the payment method with a $0 setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        buildId: String(buildId),
        userId: auth.userId,
        verification: 'true'
      }
    })

    if (setupIntent.status !== 'succeeded') {
      // Handle cases where additional action is required
      if (setupIntent.status === 'requires_action') {
        return res.status(200).json({
          success: false,
          requiresAction: true,
          clientSecret: setupIntent.client_secret,
          message: 'Additional authentication required'
        })
      } else {
        throw new Error('Card verification failed')
      }
    }

    // Get payment method details for response
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    res.status(200).json({
      success: true,
      message: 'Card verified successfully',
      paymentMethod: {
        id: paymentMethod.id,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year
      },
      setupIntentId: setupIntent.id
    })

  } catch (error) {
    console.error('Card verification error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: error.message,
        code: error.code
      })
    }
    
    res.status(500).json({ 
      error: 'Failed to verify card',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Save credit card payment method and authorization
app.post(['/api/payments/save-card-method', '/payments/save-card-method'], async (req, res) => {
  await applyCors(req, res)
  
  console.log('🔵 Save card method API called:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  })
  
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) {
      console.log('❌ No auth found')
      return
    }
    
    console.log('✅ Auth successful:', auth.userId)

    const { 
      buildId, 
      paymentMethodId, 
      paymentPlan, 
      cardholderName, 
      billingAddress, 
      cardDetails,
      authorizations 
    } = req.body

    if (!buildId || !paymentMethodId || !paymentPlan || !cardholderName) {
      return res.status(400).json({ error: 'Build ID, payment method ID, payment plan, and cardholder name are required' })
    }

    // Validate authorizations
    if (!authorizations?.chargeAuthorization || !authorizations?.nonRefundable || !authorizations?.highValueTransaction) {
      return res.status(400).json({ error: 'All required authorizations must be acknowledged' })
    }

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
    const { calculateTotalPurchasePrice } = await import('../src/utils/calculateTotal.js')
    const settings = await getOrgSettings()
    
    const totalAmount = calculateTotalPurchasePrice(build, settings)
    const totalCents = Math.round(totalAmount * 100)
    const depositPercent = paymentPlan.percent || settings.pricing?.deposit_percent || 25
    const depositCents = Math.round(totalCents * (depositPercent / 100))

    // Update build with credit card payment information
    const updateData = {
      'payment.method': 'card',
      'payment.plan': paymentPlan,
      'payment.ready': true,
      'payment.status': 'pending_contract',
      'payment.card': {
        paymentMethodId: paymentMethodId,
        cardholderName: cardholderName,
        billingAddress: billingAddress,
        cardDetails: {
          brand: cardDetails.brand,
          last4: cardDetails.last4,
          exp_month: cardDetails.exp_month,
          exp_year: cardDetails.exp_year
        },
        authorizations: authorizations,
        verifiedAt: now
      },
      'payment.amounts': {
        total: totalCents,
        deposit: depositCents,
        final: totalCents - depositCents
      },
      'payment.updatedAt': now
    }

    console.log('🔄 Updating build with payment data:', {
      buildId,
      updateData
    })
    
    const updateResult = await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
      { $set: updateData }
    )
    
    console.log('✅ Database update result:', updateResult)

    const response = {
      success: true,
      message: 'Credit card payment method saved successfully',
      paymentPlan: paymentPlan,
      amounts: {
        total: totalCents,
        deposit: depositCents,
        final: totalCents - depositCents
      }
    }
    
    console.log('📤 Sending response:', response)
    res.status(200).json(response)

  } catch (error) {
    console.error('❌ Save card method error:', error)
    const errorResponse = { 
      error: 'Failed to save payment method',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
    console.log('📤 Sending error response:', errorResponse)
    res.status(500).json(errorResponse)
  }
})

// Process credit card payment for specific milestone
app.post(['/api/payments/process-card-payment', '/payments/process-card-payment'], async (req, res) => {
  await applyCors(req, res)
  
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, milestone } = req.body

    if (!buildId || !milestone) {
      return res.status(400).json({ error: 'Build ID and milestone are required' })
    }

    // Validate milestone
    if (!['deposit', 'final', 'full'].includes(milestone)) {
      return res.status(400).json({ error: 'Invalid milestone' })
    }

    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check if contract is signed (required for post-contract payments)
    if (!build.contract?.signed) {
      return res.status(400).json({ 
        error: 'Contract must be signed before processing payment',
        phase: 'pre_contract'
      })
    }

    // Check if payment method is card and has required data
    if (build.payment?.method !== 'card' || !build.payment?.card?.paymentMethodId) {
      return res.status(400).json({ error: 'Credit card payment method not found' })
    }

    const cardPayment = build.payment.card
    const paymentPlan = build.payment.plan

    // Determine payment amount based on milestone
    let amount
    if (milestone === 'deposit') {
      amount = build.payment.amounts?.deposit || 0
    } else if (milestone === 'final') {
      amount = build.payment.amounts?.final || 0
    } else if (milestone === 'full') {
      amount = build.payment.amounts?.total || 0
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' })
    }

    // Check if this milestone has already been paid
    const db = await getDb()
    const paymentKey = `payment.${milestone}Paid`
    const existingPayment = await db.collection('builds').findOne({
      _id: new ObjectId(String(buildId)),
      [paymentKey]: true
    })

    if (existingPayment) {
      return res.status(400).json({ error: `${milestone} payment has already been processed` })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      customer: build.customerId,
      payment_method: cardPayment.paymentMethodId,
      confirm: true,
      off_session: true, // Indicates this is for a saved payment method
      metadata: {
        buildId: String(buildId),
        userId: auth.userId,
        milestone: milestone,
        paymentPlan: paymentPlan.type
      }
    })

    // Handle payment intent status
    if (paymentIntent.status === 'succeeded') {
      // Update build with payment success
      const updateFields = {
        [`payment.${milestone}Paid`]: true,
        [`payment.${milestone}PaidAt`]: new Date(),
        'payment.lastPaymentAt': new Date(),
        'payment.updatedAt': new Date()
      }

      // Check if all required payments are complete
      let allPaid = false
      if (paymentPlan.type === 'deposit') {
        if (milestone === 'deposit') {
          allPaid = false // Still need final payment
        } else if (milestone === 'final') {
          // Check if deposit was already paid
          allPaid = build.payment.depositPaid === true
        }
      } else if (paymentPlan.type === 'full') {
        allPaid = milestone === 'full'
      }

      if (allPaid) {
        updateFields['payment.status'] = 'fully_paid'
        updateFields['payment.fullyPaidAt'] = new Date()
      }

      await db.collection('builds').updateOne(
        { _id: new ObjectId(String(buildId)) },
        { $set: updateFields }
      )

      res.status(200).json({
        success: true,
        status: 'succeeded',
        paymentIntentId: paymentIntent.id,
        milestone: milestone,
        amount: amount,
        allPaid: allPaid,
        message: `${milestone} payment processed successfully`
      })

    } else if (paymentIntent.status === 'requires_action') {
      // 3D Secure or other authentication required
      res.status(200).json({
        success: false,
        status: 'requires_action',
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        message: 'Additional authentication required'
      })

    } else {
      // Payment failed
      throw new Error(`Payment failed with status: ${paymentIntent.status}`)
    }

  } catch (error) {
    console.error('Process card payment error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: error.message,
        code: error.code,
        decline_code: error.decline_code
      })
    }
    
    res.status(500).json({ 
      error: 'Failed to process payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// ============================================================================
// BANK TRANSFER PAYMENT ROUTES
// ============================================================================

// Create bank transfer payment intents
app.post(['/api/payments/bank-transfer-intents', '/payments/bank-transfer-intents'], async (req, res) => {
  await applyCors(req, res)
  
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

    // For deposit plans, validate storage fees commitment
    if (paymentPlan.type === 'deposit' && !commitments?.storageFeesAcknowledged) {
      return res.status(400).json({ error: 'Storage fees commitment must be acknowledged for deposit plans' })
    }

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
    const { calculateTotalPurchasePrice } = await import('../src/utils/calculateTotal.js')
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
        buildId: new ObjectId(String(buildId)),
        userId: auth.userId,
        milestone: 'deposit',
        expectedAmount: depositCents,
        status: 'pending_contract',
        payerInfo: payerInfo,
        commitments: commitments,
        createdAt: now,
        updatedAt: now
      })
      
      // Create final payment intent
      intents.push({
        buildId: new ObjectId(String(buildId)),
        userId: auth.userId,
        milestone: 'final',
        expectedAmount: totalCents - depositCents,
        status: 'pending_contract',
        payerInfo: payerInfo,
        commitments: commitments,
        createdAt: now,
        updatedAt: now
      })
    } else {
      // Create single full payment intent
      intents.push({
        buildId: new ObjectId(String(buildId)),
        userId: auth.userId,
        milestone: 'full',
        expectedAmount: totalCents,
        status: 'pending_contract',
        payerInfo: payerInfo,
        commitments: commitments,
        createdAt: now,
        updatedAt: now
      })
    }

    // Insert intents into database
    const result = await db.collection('bankTransferIntents').insertMany(intents)

    // Update build with bank transfer payment information
    const updateData = {
      'payment.method': 'bank_transfer',
      'payment.plan': paymentPlan,
      'payment.ready': true,
      'payment.status': 'pending_contract',
      'payment.bankTransfer': {
        payerInfo: payerInfo,
        commitments: commitments,
        intents: result.insertedIds
      },
      'payment.amounts': {
        total: totalCents,
        deposit: depositCents,
        final: totalCents - depositCents
      },
      'payment.updatedAt': now
    }

    await db.collection('builds').updateOne(
      { _id: new ObjectId(String(buildId)) },
      { $set: updateData }
    )

    res.status(200).json({
      success: true,
      message: 'Bank transfer intents created successfully',
      intents: intents.map((intent, index) => ({
        id: result.insertedIds[index],
        milestone: intent.milestone,
        expectedAmount: intent.expectedAmount
      })),
      paymentPlan: paymentPlan,
      amounts: {
        total: totalCents,
        deposit: depositCents,
        final: totalCents - depositCents
      }
    })

  } catch (error) {
    console.error('Bank transfer intents error:', error)
    res.status(500).json({ 
      error: 'Failed to create bank transfer intents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Get bank transfer instructions for a specific milestone
app.get(['/api/payments/bank-transfer-instructions', '/payments/bank-transfer-instructions'], async (req, res) => {
  await applyCors(req, res)
  
  try {
    const auth = await requireAuth(req, res, false)
    if (!auth?.userId) return

    const { buildId, milestone } = req.query

    if (!buildId || !milestone) {
      return res.status(400).json({ error: 'Build ID and milestone are required' })
    }

    const build = await getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }

    if (build.userId !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const db = await getDb()

    // Find the bank transfer intent for this milestone
    const intent = await db.collection('bankTransferIntents').findOne({
      buildId: new ObjectId(String(buildId)),
      milestone: milestone,
      userId: auth.userId
    })

    if (!intent) {
      return res.status(404).json({ error: 'Bank transfer intent not found' })
    }

    // If no Stripe invoice ID, create one
    if (!intent.stripeInvoiceId) {
      // Create Stripe invoice for bank transfer
      const invoice = await stripe.invoices.create({
        customer: build.customerId || undefined,
        collection_method: 'send_invoice',
        days_until_due: 30,
        metadata: {
          buildId: String(buildId),
          userId: auth.userId,
          milestone: milestone,
          intentId: String(intent._id)
        }
      })

      // Create invoice item
      await stripe.invoiceItems.create({
        customer: invoice.customer,
        invoice: invoice.id,
        amount: intent.expectedAmount,
        currency: 'usd',
        description: `${milestone === 'deposit' ? 'Deposit' : milestone === 'final' ? 'Final Payment' : 'Full Payment'} - Tiny Home Build`
      })

      // Send the invoice
      await stripe.invoices.sendInvoice(invoice.id)

      // Update intent with Stripe invoice ID and status
      await db.collection('bankTransferIntents').updateOne(
        { _id: intent._id },
        { 
          $set: { 
            stripeInvoiceId: invoice.id,
            status: 'awaiting_funds',
            updatedAt: new Date()
          }
        }
      )

      intent.stripeInvoiceId = invoice.id
    }

    // Generate unique bank details (this would typically come from your bank/payment processor)
    const bankDetails = {
      recipientName: 'Firefly Tiny Homes LLC',
      bankName: 'Example Bank',
      routingNumber: '123456789',
      accountNumber: `4000000000${String(intent._id).slice(-6)}`, // Unique account per intent
      referenceCode: `FTH-${String(intent._id).slice(-8).toUpperCase()}`
    }

    // Construct instructions
    const instructions = {
      amount: intent.expectedAmount,
      bankDetails: bankDetails,
      instructions: {
        achCredit: 'ACH Credit typically posts in 1–2 business days.',
        wire: 'Wires can arrive same-day before your bank\'s cutoff; bank fees may apply.',
        clearing: 'Funds must clear before release.',
        storageReminder: milestone === 'final' ? 'Delivery must occur within 12 days after completion; storage charges apply thereafter and must be paid prior to shipment.' : null
      }
    }

    res.status(200).json({
      success: true,
      instructions: instructions,
      milestone: milestone,
      status: intent.status
    })

  } catch (error) {
    console.error('Bank transfer instructions error:', error)
    res.status(500).json({ 
      error: 'Failed to get bank transfer instructions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// ============================================================================
// BUILD STATUS ROUTES
// ============================================================================

// Update build status
app.patch(['/api/builds/update-status', '/builds/update-status'], async (req, res) => {
  await applyCors(req, res)
  
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
          buildId: new ObjectId(String(buildId)),
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
})

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Import and mount admin router (ESM/CJS interop safe)
import adminRouterModule from './admin/index.js'

function resolveRouter(mod, name) {
  const candidate = (typeof mod === 'function') ? mod : (typeof mod?.default === 'function' ? mod.default : null)
  if (!candidate) {
    console.error(`[API] Failed to resolve ${name} router:`, { type: typeof mod, hasDefault: !!mod?.default })
  }
  return candidate
}

const adminRouter = resolveRouter(adminRouterModule, 'admin')
if (adminRouter) {
  app.use('/api/admin', adminRouter)
} else {
  // Provide a diagnostic fallback to avoid Express attempting to call undefined.apply
  app.use('/api/admin', (req, res) => {
    res.status(500).json({ error: 'admin router misconfigured' })
  })
}



// Fallback to JSON 404 to avoid hanging requests
app.use((req, res) => {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] 404', { method: req.method, url: req.url })
  res.status(404).json({ error: 'not_found', url: req.url })
})

// Initialize admin database collections and indexes
initializeAdminDatabase().catch(err => {
  console.error('Failed to initialize admin database:', err)
})



// Vercel Node.js functions expect (req, res). Call Express directly.
export default (req, res) => app(req, res)
