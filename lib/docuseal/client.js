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

// Create template from HTML - the CORRECT approach for HTML content
export async function dsCreateTemplateFromHtml(body) {
  console.info("[DocuSeal] Creating template from HTML:", body.name)
  
  const res = await fetch(`${BASE}/templates/html`, {
    method: "POST",
    headers: hdr(true),
    body: JSON.stringify(body),
  })
  
  const text = await res.text()
  
  if (!res.ok) {
    console.error("[DocuSeal] HTML template creation failed:", res.status, text)
    throw new Error(`DocuSeal API error: ${res.status} - ${text}`)
  }
  
  const data = JSON.parse(text)
  const templateId = data.id
  
  console.info("[DocuSeal] HTML template created successfully with ID:", templateId)
  return templateId
}

// Legacy DOCX endpoint (deprecated for HTML content) 
export async function dsCreateTemplateFromHtmlDocx(body) {
  console.warn("[DocuSeal] dsCreateTemplateFromHtmlDocx is deprecated for HTML content, redirecting to HTML endpoint")
  
  // Transform the body from DOCX format to HTML format
  if (body.documents && body.documents[0] && body.documents[0].file) {
    const htmlBody = {
      name: body.name,
      html: body.documents[0].file,
      external_id: body.external_id,
      folder_name: body.folder_name,
      shared_link: body.shared_link
    }
    return dsCreateTemplateFromHtml(htmlBody)
  }
  
  throw new Error("Invalid DOCX body format for HTML conversion")
}

// For PDF (base64) source
export async function dsCreateTemplateFromPdf(body) {
  console.info("[DocuSeal] Creating template from PDF:", body.name)
  
  const res = await fetch(`${BASE}/templates`, {
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
  
  // Debug: log the fields being sent
  const fieldsData = buildPackFields(pack, order)
  console.log('[DOCUSEAL_CLIENT] Fields being sent to DocuSeal:', Object.keys(fieldsData))
  console.log('[DOCUSEAL_CLIENT] Sample field values:', {
    buyer_full_name: fieldsData.buyer_full_name,
    model_brand: fieldsData.model_brand,
    price_base: fieldsData.price_base
  })

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
          role: 'buyer'
        },
        // Add co-buyer if present
        ...(order.coBuyer ? [{
          name: order.coBuyer.firstName + ' ' + order.coBuyer.lastName,
          email: order.coBuyer.email || order.buyer.email,
          role: 'cobuyer'
        }] : []),
        {
          name: 'Firefly Tiny Homes',
          email: process.env.DOCUSEAL_FIREFLY_EMAIL || 'office@fireflytinyhomes.com',
          role: 'firefly_signer'
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
    s.role === 'buyer'
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
  // Use the EXACT field names that the template expects
  const baseFields = {
    // Buyer information - must match template placeholders exactly
    buyer_full_name: order.buyer.firstName + ' ' + order.buyer.lastName,
    buyer_email: order.buyer.email,
    buyer_phone: order.buyer.phone,
    buyer_address: formatAddress(order.deliveryAddress),
    
    // Model information - must match template placeholders exactly
    model_brand: order.model.brand,
    model_code: order.model.model,
    model_year: order.model.year,
    dimensions: order.model.dimensions,
    
    // Pricing - must match template placeholders exactly
    price_base: formatCurrency(order.pricing.base),
    price_options: formatCurrency(order.pricing.options),
    price_freight_est: formatCurrency(order.pricing.delivery || 0),
    price_setup: formatCurrency(order.pricing.setup || 0),
    price_other: formatCurrency(order.pricing.titleFee || 0),
    price_total: formatCurrency(order.pricing.total),
    
    // Additional fields
    order_id: order.id,
    order_date: new Date().toLocaleDateString()
  }

  // Add co-buyer fields if present - must match template placeholders exactly
  if (order.coBuyer) {
    baseFields.cobuyer_full_name = order.coBuyer.firstName + ' ' + order.coBuyer.lastName
    baseFields.cobuyer_email = order.coBuyer.email || order.buyer.email
  }

  // Add pack-specific fields
  if (pack === 'agreement') {
    return {
      ...baseFields,
      // Agreement-specific fields
      payment_method: order.paymentMethod || 'cash_ach'
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
