/**
 * Agreement Template Builder v2
 * Uses unified DocuSeal client with HTML content and embedded fields
 */

import { dsCreateTemplateFromHtml } from '../client.js'
import { buildAgreementHtmlForDocuSeal } from '../../contracts/html/agreement.js'

/**
 * Build the Master Retail Purchase Agreement template in DocuSeal using DOCX endpoint
 * @returns {Promise<string>} Template ID
 */
export async function buildAgreementTemplate() {
  console.log('[AGREEMENT_BUILDER] Starting HTML template creation process...')

  // 1) Generate DocuSeal-compatible HTML with field tags
  console.log('[AGREEMENT_BUILDER] Building HTML with DocuSeal field tags...')
  const html = buildAgreementHtmlForDocuSeal()

  // 2) Create template via DocuSeal HTML API
  const templateBody = {
    name: "Firefly – Master Retail Purchase Agreement (Cash Sale) v4 FIXED",
    html: html,
    size: "Letter",
    external_id: "firefly_agreement_v4_fixed",
    folder_name: "Firefly Templates",
    shared_link: true,
    // CRITICAL: Explicitly define roles for multi-party signing
    roles: ['buyer', 'cobuyer', 'firefly_signer']
  }

  console.log('[AGREEMENT_BUILDER] Creating DocuSeal template via HTML endpoint...')

  // 3) Create template via DocuSeal HTML API
  const templateId = await dsCreateTemplateFromHtml(templateBody)

  console.log('[AGREEMENT_BUILDER] HTML template created successfully with ID:', templateId)
  
  return templateId
}
