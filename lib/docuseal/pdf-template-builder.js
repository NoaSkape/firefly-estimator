/**
 * PDF-Based Template Builder for DocuSeal
 * 
 * This module implements the industry-standard approach for document signing:
 * 1. Create templates from PDF files with embedded field tags
 * 2. Use flatten parameter to embed prefill data permanently
 * 3. Ensure consistent field mapping across all systems
 * 
 * This replaces the HTML-based approach which has fundamental limitations
 * for PDF prefilling in downloaded documents.
 */

import { API_BASE, authHeaders } from './client.js'

/**
 * Create a DocuSeal template from PDF with embedded field tags
 * @param {Object} templateConfig - Template configuration
 * @returns {Promise<string>} Template ID
 */
export async function createPdfTemplate(templateConfig) {
  const { name, pdfBase64, externalId, folderName = "Firefly Templates" } = templateConfig
  
  const url = `${API_BASE}/templates`
  
  const body = {
    name,
    external_id: externalId,
    folder_name: folderName,
    shared_link: true,
    // CRITICAL: Use PDF API instead of HTML API
    documents: [{
      name: name,
      file: pdfBase64, // Base64-encoded PDF with {{field}} tags
      // Let DocuSeal auto-detect fields from PDF tags
      fields: []
    }],
    // CRITICAL: Define roles for multi-party signing
    roles: ['buyer', 'cobuyer', 'firefly_signer'],
    // CRITICAL: Flatten fields to embed them permanently
    flatten: true
  }
  
  console.log('[PDF_TEMPLATE_BUILDER] Creating PDF template:', {
    url,
    templateName: name,
    hasPdf: !!pdfBase64,
    pdfLength: pdfBase64?.length || 0,
    roles: body.roles
  })
  
  const res = await fetch(url, { 
    method: 'POST', 
    headers: authHeaders(), 
    body: JSON.stringify(body) 
  })
  
  console.log('[PDF_TEMPLATE_BUILDER] Template creation response:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[PDF_TEMPLATE_BUILDER] Template creation failed:', errorText)
    throw new Error(`PDF template creation failed: ${res.status} - ${errorText}`)
  }
  
  const json = await res.json()
  console.log('[PDF_TEMPLATE_BUILDER] PDF template created successfully:', {
    templateId: json.id,
    templateName: json.name,
    fieldsCount: json.fields?.length || 0,
    fieldNames: json.fields?.map(f => f.name) || []
  })
  
  return json.id
}

/**
 * Generate PDF content with embedded DocuSeal field tags
 * This creates a PDF with {{field;type=text;role=buyer}} syntax
 * @param {Object} templateData - Template data
 * @returns {string} Base64-encoded PDF content
 */
export function generatePdfWithFieldTags(templateData) {
  // This would integrate with a PDF generation library like PDFKit or jsPDF
  // For now, we'll use a placeholder that represents the concept
  
  const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
  /Font <<
    /F1 5 0 R
  >>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(MASTER RETAIL PURCHASE AGREEMENT) Tj
0 -20 Td
(Buyer Name: {{buyer_full_name;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Buyer Email: {{buyer_email;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Buyer Address: {{buyer_address;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Buyer Phone: {{buyer_phone;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Brand: {{model_brand;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Model: {{model_code;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Year: {{model_year;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Dimensions: {{dimensions;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Base Price: {{price_base;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Options: {{price_options;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Freight: {{price_freight_est;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Setup: {{price_setup;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(Other: {{price_other;type=text;role=buyer;required=true}}) Tj
0 -20 Td
(TOTAL: {{price_total;type=text;role=buyer;required=true}}) Tj
0 -40 Td
(Buyer Initials 1: {{buyer_initials_1;type=initials;role=buyer;required=true}}) Tj
0 -20 Td
(Buyer Initials 2: {{buyer_initials_2;type=initials;role=buyer;required=true}}) Tj
0 -20 Td
(Buyer Initials 3: {{buyer_initials_3;type=initials;role=buyer;required=true}}) Tj
0 -20 Td
(Buyer Signature: {{buyer_signature;type=signature;role=buyer;required=true}}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000525 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
612
%%EOF
`
  
  // Convert to base64
  return Buffer.from(pdfContent).toString('base64')
}

/**
 * Build the Master Retail Purchase Agreement PDF template
 * @returns {Promise<string>} Template ID
 */
export async function buildMasterRetailPdfTemplate() {
  console.log('[PDF_TEMPLATE_BUILDER] Building Master Retail PDF template...')
  
  // Generate PDF with embedded field tags
  const pdfBase64 = generatePdfWithFieldTags({
    name: "Master Retail Purchase Agreement",
    fields: [
      'buyer_full_name', 'buyer_email', 'buyer_address', 'buyer_phone',
      'model_brand', 'model_code', 'model_year', 'dimensions',
      'price_base', 'price_options', 'price_freight_est', 'price_setup', 'price_other', 'price_total',
      'buyer_initials_1', 'buyer_initials_2', 'buyer_initials_3', 'buyer_signature'
    ]
  })
  
  // Create template in DocuSeal
  const templateId = await createPdfTemplate({
    name: "Firefly – Master Retail Purchase Agreement (PDF v1)",
    pdfBase64,
    externalId: "firefly_agreement_pdf_v1",
    folderName: "Firefly Templates"
  })
  
  console.log('[PDF_TEMPLATE_BUILDER] Master Retail PDF template created with ID:', templateId)
  
  return templateId
}
