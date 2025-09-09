import fetch from 'node-fetch'

const API_BASE = process.env.DOCUSEAL_API_BASE || 'https://api.docuseal.co'
const API_KEY = process.env.DOCUSEAL_API_KEY

if (!API_KEY) {
  throw new Error('DOCUSEAL_API_KEY environment variable is required')
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Auth-Token': API_KEY,
  }
}

/**
 * Create a DocuSeal submission with proper prefill data
 * @param {Object} params
 * @param {number} params.templateId - DocuSeal template ID
 * @param {Array} params.submitters - Array of submitter objects
 * @param {boolean} params.sendEmail - Whether to send email notifications
 * @param {string} params.completedRedirectUrl - URL to redirect after completion
 * @param {string} params.cancelRedirectUrl - URL to redirect if cancelled
 * @returns {Promise<Object>} Submission response with signer URLs
 */
export async function createSubmission({
  templateId,
  submitters,
  sendEmail = false,
  completedRedirectUrl,
  cancelRedirectUrl
}) {
  const url = `${API_BASE}/submissions`
  
  const body = {
    template_id: templateId,
    order: 'preserved',
    send_email: sendEmail,
    completed_redirect_url: completedRedirectUrl,
    cancel_redirect_url: cancelRedirectUrl,
    submitters: submitters
  }
  
  console.log('[DOCUSEAL_CLIENT] Creating submission:', {
    templateId,
    submittersCount: submitters.length,
    sendEmail,
    completedRedirectUrl,
    cancelRedirectUrl
  })
  
  console.log('[DOCUSEAL_CLIENT] Request body:', JSON.stringify(body, null, 2))
  
  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  })
  
  console.log('[DOCUSEAL_CLIENT] Response status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[DOCUSEAL_CLIENT] Error response:', errorText)
    throw new Error(`DocuSeal API error: ${response.status} - ${errorText}`)
  }
  
  const data = await response.json()
  console.log('[DOCUSEAL_CLIENT] Success response:', JSON.stringify(data, null, 2))
  
  return data
}

/**
 * Get submission details
 * @param {string} submissionId - DocuSeal submission ID
 * @returns {Promise<Object>} Submission details
 */
export async function getSubmission(submissionId) {
  const url = `${API_BASE}/submissions/${submissionId}`
  
  const response = await fetch(url, {
    headers: authHeaders()
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[DOCUSEAL_CLIENT] Get submission error:', errorText)
    throw new Error(`DocuSeal API error: ${response.status} - ${errorText}`)
  }
  
  return response.json()
}

/**
 * Download a file from DocuSeal
 * @param {string} fileUrl - URL to download file from
 * @returns {Promise<Buffer>} File buffer
 */
export async function downloadFile(fileUrl) {
  const response = await fetch(fileUrl)
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer)
}