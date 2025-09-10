/**
 * Agreement Template Builder v5 - Comprehensive
 * Uses the new comprehensive template with all sections A-S
 */

import { buildComprehensiveAgreementTemplate } from './comprehensive-agreement.js'

/**
 * Build the comprehensive Master Retail Purchase Agreement template in DocuSeal
 * @returns {Promise<string>} Template ID
 */
export async function buildAgreementTemplate() {
  console.log('[AGREEMENT_BUILDER] Starting comprehensive template creation process...')
  
  // Use the new comprehensive template builder
  const templateId = await buildComprehensiveAgreementTemplate()
  
  console.log('[AGREEMENT_BUILDER] Comprehensive template created successfully with ID:', templateId)
  
  return templateId
}
