import cloudinary from './cloudinary.js'

const API_BASE = process.env.DOCUSEAL_API_BASE || 'https://api.docuseal.co'
const API_KEY = process.env.DOCUSEAL_API_KEY || ''

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Auth-Token': API_KEY,
  }
}

export async function createSubmission({ templateId, prefill, submitters, sendEmail = false, order = 'preserved', completedRedirectUrl, cancelRedirectUrl }) {
  const url = `${API_BASE}/submissions`
  
  // Convert prefill data to DocuSeal fields format
  const fields = prefill ? Object.entries(prefill).map(([name, value]) => ({
    name: name,
    default_value: String(value || ''),
    readonly: true
  })) : []
  
  // Merge fields into submitters (each submitter gets all fields)
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
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
  
  console.log('[DOCUSEAL] Response status:', res.status, res.statusText)
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[DOCUSEAL] Error response:', errorText)
    throw new Error(`DocuSeal create submission failed: ${res.status}`)
  }
  
  const json = await res.json()
  console.log('[DOCUSEAL] Success response:', JSON.stringify(json, null, 2))
  const firstSignerUrl = json?.invite_links?.[0]?.url || json?.submitters?.[0]?.url
  return { submissionId: json?.id || json?.uuid || json?.submission?.id, signerUrl: firstSignerUrl, raw: json }
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


