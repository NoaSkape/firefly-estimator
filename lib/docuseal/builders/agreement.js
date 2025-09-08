/**
 * Agreement Template Builder v2
 * Uses unified DocuSeal client with HTML content and embedded fields
 */

import { dsCreateTemplateFromHtmlDocx } from '../client.js'
import { buildAgreementHtml } from '../../contracts/html/agreement.js'

/**
 * Build the Master Retail Purchase Agreement template in DocuSeal using DOCX endpoint
 * @returns {Promise<string>} Template ID
 */
export async function buildAgreementTemplate() {
  console.log('[AGREEMENT_BUILDER] Starting DOCX template creation process...')

  // 1) Generate HTML with placeholder data for template creation
  const sampleOrder = {
    buyer_full_name: "{{buyer_full_name}}",
    buyer_address: "{{buyer_address}}",
    buyer_phone: "{{buyer_phone}}",
    buyer_email: "{{buyer_email}}",
    cobuyer_full_name: "{{cobuyer_full_name}}",
    cobuyer_email: "{{cobuyer_email}}",
    model_brand: "{{model_brand}}",
    model_code: "{{model_code}}",
    model_year: "{{model_year}}",
    dimensions: "{{dimensions}}",
    price_base: "{{price_base}}",
    price_options: "{{price_options}}", 
    price_freight_est: "{{price_freight_est}}",
    price_setup: "{{price_setup}}",
    price_other: "{{price_other}}",
    price_total: "{{price_total}}",
    payment_method: "cash_ach"
  }

  console.log('[AGREEMENT_BUILDER] Building HTML with template placeholders...')
  const html = buildAgreementHtml(sampleOrder)

  // 2) Create template via DocuSeal DOCX API with embedded HTML and fields
  const templateBody = {
    name: "Firefly – Master Retail Purchase Agreement (Cash Sale) v2",
    documents: [
      {
        name: "agreement.html",
        file: html,
        fields: [
          { 
            name: "Buyer Signature", 
            role: "buyer", 
            type: "signature", 
            anchor_text: "[[BUYER_SIGNATURE]]" 
          },
          { 
            name: "Co-Buyer Signature", 
            role: "cobuyer", 
            type: "signature", 
            anchor_text: "[[COBUYER_SIGNATURE]]", 
            required: false 
          },
          { 
            name: "Dealer Signature", 
            role: "firefly_signer", 
            type: "signature", 
            anchor_text: "[[FIREFLY_SIGNATURE]]" 
          },
          { 
            name: "Buyer Initials", 
            role: "buyer", 
            type: "initials", 
            anchor_text: "[[BUYER_INITIALS]]", 
            multiple: true 
          },
          { 
            name: "Co-Buyer Initials", 
            role: "cobuyer", 
            type: "initials", 
            anchor_text: "[[COBUYER_INITIALS]]", 
            multiple: true, 
            required: false 
          }
        ]
      }
    ],
    submitters: [
      { name: "buyer" },
      { name: "cobuyer" },
      { name: "firefly_signer" }
    ]
  }

  console.log('[AGREEMENT_BUILDER] Creating DocuSeal template via DOCX endpoint...')

  // 3) Create template via DocuSeal API
  const templateId = await dsCreateTemplateFromHtmlDocx(templateBody)

  console.log('[AGREEMENT_BUILDER] Template created successfully with ID:', templateId)
  
  return templateId
}
