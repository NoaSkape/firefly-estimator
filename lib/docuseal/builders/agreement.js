/**
 * Agreement Template Builder
 * Orchestrates HTML → PDF → DocuSeal Template creation
 */

import puppeteer from 'puppeteer'
import { createTemplateByPdf } from '../client.js'
import { buildAgreementHtml } from '../../contracts/html/agreement.js'

function encode(buffer) { 
  return buffer.toString('base64') 
}

/**
 * Build the Master Retail Purchase Agreement template in DocuSeal
 * @returns {Promise<string>} Template ID
 */
export async function buildAgreementTemplate() {
  console.log('[AGREEMENT_BUILDER] Starting template creation process...')

  // 1) Generate HTML with sample data for template creation
  const sampleOrder = {
    buyer_full_name: "Sample Buyer Name",
    buyer_address: "123 Main Street, San Antonio, TX 78201",
    buyer_phone: "210-555-1234",
    buyer_email: "buyer@example.com",
    cobuyer_full_name: "Sample Co-Buyer Name",
    cobuyer_email: "cobuyer@example.com",
    model_brand: "Athens Park Select",
    model_code: "APS-630",
    model_year: "2025",
    dimensions: "34'10\" x 11'2\"",
    price_base: "68,217.00",
    price_options: "23,007.00", 
    price_freight_est: "3,500.00",
    price_setup: "2,500.00",
    price_other: "0.00",
    price_total: "99,925.50",
    payment_method: "cash_ach"
  }

  console.log('[AGREEMENT_BUILDER] Building HTML with sample data...')
  const html = buildAgreementHtml(sampleOrder)

  // 2) Render HTML to PDF using Puppeteer
  console.log('[AGREEMENT_BUILDER] Launching Puppeteer to generate PDF...')
  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: [
      "--no-sandbox", 
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  })
  
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" })
  
  // Generate PDF with proper settings for US Letter
  const pdf = await page.pdf({ 
    format: "Letter", 
    printBackground: true,
    margin: {
      top: '1in',
      right: '1in', 
      bottom: '1in',
      left: '1in'
    }
  })
  
  await browser.close()
  console.log('[AGREEMENT_BUILDER] PDF generated successfully, size:', Math.round(pdf.length / 1024), 'KB')

  // 3) Define anchor-based fields for DocuSeal template
  const fields = [
    // Electronic signature consent checkboxes
    { 
      name: "buyer_esig_consent",
      type: "checkbox", 
      role: "buyer", 
      anchor_text: "[[BUYER_ESIG_CONSENT]]", 
      required: true 
    },
    { 
      name: "cobuyer_esig_consent",
      type: "checkbox", 
      role: "cobuyer", 
      anchor_text: "[[COBUYER_ESIG_CONSENT]]", 
      required: false 
    },

    // Main signatures
    { 
      name: "buyer_signature",
      type: "signature", 
      role: "buyer", 
      anchor_text: "[[BUYER_SIGNATURE]]", 
      required: true 
    },
    { 
      name: "cobuyer_signature",
      type: "signature", 
      role: "cobuyer", 
      anchor_text: "[[COBUYER_SIGNATURE]]", 
      required: false 
    },
    { 
      name: "firefly_signature",
      type: "signature", 
      role: "firefly_signer", 
      anchor_text: "[[FIREFLY_SIGNATURE]]", 
      required: true 
    },

    // Signature dates
    { 
      name: "buyer_date",
      type: "date", 
      role: "buyer", 
      anchor_text: "[[BUYER_DATE]]", 
      required: true 
    },
    { 
      name: "cobuyer_date",
      type: "date", 
      role: "cobuyer", 
      anchor_text: "[[COBUYER_DATE]]", 
      required: false 
    },
    { 
      name: "firefly_date",
      type: "date", 
      role: "firefly_signer", 
      anchor_text: "[[FIREFLY_DATE]]", 
      required: true 
    },

    // Page initials (multiple instances)
    { 
      name: "buyer_initials_page1",
      type: "initials", 
      role: "buyer", 
      anchor_text: "[[BUYER_INITIALS_PAGE1]]", 
      required: true 
    },
    { 
      name: "buyer_initials_page2",
      type: "initials", 
      role: "buyer", 
      anchor_text: "[[BUYER_INITIALS_PAGE2]]", 
      required: true 
    },
    { 
      name: "buyer_initials_page3",
      type: "initials", 
      role: "buyer", 
      anchor_text: "[[BUYER_INITIALS_PAGE3]]", 
      required: true 
    },
    { 
      name: "cobuyer_initials_page1",
      type: "initials", 
      role: "cobuyer", 
      anchor_text: "[[COBUYER_INITIALS_PAGE1]]", 
      required: false 
    },
    { 
      name: "cobuyer_initials_page2",
      type: "initials", 
      role: "cobuyer", 
      anchor_text: "[[COBUYER_INITIALS_PAGE2]]", 
      required: false 
    },
    { 
      name: "cobuyer_initials_page3",
      type: "initials", 
      role: "cobuyer", 
      anchor_text: "[[COBUYER_INITIALS_PAGE3]]", 
      required: false 
    }
  ]

  // 4) Define roles for DocuSeal
  const roles = [
    { name: "buyer" },
    { name: "cobuyer", optional: true },
    { name: "firefly_signer" }
  ]

  console.log('[AGREEMENT_BUILDER] Creating DocuSeal template with', fields.length, 'fields and', roles.length, 'roles...')

  // 5) Create template via DocuSeal API
  const templateId = await createTemplateByPdf({
    name: "Firefly Tiny Homes - Master Retail Purchase Agreement (Cash Sale) v1",
    roles,
    fields,
    pdfBase64: encode(pdf)
  })

  console.log('[AGREEMENT_BUILDER] Template created successfully with ID:', templateId)
  
  return templateId
}
