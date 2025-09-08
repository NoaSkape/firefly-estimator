/**
 * Unified DocuSeal API Client
 * Standardized client with correct endpoints and headers
 */

const BASE = process.env.DOCUSEAL_BASE_URL || "https://api.docuseal.co"
const API_KEY = process.env.DOCUSEAL_API_KEY

if (!API_KEY) {
  throw new Error('DOCUSEAL_API_KEY environment variable is required')
}

function hdr(json = true) {
  return {
    "X-Auth-Token": API_KEY,
    ...(json ? { "Content-Type": "application/json", "Accept": "application/json" } : {}),
  }
}

// For HTML/DOCX source (preferred)
export async function dsCreateTemplateFromHtmlDocx(body) {
  console.info("[DocuSeal] Creating template from HTML/DOCX:", body.name)
  
  const res = await fetch(`${DOCUSEAL_BASE}/templates/docx`, {
    method: "POST",
    headers: hdr(true),
    body: JSON.stringify(body),
  })
  
  const text = await res.text()
  
  if (!res.ok) {
    console.error("[DocuSeal] Create failed", body.name, res.status, text)
    throw new Error(`DocuSeal /templates/docx ${res.status}: ${text}`)
  }
  
  const data = JSON.parse(text)
  const templateId = data.id
  
  console.info("[DocuSeal] Created template", body.name, templateId)
  return templateId
}

// For PDF (base64) source
export async function dsCreateTemplateFromPdf(body) {
  console.info("[DocuSeal] Creating template from PDF:", body.name)
  
  const res = await fetch(`${DOCUSEAL_BASE}/templates`, {
    method: "POST",
    headers: hdr(true),
    body: JSON.stringify(body),
  })
  
  const text = await res.text()
  
  if (!res.ok) {
    console.error("[DocuSeal] Create failed", body.name, res.status, text)
    throw new Error(`DocuSeal /templates ${res.status}: ${text}`)
  }
  
  const data = JSON.parse(text)
  const templateId = data.id
  
  console.info("[DocuSeal] Created template", body.name, templateId)
  return templateId
}

// Legacy functions for backward compatibility (deprecated)
export async function createTemplateByDocx(body) {
  console.warn("[DocuSeal] createTemplateByDocx is deprecated, use dsCreateTemplateFromHtmlDocx")
  return dsCreateTemplateFromHtmlDocx(body)
}

/**
 * Legacy PDF-based template creation (keeping for backward compatibility)
 * @param {Object} params - Template creation parameters
 * @param {string} params.name - Template name
 * @param {Array} params.roles - Array of role objects with name and optional flag
 * @param {Array} params.fields - Array of field definitions
 * @param {string} params.pdfBase64 - Base64 encoded PDF content
 * @returns {Promise<string>} Template ID
 */
export async function createTemplateByPdf(params) {
  const { name, roles, fields, pdfBase64 } = params

  console.log('[DOCUSEAL_CLIENT] Creating template:', name)
  console.log('[DOCUSEAL_CLIENT] Roles:', roles.length)
  console.log('[DOCUSEAL_CLIENT] Fields:', fields.length)
  console.log('[DOCUSEAL_CLIENT] PDF size:', Math.round(pdfBase64.length / 1024), 'KB')

  const response = await fetch(`${BASE}/templates`, {
    method: "POST",
    headers: {
      'X-Auth-Token': API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      submitters: roles.map(role => ({
        name: role.name,
        is_optional: role.optional || false
      })),
      documents: [{ 
        name: "agreement.pdf", 
        file: pdfBase64 
      }],
      fields: fields.map(field => ({
        name: field.name || `${field.type}_${field.role}`,
        type: field.type,
        role: field.role,
        required: field.required !== false,
        ...(field.anchor_text && { 
          areas: [{ 
            // DocuSeal will auto-place based on anchor text search
            attachment_uuid: "{{DOCUMENT_UUID}}", // Will be replaced by DocuSeal
            x: 0, y: 0, w: 100, h: 20, page: 1,
            option: field.anchor_text
          }]
        }),
        ...(field.multiple && { multiple: true })
      }))
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[DOCUSEAL_CLIENT] Error response:', errorText)
    throw new Error(`DocuSeal createTemplate failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  console.log('[DOCUSEAL_CLIENT] Template created successfully:', data.id)
  
  return data.id || data.template?.id
}

/**
 * Create a signing session envelope for a specific contract pack
 * @param {string} orderId - Order ID
 * @param {string} pack - Pack type (agreement, delivery, final)
 * @param {Object} order - Order data for prefilling
 * @returns {Promise<Object>} Envelope with signing URL
 */
export async function createPackEnvelope(orderId, pack, order) {
  console.log('[DOCUSEAL_CLIENT] Creating envelope for pack:', pack, 'order:', orderId)

  // Get template ID based on pack type
  const templateIds = {
    agreement: process.env.DOCUSEAL_TEMPLATE_ID_AGREEMENT,
    delivery: process.env.DOCUSEAL_TEMPLATE_ID_DELIVERY,
    final: process.env.DOCUSEAL_TEMPLATE_ID_FINAL
  }

  const templateId = templateIds[pack]
  if (!templateId) {
    throw new Error(`No template ID configured for pack: ${pack}`)
  }

  console.log('[DOCUSEAL_CLIENT] Using template ID:', templateId)

  // Create submission
  const response = await fetch(`${BASE}/submissions`, {
    method: "POST",
    headers: {
      'X-Auth-Token': API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      send_email: false, // We'll handle our own notifications
      submitters: [
        {
          name: order.buyer.firstName + ' ' + order.buyer.lastName,
          email: order.buyer.email,
          role: 'Buyer'
        },
        // Add co-buyer if present
        ...(order.buyer.coFirstName ? [{
          name: order.buyer.coFirstName + ' ' + order.buyer.coLastName,
          email: order.buyer.coEmail || order.buyer.email,
          role: 'Co-Buyer'
        }] : []),
        {
          name: 'Firefly Tiny Homes',
          email: process.env.DOCUSEAL_FIREFLY_EMAIL || 'office@fireflytinyhomes.com',
          role: 'Firefly'
        }
      ],
      fields: buildPackFields(pack, order)
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[DOCUSEAL_CLIENT] Failed to create submission:', response.status, error)
    throw new Error(`Failed to create DocuSeal submission: ${response.status}`)
  }

  const data = await response.json()
  console.log('[DOCUSEAL_CLIENT] Raw DocuSeal response:', JSON.stringify(data, null, 2))

  if (!data) {
    throw new Error('DocuSeal API returned empty response')
  }

  // Handle DocuSeal's actual response format
  let signingUrl = ''
  let envelopeId = ''
  let submitters = []

  // DocuSeal returns an array of submitters directly
  if (Array.isArray(data)) {
    submitters = data
    // Get envelope ID from first submitter
    envelopeId = data[0]?.submission_id || data[0]?.id
  } 
  // Fallback: if it's an object with submitters property
  else if (data.submitters && Array.isArray(data.submitters)) {
    submitters = data.submitters
    envelopeId = data.id || data.submission_id
  }
  // Single submitter object
  else if (data.id && data.role) {
    submitters = [data]
    envelopeId = data.submission_id || data.id
  }

  console.log('[DOCUSEAL_CLIENT] Parsed submitters:', submitters.length)

  // Find buyer submitter and get their signing URL
  const buyerSubmission = submitters.find(s => 
    s.role === 'buyer' || s.role === 'Buyer'
  )

  if (buyerSubmission) {
    // DocuSeal uses 'embed_src' for the signing URL
    signingUrl = buyerSubmission.embed_src || 
                 buyerSubmission.url || 
                 buyerSubmission.signing_url
    console.log('[DOCUSEAL_CLIENT] Found buyer submission:', buyerSubmission.id, 'URL:', signingUrl)
  }

  if (!signingUrl) {
    console.error('[DOCUSEAL_CLIENT] No signing URL found. Submitters:', submitters)
    throw new Error('No buyer signing URL found in DocuSeal response')
  }

  console.log('[DOCUSEAL_CLIENT] Submission created successfully:', envelopeId, 'Signing URL:', signingUrl)
  
  return {
    envelopeId,
    signingUrl,
    status: submitters[0]?.status || 'awaiting'
  }
}

/**
 * Build form fields for prefilling based on pack type
 */
function buildPackFields(pack, order) {
  const baseFields = {
    // Buyer information
    buyer_name: order.buyer.firstName + ' ' + order.buyer.lastName,
    buyer_email: order.buyer.email,
    buyer_phone: order.buyer.phone,
    buyer_address: formatAddress(order.deliveryAddress),
    
    // Model information
    model_name: order.model.brand + ' ' + order.model.model,
    model_year: order.model.year,
    model_dimensions: order.model.dimensions,
    
    // Pricing
    base_price: formatCurrency(order.pricing.base),
    options_price: formatCurrency(order.pricing.options),
    tax_amount: formatCurrency(order.pricing.tax),
    total_price: formatCurrency(order.pricing.total),
    
    // Order details
    order_id: order.id,
    order_date: new Date().toLocaleDateString()
  }

  // Add co-buyer fields if present
  if (order.buyer.coFirstName) {
    baseFields.cobuyer_name = order.buyer.coFirstName + ' ' + order.buyer.coLastName
    baseFields.cobuyer_email = order.buyer.coEmail || order.buyer.email
  }

  // Add pack-specific fields
  if (pack === 'agreement') {
    return {
      ...baseFields,
      // Agreement-specific fields
      financing_method: order.paymentMethod || 'cash',
      delivery_fee: formatCurrency(order.pricing.delivery || 0),
      setup_fee: formatCurrency(order.pricing.setup || 0)
    }
  }

  if (pack === 'delivery') {
    return {
      ...baseFields,
      // Delivery-specific fields
      delivery_address: formatAddress(order.deliveryAddress),
      delivery_notes: order.deliveryNotes || ''
    }
  }

  if (pack === 'final') {
    return {
      ...baseFields,
      // Final acknowledgment fields
      completion_date: new Date().toLocaleDateString()
    }
  }

  return baseFields
}

/**
 * Format address for display
 */
function formatAddress(address) {
  if (!address) return ''
  
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean)
  
  return parts.join(', ')
}

/**
 * Format currency amount
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number') return '$0'
  return '$' + (amount / 100).toLocaleString()
}
