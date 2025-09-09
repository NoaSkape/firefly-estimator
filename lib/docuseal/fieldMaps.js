/**
 * UNIFIED FIELD MAPPING SYSTEM FOR DOCUSEAL TEMPLATES
 * 
 * This is the SINGLE SOURCE OF TRUTH for all DocuSeal field mappings.
 * All systems (prefill generation, template creation, submission creation)
 * must use these exact field names and configurations.
 * 
 * CRITICAL: These field names must match exactly with the field tags
 * in the PDF templates ({{field_name;type=text;role=buyer}})
 */

export const FIELD_MAPS = {
  // Master Retail Purchase Agreement - EXACT field names from PDF template
  masterRetail: {
    // Buyer Information (4 fields) - MUST match PDF field tags exactly
    buyer_full_name: { role: 'buyer', readonly: true, type: 'text' },
    buyer_email: { role: 'buyer', readonly: true, type: 'text' },
    buyer_address: { role: 'buyer', readonly: true, type: 'text' },
    buyer_phone: { role: 'buyer', readonly: true, type: 'text' },
    
    // Unit Information (4 fields) - MUST match PDF field tags exactly
    model_brand: { role: 'buyer', readonly: true, type: 'text' },
    model_code: { role: 'buyer', readonly: true, type: 'text' },
    model_year: { role: 'buyer', readonly: true, type: 'text' },
    dimensions: { role: 'buyer', readonly: true, type: 'text' },
    
    // Pricing Information (6 fields) - MUST match PDF field tags exactly
    price_base: { role: 'buyer', readonly: true, type: 'text' },
    price_options: { role: 'buyer', readonly: true, type: 'text' },
    price_freight_est: { role: 'buyer', readonly: true, type: 'text' },
    price_setup: { role: 'buyer', readonly: true, type: 'text' },
    price_other: { role: 'buyer', readonly: true, type: 'text' },
    price_total: { role: 'buyer', readonly: true, type: 'text' },
    
    // Signature and Initials (4 fields) - MUST match PDF field tags exactly
    buyer_initials_1: { role: 'buyer', readonly: false, type: 'initials' },
    buyer_initials_2: { role: 'buyer', readonly: false, type: 'initials' },
    buyer_initials_3: { role: 'buyer', readonly: false, type: 'initials' },
    buyer_signature: { role: 'buyer', readonly: false, type: 'signature' }
  },
  
  // Delivery Agreement
  delivery: {
    // Buyer Information
    buyer_full_name: { role: 'Buyer', readonly: true },
    buyer_email: { role: 'Buyer', readonly: true },
    buyer_address: { role: 'Buyer', readonly: true },
    buyer_phone: { role: 'Buyer', readonly: true },
    
    // Unit Information
    model_brand: { role: 'Buyer', readonly: true },
    model_code: { role: 'Buyer', readonly: true },
    model_year: { role: 'Buyer', readonly: true },
    dimensions: { role: 'Buyer', readonly: true },
    delivery_address: { role: 'Buyer', readonly: true },
    est_completion_date: { role: 'Buyer', readonly: true },
    
    // Site Readiness Initials (editable)
    site_initials_1: { role: 'Buyer', readonly: false },
    site_initials_2: { role: 'Buyer', readonly: false },
    site_initials_3: { role: 'Buyer', readonly: false },
    site_initials_4: { role: 'Buyer', readonly: false },
    site_initials_5: { role: 'Buyer', readonly: false },
    site_initials_6: { role: 'Buyer', readonly: false },
    delivery_initials_1: { role: 'Buyer', readonly: false },
    delivery_initials_2: { role: 'Buyer', readonly: false },
    delivery_initials_3: { role: 'Buyer', readonly: false },
    fees_initials_1: { role: 'Buyer', readonly: false },
    fees_initials_2: { role: 'Buyer', readonly: false },
    fees_initials_3: { role: 'Buyer', readonly: false },
    risk_initials_1: { role: 'Buyer', readonly: false },
    risk_initials_2: { role: 'Buyer', readonly: false },
    insurance_initials: { role: 'Buyer', readonly: false },
    storage_initials: { role: 'Buyer', readonly: false },
    indemnification_initials: { role: 'Buyer', readonly: false },
    buyer_page_initials: { role: 'Buyer', readonly: false },
    buyer_signature: { role: 'Buyer', readonly: false }
  }
}

/**
 * Get field map for a specific template
 * @param {string} templateKey - Template key (e.g., 'masterRetail', 'delivery')
 * @returns {Object} Field map for the template
 */
export function getFieldMap(templateKey) {
  const fieldMap = FIELD_MAPS[templateKey]
  if (!fieldMap) {
    throw new Error(`Unknown template key: ${templateKey}`)
  }
  return fieldMap
}

/**
 * Build DocuSeal fields array from data and field map
 * @param {Object} data - Data to prefill
 * @param {Object} fieldMap - Field mapping for the template
 * @returns {Array} DocuSeal fields array
 */
export function buildFieldsArray(data, fieldMap) {
  const fields = []
  
  for (const [fieldName, config] of Object.entries(fieldMap)) {
    const value = data[fieldName]
    if (value !== undefined && value !== null && value !== '') {
      fields.push({
        name: fieldName,
        default_value: String(value),
        readonly: config.readonly
      })
    }
  }
  
  return fields
}
