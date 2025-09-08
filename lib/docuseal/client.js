/**
 * DocuSeal API Client for Template Creation
 * Minimal client for DocuSeal /v1/templates creation via fetch
 */

const BASE = process.env.DOCUSEAL_BASE_URL || "https://api.docuseal.co"
const API_KEY = process.env.DOCUSEAL_API_KEY

if (!API_KEY) {
  throw new Error('DOCUSEAL_API_KEY environment variable is required')
}

/**
 * Create a DocuSeal template from PDF with fields
 * @param {Object} params - Template creation parameters
 * @param {string} params.name - Template name
 * @param {Array} params.roles - Array of role objects with name and optional flag
 * @param {Array} params.fields - Array of field definitions
 * @param {string} params.pdfBase64 - Base64 encoded PDF content
 * @returns {Promise<string>} Template ID
 */
export async function createTemplateByPdf(params) {
  const { name, roles, fields, pdfBase64 } = params

  console.log('[DOCUSEAL_CLIENT] Creating template:', name)
  console.log('[DOCUSEAL_CLIENT] Roles:', roles.length)
  console.log('[DOCUSEAL_CLIENT] Fields:', fields.length)
  console.log('[DOCUSEAL_CLIENT] PDF size:', Math.round(pdfBase64.length / 1024), 'KB')

  const response = await fetch(`${BASE}/templates`, {
    method: "POST",
    headers: {
      'X-Auth-Token': API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      submitters: roles.map(role => ({
        name: role.name,
        is_optional: role.optional || false
      })),
      documents: [{ 
        name: "agreement.pdf", 
        file: pdfBase64 
      }],
      fields: fields.map(field => ({
        name: field.name || `${field.type}_${field.role}`,
        type: field.type,
        role: field.role,
        required: field.required !== false,
        ...(field.anchor_text && { 
          areas: [{ 
            // DocuSeal will auto-place based on anchor text search
            attachment_uuid: "{{DOCUMENT_UUID}}", // Will be replaced by DocuSeal
            x: 0, y: 0, w: 100, h: 20, page: 1,
            option: field.anchor_text
          }]
        }),
        ...(field.multiple && { multiple: true })
      }))
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[DOCUSEAL_CLIENT] Error response:', errorText)
    throw new Error(`DocuSeal createTemplate failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  console.log('[DOCUSEAL_CLIENT] Template created successfully:', data.id)
  
  return data.id || data.template?.id
}
