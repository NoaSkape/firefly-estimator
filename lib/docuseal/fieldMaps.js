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
  // Master Retail Purchase Agreement - EXACT field names from comprehensive template
  masterRetail: {
    // Order / Reference
    order_id: { role: 'buyer', readonly: true, type: 'text' },
    order_date: { role: 'buyer', readonly: true, type: 'date' },
    effective_date: { role: 'buyer', readonly: true, type: 'date' },

    // Dealer Info
    dealer_legal_name: { role: 'buyer', readonly: true, type: 'text' },
    dealer_license_no: { role: 'buyer', readonly: true, type: 'text' },
    dealer_address: { role: 'buyer', readonly: true, type: 'text' },
    dealer_phone_display: { role: 'buyer', readonly: true, type: 'text' },

    // Buyer Information - MUST match comprehensive template field tags exactly
    buyer_full_name: { role: 'buyer', readonly: true, type: 'text' },
    buyer_name: { role: 'buyer', readonly: true, type: 'text' },
    buyer_email: { role: 'buyer', readonly: true, type: 'text' },
    buyer_address: { role: 'buyer', readonly: true, type: 'text' },
    buyer_phone: { role: 'buyer', readonly: true, type: 'text' },
    cobuyer_full_name: { role: 'cobuyer', readonly: true, type: 'text' },
    cobuyer_email: { role: 'cobuyer', readonly: true, type: 'text' },
    cobuyer_phone: { role: 'cobuyer', readonly: true, type: 'text' },

    // Delivery / Installation Address
    delivery_address: { role: 'buyer', readonly: true, type: 'text' },

    // Unit Information - MUST match comprehensive template field tags exactly
    model_brand: { role: 'buyer', readonly: true, type: 'text' },
    model_code: { role: 'buyer', readonly: true, type: 'text' },
    model_year: { role: 'buyer', readonly: true, type: 'text' },
    dimensions: { role: 'buyer', readonly: true, type: 'text' },
    vin_serial: { role: 'buyer', readonly: true, type: 'text' },

    // Pricing Information - MUST match comprehensive template field tags exactly
    price_base: { role: 'buyer', readonly: true, type: 'text' },
    price_options: { role: 'buyer', readonly: true, type: 'text' },
    price_freight_est: { role: 'buyer', readonly: true, type: 'text' },
    price_setup: { role: 'buyer', readonly: true, type: 'text' },
    price_other: { role: 'buyer', readonly: true, type: 'text' },
    price_subtotal: { role: 'buyer', readonly: true, type: 'text' },
    price_sales_tax: { role: 'buyer', readonly: true, type: 'text' },
    price_total: { role: 'buyer', readonly: true, type: 'text' },

    // Section Initials (A-S) - Comprehensive template sections
    pa_a_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_a_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_b_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_b_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_c_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_c_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_e_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_e_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_f_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_f_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_g_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_g_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_h_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_h_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_i_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_i_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_j_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_j_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_k_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_k_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_l_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_l_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_m_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_m_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_n_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_n_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_o_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_o_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_p_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_p_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_q_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_q_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    pa_r_initials_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    pa_r_initials_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    
    // Classification Acknowledgment
    classification_ack_initials: { role: 'buyer', readonly: false, type: 'initials' },
    classification_ack_date: { role: 'buyer', readonly: false, type: 'date' },

    // Key Terms Acknowledgment (buyer + cobuyer)
    ack_payment_terms_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    ack_payment_terms_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    ack_storage_risk_insurance_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    ack_storage_risk_insurance_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    ack_delivery_freight_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    ack_delivery_freight_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    ack_warranty_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    ack_warranty_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    ack_change_orders_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    ack_change_orders_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    ack_arbitration_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    ack_arbitration_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },
    ack_disclosures_cancel_buyer: { role: 'buyer', readonly: false, type: 'initials' },
    ack_disclosures_cancel_cobuyer: { role: 'cobuyer', readonly: false, type: 'initials' },

    // Signatures & Dates
    buyer_signature: { role: 'buyer', readonly: false, type: 'signature' },
    buyer_signature_date: { role: 'buyer', readonly: false, type: 'date' },
    buyer_printed_name: { role: 'buyer', readonly: true, type: 'text' },
    cobuyer_signature: { role: 'cobuyer', readonly: false, type: 'signature' },
    cobuyer_signature_date: { role: 'cobuyer', readonly: false, type: 'date' },
    cobuyer_printed_name: { role: 'cobuyer', readonly: true, type: 'text' },
    dealer_signature: { role: 'firefly_signer', readonly: false, type: 'signature' },
    dealer_signature_date: { role: 'firefly_signer', readonly: false, type: 'date' },
    dealer_signer_name: { role: 'firefly_signer', readonly: false, type: 'text' },
    dealer_signer_title: { role: 'firefly_signer', readonly: false, type: 'text' },

    // Misc
    sales_agent: { role: 'buyer', readonly: true, type: 'text' }
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
