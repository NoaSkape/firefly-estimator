/**
 * DocuSeal Template Builder for Pack 3: Delivery, Set & Site Readiness Agreement v2
 */

import { buildDeliveryHtml } from "../../contracts/html/delivery.js"
import { dsCreateTemplateFromHtmlDocx } from "../client.js"

export async function buildDeliveryTemplate() {
  console.log('[DELIVERY_BUILDER] Starting DOCX template creation process...')
  
  // Example test data; in production, pass real order values
  const html = buildDeliveryHtml({
    buyer_full_name: "Test Buyer",
    buyer_email: "buyer@example.com",
    cobuyer_full_name: "Co Buyer",
    cobuyer_email: "cobuyer@example.com",
    delivery_address_line1: "100 Ranch Rd",
    delivery_city: "Pipe Creek",
    delivery_state: "TX",
    delivery_zip: "78063",
    model_brand: "Athens Park Select",
    model_code: "APS-527B",
    model_year: "2025",
    dimensions: "34'10\" x 11'2\"",
    est_completion_date: "2025-10-01",
  })

  console.log('[DELIVERY_BUILDER] Building HTML with template placeholders...')

  // DocuSeal roles & fields (anchor-based)
  const roles = [
    { name: "buyer" },
    { name: "cobuyer", optional: true },
    { name: "firefly_signer" },
  ]

  const fields = [
    // Clause-level initials (anchors appear once each)
    { name: "Site Readiness 1", role: "buyer", type: "initials", anchor_text: "[[SITE_INITIALS_1]]", required: true },
    { name: "Site Readiness 2", role: "buyer", type: "initials", anchor_text: "[[SITE_INITIALS_2]]", required: true },
    { name: "Site Readiness 3", role: "buyer", type: "initials", anchor_text: "[[SITE_INITIALS_3]]", required: true },
    { name: "Site Readiness 4", role: "buyer", type: "initials", anchor_text: "[[SITE_INITIALS_4]]", required: true },
    { name: "Site Readiness 5", role: "buyer", type: "initials", anchor_text: "[[SITE_INITIALS_5]]", required: true },
    { name: "Site Readiness 6", role: "buyer", type: "initials", anchor_text: "[[SITE_INITIALS_6]]", required: true },

    { name: "Delivery Initials 1", role: "buyer", type: "initials", anchor_text: "[[DELIVERY_INITIALS_1]]", required: true },
    { name: "Delivery Initials 2", role: "buyer", type: "initials", anchor_text: "[[DELIVERY_INITIALS_2]]", required: true },
    { name: "Delivery Initials 3", role: "buyer", type: "initials", anchor_text: "[[DELIVERY_INITIALS_3]]", required: true },

    { name: "Fees Initials 1", role: "buyer", type: "initials", anchor_text: "[[FEES_INITIALS_1]]", required: true },
    { name: "Fees Initials 2", role: "buyer", type: "initials", anchor_text: "[[FEES_INITIALS_2]]", required: true },
    { name: "Fees Initials 3", role: "buyer", type: "initials", anchor_text: "[[FEES_INITIALS_3]]", required: true },

    { name: "Risk Initials 1", role: "buyer", type: "initials", anchor_text: "[[RISK_INITIALS_1]]", required: true },
    { name: "Risk Initials 2", role: "buyer", type: "initials", anchor_text: "[[RISK_INITIALS_2]]", required: true },

    { name: "Insurance Initials", role: "buyer", type: "initials", anchor_text: "[[INS_INITIALS]]", required: true },
    { name: "Storage Initials", role: "buyer", type: "initials", anchor_text: "[[STORAGE_INITIALS]]", required: true },
    { name: "Indemnification Initials", role: "buyer", type: "initials", anchor_text: "[[INDEM_INITIALS]]", required: true },

    // Page initials (place on EVERY occurrence)
    { name: "Buyer Page Initials", role: "buyer", type: "initials", anchor_text: "[[BUYER_INITIALS]]", required: true, multiple: true },
    { name: "Co-Buyer Page Initials", role: "cobuyer", type: "initials", anchor_text: "[[COBUYER_INITIALS]]", required: false, multiple: true },

    // Signatures
    { name: "Buyer Signature", role: "buyer", type: "signature", anchor_text: "[[BUYER_SIGNATURE]]", required: true },
    { name: "Co-Buyer Signature", role: "cobuyer", type: "signature", anchor_text: "[[COBUYER_SIGNATURE]]", required: false },
    { name: "Dealer Signature", role: "firefly_signer", type: "signature", anchor_text: "[[FIREFLY_SIGNATURE]]", required: true },
  ]

  const templateBody = {
    name: "Firefly – Delivery, Set & Site Readiness Agreement v2",
    documents: [{ name: "delivery.html", file: html, fields }],
    submitters: [
      { name: "buyer" },
      { name: "cobuyer" },
      { name: "firefly_signer" }
    ]
  }

  console.log('[DELIVERY_BUILDER] Creating DocuSeal template via DOCX endpoint...')
  const templateId = await dsCreateTemplateFromHtmlDocx(templateBody)
  
  console.log('[DELIVERY_BUILDER] Template created successfully with ID:', templateId)
  return templateId
}
