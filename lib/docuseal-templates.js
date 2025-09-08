/**
 * DocuSeal Template Management for Firefly Tiny Homes
 * Creates and manages the 3 contract templates (Packs 2-4)
 */

import fs from 'fs'
import path from 'path'

const API_BASE = process.env.DOCUSEAL_API_BASE || 'https://api.docuseal.co'
const API_KEY = process.env.DOCUSEAL_API_KEY || ''

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Auth-Token': API_KEY,
  }
}

/**
 * Template definitions for the 3 signable packs
 */
const TEMPLATE_DEFINITIONS = {
  agreement: {
    name: 'Firefly - Purchase Agreement Pack',
    external_id: 'firefly-purchase-agreement-2025',
    folder_name: 'Firefly Contracts',
    description: 'Pack 2: Purchase Agreement, Electronic Consent, Consumer Disclosures',
    roles: ['buyer', 'cobuyer', 'firefly_signer'],
    fields: [
      // Dealer Information Fields
      { name: 'dealer_name', type: 'text', role: 'firefly_signer', required: false, title: 'Dealer Name' },
      { name: 'dealer_address', type: 'text', role: 'firefly_signer', required: false, title: 'Dealer Address' },
      { name: 'dealer_phone', type: 'text', role: 'firefly_signer', required: false, title: 'Dealer Phone' },
      
      // Model Information Fields
      { name: 'model_brand', type: 'text', role: 'buyer', required: false, title: 'Model Brand' },
      { name: 'model_name', type: 'text', role: 'buyer', required: false, title: 'Model Name' },
      { name: 'model_year', type: 'text', role: 'buyer', required: false, title: 'Model Year' },
      { name: 'model_dimensions', type: 'text', role: 'buyer', required: false, title: 'Model Dimensions' },
      
      // Buyer Information Fields
      { name: 'buyer_name', type: 'text', role: 'buyer', required: true, title: 'Buyer Full Name' },
      { name: 'buyer_email', type: 'text', role: 'buyer', required: true, title: 'Buyer Email' },
      { name: 'buyer_phone', type: 'text', role: 'buyer', required: false, title: 'Buyer Phone' },
      { name: 'buyer_address', type: 'text', role: 'buyer', required: true, title: 'Buyer Address' },
      
      // Co-buyer Information Fields (Optional)
      { name: 'cobuyer_name', type: 'text', role: 'cobuyer', required: false, title: 'Co-buyer Full Name' },
      { name: 'cobuyer_email', type: 'text', role: 'cobuyer', required: false, title: 'Co-buyer Email' },
      { name: 'cobuyer_phone', type: 'text', role: 'cobuyer', required: false, title: 'Co-buyer Phone' },
      
      // Pricing Fields
      { name: 'base_price', type: 'text', role: 'buyer', required: false, title: 'Base Price' },
      { name: 'options_price', type: 'text', role: 'buyer', required: false, title: 'Options Price' },
      { name: 'tax_amount', type: 'text', role: 'buyer', required: false, title: 'Tax Amount' },
      { name: 'delivery_price', type: 'text', role: 'buyer', required: false, title: 'Delivery Price' },
      { name: 'setup_price', type: 'text', role: 'buyer', required: false, title: 'Setup Price' },
      { name: 'total_price', type: 'text', role: 'buyer', required: false, title: 'Total Price' },
      
      // Payment Method Fields
      { name: 'payment_method', type: 'text', role: 'buyer', required: false, title: 'Payment Method' },
      { name: 'deposit_required', type: 'text', role: 'buyer', required: false, title: 'Deposit Required' },
      { name: 'deposit_amount', type: 'text', role: 'buyer', required: false, title: 'Deposit Amount' },
      
      // Conditional Payment Method Fields
      { name: 'credit_card_fee_disclosure', type: 'text', role: 'buyer', required: false, title: 'Credit Card Fee Disclosure' },
      { name: 'financing_disclaimer', type: 'text', role: 'buyer', required: false, title: 'Financing Disclaimer' },
      
      // Required Signature Fields
      { name: 'buyer_signature', type: 'signature', role: 'buyer', required: true, title: 'Buyer Signature' },
      { name: 'buyer_signature_date', type: 'date', role: 'buyer', required: true, title: 'Buyer Signature Date' },
      { name: 'cobuyer_signature', type: 'signature', role: 'cobuyer', required: false, title: 'Co-buyer Signature' },
      { name: 'cobuyer_signature_date', type: 'date', role: 'cobuyer', required: false, title: 'Co-buyer Signature Date' },
      { name: 'firefly_signature', type: 'signature', role: 'firefly_signer', required: true, title: 'Firefly Representative Signature' },
      { name: 'firefly_signature_date', type: 'date', role: 'firefly_signer', required: true, title: 'Firefly Signature Date' },
      
      // Required Initials Fields (for each page)
      { name: 'buyer_initials_page_1', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Page 1' },
      { name: 'buyer_initials_page_2', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Page 2' },
      { name: 'buyer_initials_page_3', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Page 3' },
      { name: 'cobuyer_initials_page_1', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Page 1' },
      { name: 'cobuyer_initials_page_2', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Page 2' },
      { name: 'cobuyer_initials_page_3', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Page 3' },
      
      // Required Checkboxes
      { name: 'esignature_consent', type: 'checkbox', role: 'buyer', required: true, title: 'Electronic Signature Consent' },
      { name: 'cobuyer_esignature_consent', type: 'checkbox', role: 'cobuyer', required: false, title: 'Co-buyer Electronic Signature Consent' }
    ]
  },
  
  delivery: {
    name: 'Firefly - Site, Delivery & Risk Pack',
    external_id: 'firefly-delivery-risk-2025',
    folder_name: 'Firefly Contracts',
    description: 'Pack 3: Site Readiness, Delivery Agreement, Insurance, Storage Terms',
    roles: ['buyer', 'cobuyer', 'firefly_signer'],
    fields: [
      // Delivery Address Fields
      { name: 'delivery_address', type: 'text', role: 'buyer', required: true, title: 'Delivery Address' },
      { name: 'estimated_completion', type: 'date', role: 'buyer', required: false, title: 'Estimated Factory Completion' },
      { name: 'delivery_state', type: 'text', role: 'buyer', required: false, title: 'Delivery State' },
      
      // Site Readiness Checkboxes
      { name: 'site_ready_access', type: 'checkbox', role: 'buyer', required: true, title: 'Site Access Ready' },
      { name: 'site_ready_utilities', type: 'checkbox', role: 'buyer', required: true, title: 'Utilities Ready' },
      { name: 'site_ready_permits', type: 'checkbox', role: 'buyer', required: true, title: 'Permits Obtained' },
      { name: 'redelivery_charges_understood', type: 'checkbox', role: 'buyer', required: true, title: 'Redelivery Charges Understood' },
      
      // Freight and Escort Acknowledgments
      { name: 'freight_variability_acknowledged', type: 'checkbox', role: 'buyer', required: true, title: 'Freight Variability Acknowledged' },
      { name: 'escort_requirements_understood', type: 'checkbox', role: 'buyer', required: true, title: 'Escort Requirements Understood' },
      
      // Insurance Acknowledgments
      { name: 'insurance_responsibility_acknowledged', type: 'checkbox', role: 'buyer', required: true, title: 'Insurance Responsibility Acknowledged' },
      { name: 'additional_insured_naming_acknowledged', type: 'checkbox', role: 'buyer', required: true, title: 'Additional Insured Naming Acknowledged' },
      
      // Storage Terms
      { name: 'storage_after_completion_acknowledged', type: 'checkbox', role: 'buyer', required: true, title: 'Storage After Completion Acknowledged' },
      
      // Required Initials for Each Clause
      { name: 'buyer_initials_site_readiness', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Site Readiness' },
      { name: 'buyer_initials_freight', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Freight Terms' },
      { name: 'buyer_initials_insurance', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Insurance Terms' },
      { name: 'buyer_initials_storage', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Storage Terms' },
      
      // Co-buyer Initials (if applicable)
      { name: 'cobuyer_initials_site_readiness', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Site Readiness' },
      { name: 'cobuyer_initials_freight', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Freight Terms' },
      { name: 'cobuyer_initials_insurance', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Insurance Terms' },
      { name: 'cobuyer_initials_storage', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Storage Terms' },
      
      // Required Signatures
      { name: 'buyer_signature', type: 'signature', role: 'buyer', required: true, title: 'Buyer Signature' },
      { name: 'buyer_signature_date', type: 'date', role: 'buyer', required: true, title: 'Buyer Signature Date' },
      { name: 'cobuyer_signature', type: 'signature', role: 'cobuyer', required: false, title: 'Co-buyer Signature' },
      { name: 'cobuyer_signature_date', type: 'date', role: 'cobuyer', required: false, title: 'Co-buyer Signature Date' },
      { name: 'firefly_signature', type: 'signature', role: 'firefly_signer', required: true, title: 'Firefly Representative Signature' },
      { name: 'firefly_signature_date', type: 'date', role: 'firefly_signer', required: true, title: 'Firefly Signature Date' }
    ]
  },
  
  final: {
    name: 'Firefly - Final Acknowledgments & Variations Pack',
    external_id: 'firefly-final-acknowledgments-2025',
    folder_name: 'Firefly Contracts',
    description: 'Pack 4: Warranty, Title/Registration, Deposits, Change Orders, Inspections, Lien Waivers',
    roles: ['buyer', 'cobuyer', 'firefly_signer'],
    fields: [
      // Warranty Acknowledgment
      { name: 'warranty_disclaimer_acknowledged', type: 'checkbox', role: 'buyer', required: true, title: 'Warranty Disclaimer Acknowledged' },
      { name: 'buyer_initials_warranty', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Warranty Disclaimer' },
      { name: 'cobuyer_initials_warranty', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Warranty Disclaimer' },
      
      // Title/Registration Selection and Acknowledgment
      { name: 'title_registration_option', type: 'radio', role: 'buyer', required: true, title: 'Title/Registration Option', 
        options: ['Firefly to Handle', 'Buyer to Handle', 'To Be Determined'] },
      { name: 'buyer_initials_title', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Title/Registration' },
      { name: 'cobuyer_initials_title', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Title/Registration' },
      
      // Construction Deposit Addendum (Conditional)
      { name: 'deposit_addendum', type: 'text', role: 'buyer', required: false, title: 'Deposit Addendum Status' },
      { name: 'deposit_percentage', type: 'text', role: 'buyer', required: false, title: 'Deposit Percentage' },
      { name: 'construction_deposit_acknowledged', type: 'checkbox', role: 'buyer', required: false, title: 'Construction Deposit Terms Acknowledged' },
      
      // Change Order Authorization
      { name: 'change_order_authorization_acknowledged', type: 'checkbox', role: 'buyer', required: true, title: 'Change Order Authorization Acknowledged' },
      { name: 'buyer_initials_change_order', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Change Order Authorization' },
      { name: 'cobuyer_initials_change_order', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Change Order Authorization' },
      
      // Final Inspection Acknowledgment
      { name: 'final_inspection_acknowledged', type: 'checkbox', role: 'buyer', required: true, title: 'Final Inspection Process Acknowledged' },
      { name: 'buyer_initials_inspection', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Final Inspection' },
      { name: 'cobuyer_initials_inspection', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Final Inspection' },
      
      // Lien Waiver Policy Acknowledgment
      { name: 'lien_waiver_policy_acknowledged', type: 'checkbox', role: 'buyer', required: true, title: 'Lien Waiver Policy Acknowledged' },
      { name: 'buyer_initials_lien_waiver', type: 'initials', role: 'buyer', required: true, title: 'Buyer Initials - Lien Waiver Policy' },
      { name: 'cobuyer_initials_lien_waiver', type: 'initials', role: 'cobuyer', required: false, title: 'Co-buyer Initials - Lien Waiver Policy' },
      
      // Required Signatures
      { name: 'buyer_signature', type: 'signature', role: 'buyer', required: true, title: 'Buyer Signature' },
      { name: 'buyer_signature_date', type: 'date', role: 'buyer', required: true, title: 'Buyer Signature Date' },
      { name: 'cobuyer_signature', type: 'signature', role: 'cobuyer', required: false, title: 'Co-buyer Signature' },
      { name: 'cobuyer_signature_date', type: 'date', role: 'cobuyer', required: false, title: 'Co-buyer Signature Date' },
      { name: 'firefly_signature', type: 'signature', role: 'firefly_signer', required: true, title: 'Firefly Representative Signature' },
      { name: 'firefly_signature_date', type: 'date', role: 'firefly_signer', required: true, title: 'Firefly Signature Date' }
    ]
  }
}

/**
 * Create a template with document upload or text-based placeholder
 */
async function createTemplate(templateKey, documentPath = null) {
  const template = TEMPLATE_DEFINITIONS[templateKey]
  if (!template) {
    throw new Error(`Template definition not found for: ${templateKey}`)
  }

  console.log(`[DOCUSEAL] Creating template: ${template.name}`)

  // Prepare submitters (roles)
  const submitters = template.roles.map(role => ({
    name: role === 'firefly_signer' ? 'Firefly Tiny Homes' : 
          role === 'buyer' ? 'Buyer' : 'Co-buyer',
    uuid: `${role}_uuid`
  }))

  // Prepare fields with proper submitter UUIDs
  const fields = template.fields.map(field => ({
    name: field.name,
    type: field.type,
    role: field.role,
    required: field.required,
    title: field.title,
    submitter_uuid: `${field.role}_uuid`,
    ...(field.options && { options: field.options }),
    areas: [] // Will be populated when document is uploaded and positioned
  }))

  let documents = []

  if (documentPath && fs.existsSync(documentPath)) {
    // Upload actual document
    const fileBuffer = fs.readFileSync(documentPath)
    const base64Content = fileBuffer.toString('base64')
    
    documents = [{
      name: template.name,
      file: base64Content
    }]
  } else {
    // Create a placeholder document with text tags
    const placeholderContent = createPlaceholderDocument(template)
    documents = [{
      name: template.name,
      file: Buffer.from(placeholderContent).toString('base64')
    }]
  }

  const payload = {
    name: template.name,
    external_id: template.external_id,
    folder_name: template.folder_name,
    shared_link: false, // Keep templates private
    submitters,
    documents
  }

  console.log(`[DOCUSEAL] Template payload:`, JSON.stringify(payload, null, 2))

  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[DOCUSEAL] Template creation failed:`, errorText)
    throw new Error(`Failed to create template ${templateKey}: ${response.status}`)
  }

  const result = await response.json()
  console.log(`[DOCUSEAL] Template created successfully:`, result.id, result.slug)
  
  return result
}

/**
 * Create a placeholder HTML document with text tags for field positioning
 */
function createPlaceholderDocument(template) {
  const fieldsHtml = template.fields
    .filter(field => field.required || field.type === 'signature' || field.type === 'initials')
    .map(field => {
      const tag = `{{${field.name};role=${field.role};type=${field.type}${field.required ? ';required=true' : ''}}}`
      return `<p><strong>${field.title}:</strong> ${tag}</p>`
    })
    .join('\n')

  return `
<!DOCTYPE html>
<html>
<head>
    <title>${template.name}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .field { margin: 10px 0; }
        .signature-section { margin-top: 40px; border-top: 2px solid #000; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Firefly Tiny Homes</h1>
        <h2>${template.name}</h2>
        <p>6150 TX-16, Pipe Creek, TX 78063 | 830-328-6109</p>
    </div>
    
    <div class="section">
        <h3>Document Fields</h3>
        <p>This is a placeholder document. Replace with actual contract PDF and position fields using DocuSeal's template editor.</p>
        ${fieldsHtml}
    </div>
    
    <div class="signature-section">
        <h3>Signatures Required</h3>
        <p>All parties must sign and initial as indicated in the field positioning.</p>
        
        <div style="margin-top: 40px;">
            <p><strong>Buyer Signature:</strong> {{buyer_signature;role=buyer;type=signature;required=true}}</p>
            <p><strong>Date:</strong> {{buyer_signature_date;role=buyer;type=date;required=true}}</p>
        </div>
        
        <div style="margin-top: 40px;">
            <p><strong>Co-buyer Signature:</strong> {{cobuyer_signature;role=cobuyer;type=signature}}</p>
            <p><strong>Date:</strong> {{cobuyer_signature_date;role=cobuyer;type=date}}</p>
        </div>
        
        <div style="margin-top: 40px;">
            <p><strong>Firefly Representative:</strong> {{firefly_signature;role=firefly_signer;type=signature;required=true}}</p>
            <p><strong>Date:</strong> {{firefly_signature_date;role=firefly_signer;type=date;required=true}}</p>
        </div>
    </div>
</body>
</html>`
}

/**
 * Create all three templates
 */
async function createAllTemplates() {
  const results = {}
  
  for (const [key, template] of Object.entries(TEMPLATE_DEFINITIONS)) {
    try {
      console.log(`\n[DOCUSEAL] Creating template: ${key}`)
      const result = await createTemplate(key)
      results[key] = {
        id: result.id,
        slug: result.slug,
        name: result.name,
        external_id: result.external_id
      }
      
      // Add delay between template creation to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`[DOCUSEAL] Failed to create template ${key}:`, error)
      results[key] = { error: error.message }
    }
  }
  
  return results
}

/**
 * Get existing templates by external ID
 */
async function getExistingTemplates() {
  const response = await fetch(`${API_BASE}/templates`, {
    headers: authHeaders()
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.status}`)
  }

  const templates = await response.json()
  
  const firefly_templates = templates.filter(t => 
    t.external_id && t.external_id.startsWith('firefly-')
  )

  return firefly_templates.reduce((acc, template) => {
    const key = template.external_id.replace('firefly-', '').replace('-2025', '')
    acc[key] = {
      id: template.id,
      slug: template.slug,
      name: template.name,
      external_id: template.external_id
    }
    return acc
  }, {})
}

/**
 * Ensure all required templates exist
 */
async function ensureTemplatesExist() {
  console.log('[DOCUSEAL] Checking for existing Firefly templates...')
  
  const existing = await getExistingTemplates()
  const needed = ['agreement', 'delivery', 'final']
  const missing = needed.filter(key => !existing[key])
  
  if (missing.length === 0) {
    console.log('[DOCUSEAL] All required templates already exist')
    return existing
  }
  
  console.log(`[DOCUSEAL] Missing templates: ${missing.join(', ')}`)
  console.log('[DOCUSEAL] Creating missing templates...')
  
  const created = await createAllTemplates()
  
  return { ...existing, ...created }
}

export {
  createTemplate,
  createAllTemplates,
  getExistingTemplates,
  ensureTemplatesExist,
  TEMPLATE_DEFINITIONS
}
