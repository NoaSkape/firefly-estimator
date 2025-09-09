/**
 * DocuSeal API Client
 * Handles template creation and submission management
 */

const API_BASE = process.env.DOCUSEAL_API_BASE || 'https://api.docuseal.co'
const API_KEY = process.env.DOCUSEAL_API_KEY || ''

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Auth-Token': API_KEY,
  }
}

/**
 * Get DocuSeal template information including field names
 * @param {number} templateId - Template ID
 * @returns {Promise<Object>} Template information with fields
 */
export async function dsGetTemplate(templateId) {
  const url = `${API_BASE}/templates/${templateId}`
  
  console.log('[DOCUSEAL_CLIENT] Getting template info:', { url, templateId })
  
  const res = await fetch(url, { 
    method: 'GET', 
    headers: authHeaders()
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[DOCUSEAL_CLIENT] Get template failed:', {
      status: res.status,
      statusText: res.statusText,
      error: errorText
    })
    throw new Error(`DocuSeal get template failed: ${res.status}`)
  }
  
  const json = await res.json()
  console.log('[DOCUSEAL_CLIENT] Template info response:', {
    id: json.id,
    name: json.name,
    fieldsCount: json.fields?.length || 0,
    fieldNames: json.fields?.map(f => f.name) || []
  })
  
  return json
}

/**
 * Create a DocuSeal template from HTML content
 * @param {Object} templateBody - Template configuration
 * @returns {Promise<string>} Template ID
 */
export async function dsCreateTemplateFromHtml(templateBody) {
  const url = `${API_BASE}/templates`
  
  console.log('[DOCUSEAL_CLIENT] Creating template from HTML:', {
    url,
    templateName: templateBody.name,
    hasHtml: !!templateBody.html,
    htmlLength: templateBody.html?.length || 0,
    roles: templateBody.roles
  })
  
  const res = await fetch(url, { 
    method: 'POST', 
    headers: authHeaders(), 
    body: JSON.stringify(templateBody) 
  })
  
  console.log('[DOCUSEAL_CLIENT] Template creation response:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[DOCUSEAL_CLIENT] Template creation failed:', errorText)
    throw new Error(`DocuSeal template creation failed: ${res.status} - ${errorText}`)
  }
  
  const json = await res.json()
  console.log('[DOCUSEAL_CLIENT] Template created successfully:', {
    templateId: json.id,
    templateName: json.name
  })
  
  return json.id
}

/**
 * Create a DocuSeal submission
 * @param {Object} submissionData - Submission configuration
 * @returns {Promise<Object>} Submission response
 */
export async function dsCreateSubmission(submissionData) {
  const url = `${API_BASE}/submissions`
  
  console.log('[DOCUSEAL_CLIENT] Creating submission:', {
    url,
    templateId: submissionData.template_id,
    submittersCount: submissionData.submitters?.length || 0,
    sendEmail: submissionData.send_email
  })
  
  const res = await fetch(url, { 
    method: 'POST', 
    headers: authHeaders(), 
    body: JSON.stringify(submissionData) 
  })
  
  console.log('[DOCUSEAL_CLIENT] Submission creation response:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[DOCUSEAL_CLIENT] Submission creation failed:', errorText)
    throw new Error(`DocuSeal submission creation failed: ${res.status} - ${errorText}`)
  }
  
  const json = await res.json()
  console.log('[DOCUSEAL_CLIENT] Submission created successfully:', {
    submissionId: json.id,
    inviteLinksCount: json.invite_links?.length || 0
  })
  
  return json
}

/**
 * Get submission status
 * @param {string} submissionId - Submission ID
 * @returns {Promise<Object>} Submission status
 */
export async function dsGetSubmission(submissionId) {
  const url = `${API_BASE}/submissions/${submissionId}`
  
  const res = await fetch(url, { headers: authHeaders() })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[DOCUSEAL_CLIENT] Get submission failed:', errorText)
    throw new Error(`DocuSeal get submission failed: ${res.status} - ${errorText}`)
  }
  
  return res.json()
}

/**
 * Download file from DocuSeal
 * @param {string} fileUrl - File URL
 * @returns {Promise<Buffer>} File buffer
 */
export async function dsDownloadFile(fileUrl) {
  const res = await fetch(fileUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer)
}
