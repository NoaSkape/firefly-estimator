import cloudinary from './cloudinary.js'

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
export async function getTemplate(templateId) {
  const url = `${API_BASE}/templates/${templateId}`
  
  console.log('[DOCUSEAL] Getting template info:', { url, templateId })
  
  const res = await fetch(url, { 
    method: 'GET', 
    headers: authHeaders()
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[DOCUSEAL] Get template failed:', {
      status: res.status,
      statusText: res.statusText,
      error: errorText
    })
    throw new Error(`DocuSeal get template failed: ${res.status}`)
  }
  
  const json = await res.json()
  console.log('[DOCUSEAL] Template info response:', {
    id: json.id,
    name: json.name,
    fieldsCount: json.fields?.length || 0,
    fieldNames: json.fields?.map(f => f.name) || []
  })
  
  return json
}

export async function createSubmission({ templateId, prefill, submitters, sendEmail = false, order = 'preserved', completedRedirectUrl, cancelRedirectUrl }) {
  const url = `${API_BASE}/submissions`
  
  // For template-based submissions, use 'fields' array with default_value
  // This ensures the data appears in both online view and downloaded PDF
  const fields = prefill ? Object.entries(prefill).map(([name, value]) => ({
    name: name,
    default_value: String(value || ''),
    readonly: true
  })) : []
  
  // Add fields to each submitter
  const submittersWithFields = (submitters || []).map(submitter => ({
    ...submitter,
    fields: fields
  }))
  
  const body = {
    template_id: templateId,
    order,
    send_email: !!sendEmail,
    completed_redirect_url: completedRedirectUrl,
    cancel_redirect_url: cancelRedirectUrl,
    submitters: submittersWithFields,
    // CRITICAL: Add flatten parameter to embed prefill data permanently in PDF
    flatten: true
  }
  
  console.log('[DOCUSEAL] Creating submission with:', {
    url,
    templateId,
    prefillKeys: prefill ? Object.keys(prefill) : [],
    fieldsCount: fields.length,
    submittersCount: submittersWithFields.length,
    sendEmail,
    order,
    completedRedirectUrl,
    cancelRedirectUrl
  })
  
  console.log('[DOCUSEAL] Request body:', JSON.stringify(body, null, 2))
  console.log('[DOCUSEAL] Fields being sent:', fields.map(f => ({ name: f.name, value: f.default_value })))
  console.log('[DOCUSEAL] Submitters with fields:', JSON.stringify(submittersWithFields, null, 2))
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
  
  console.log('[DOCUSEAL] Response status:', res.status, res.statusText)
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[DOCUSEAL] Error response:', errorText)
    throw new Error(`DocuSeal create submission failed: ${res.status}`)
  }
  
  const json = await res.json()
  console.log('[DOCUSEAL] Success response:', JSON.stringify(json, null, 2))
  
  // Handle different response formats
  let submissionId, signerUrl
  
  if (Array.isArray(json)) {
    // Response is an array of submitters
    const firstSubmitter = json[0]
    submissionId = firstSubmitter?.submission_id || firstSubmitter?.id
    signerUrl = firstSubmitter?.embed_src || firstSubmitter?.url
  } else {
    // Response is a single object
    submissionId = json?.id || json?.uuid || json?.submission?.id
    signerUrl = json?.invite_links?.[0]?.url || json?.submitters?.[0]?.url || json?.embed_src
  }
  
  return { submissionId, signerUrl, raw: json }
}

export async function getSubmission(submissionId) {
  const url = `${API_BASE}/submissions/${submissionId}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`DocuSeal get submission failed: ${res.status}`)
  return res.json()
}

export async function downloadFile(fileUrl) {
  const res = await fetch(fileUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer)
}

export async function uploadPdfToCloudinary({ buffer, folder = 'firefly-estimator/contracts', publicId }) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: 'raw', type: 'private', folder, public_id: publicId, format: 'pdf', access_mode: 'private' },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    ).end(buffer)
  })
}

export function signedCloudinaryUrl(publicId) {
  // raw private download URL with signature
  return cloudinary.utils.private_download_url(publicId, 'pdf', { resource_type: 'raw', type: 'private' })
}


