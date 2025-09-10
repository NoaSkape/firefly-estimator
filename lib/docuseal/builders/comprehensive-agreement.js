/**
 * Comprehensive Purchase Agreement Template Builder
 * Uses the new comprehensive template with all sections A-S
 */

import { dsCreateTemplateFromHtml } from '../client.js'
import { buildComprehensivePurchaseAgreementHtml } from '../../contracts/html/purchase-agreement-comprehensive.js'

/**
 * Build the comprehensive Purchase Agreement template in DocuSeal
 * @returns {Promise<string>} Template ID
 */
export async function buildComprehensiveAgreementTemplate() {
  console.log('[COMPREHENSIVE_AGREEMENT_BUILDER] Starting comprehensive template creation process...')

  // 1) Generate DocuSeal-compatible HTML with field tags
  console.log('[COMPREHENSIVE_AGREEMENT_BUILDER] Building comprehensive HTML with DocuSeal field tags...')
  const html = buildComprehensivePurchaseAgreementHtml()

  // 2) Create template via DocuSeal HTML API
  const templateBody = {
    name: "Firefly – Comprehensive Purchase Agreement (Cash Sale) v5 - CURLY BRACE",
    html: html,
    size: "Letter",
    external_id: "firefly_comprehensive_agreement_v5_curly_brace",
    folder_name: "Firefly Templates",
    shared_link: true,
    // CRITICAL: Explicitly define roles for multi-party signing
    roles: ['buyer', 'cobuyer', 'firefly_signer']
  }

  console.log('[COMPREHENSIVE_AGREEMENT_BUILDER] Creating DocuSeal template via HTML endpoint...')

  // 3) Create template via DocuSeal HTML API
  const templateId = await dsCreateTemplateFromHtml(templateBody)

  console.log('[COMPREHENSIVE_AGREEMENT_BUILDER] Comprehensive template created successfully with ID:', templateId)
  
  return templateId
}
