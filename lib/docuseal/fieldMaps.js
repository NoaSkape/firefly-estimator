/**
 * Canonical field mapping for DocuSeal templates
 * This ensures consistent field names across all templates
 */

export const FIELD_MAPS = {
  // Master Retail Purchase Agreement
  masterRetail: {
    // Buyer Information
    buyer_full_name: { role: 'Buyer', readonly: true },
    buyer_email: { role: 'Buyer', readonly: true },
    buyer_address: { role: 'Buyer', readonly: true },
    buyer_phone: { role: 'Buyer', readonly: true },
    
    // Co-Buyer Information (optional)
    co_buyer_full_name: { role: 'Co-Buyer', readonly: true },
    co_buyer_email: { role: 'Co-Buyer', readonly: true },
    
    // Unit Information
    model_brand: { role: 'Buyer', readonly: true },
    model_code: { role: 'Buyer', readonly: true },
    model_year: { role: 'Buyer', readonly: true },
    dimensions: { role: 'Buyer', readonly: true },
    
    // Pricing Information
    price_base: { role: 'Buyer', readonly: true },
    price_options: { role: 'Buyer', readonly: true },
    price_freight_est: { role: 'Buyer', readonly: true },
    price_setup: { role: 'Buyer', readonly: true },
    price_other: { role: 'Buyer', readonly: true },
    price_total: { role: 'Buyer', readonly: true },
    
    // Signature and Initials (editable)
    buyer_initials_1: { role: 'Buyer', readonly: false },
    buyer_initials_2: { role: 'Buyer', readonly: false },
    buyer_initials_3: { role: 'Buyer', readonly: false },
    buyer_signature: { role: 'Buyer', readonly: false }
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
