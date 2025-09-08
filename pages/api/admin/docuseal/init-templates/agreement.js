/**
 * Admin API Route: Initialize DocuSeal Agreement Template
 * Creates the Master Retail Purchase Agreement template in DocuSeal using DOCX endpoint
 */

import { buildAgreementTemplate } from '../../../../../lib/docuseal/builders/agreement.js'

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // TODO: Add proper admin authentication here
    // For now, we'll proceed without auth check
    console.log('[API] Agreement template initialization requested (DOCX endpoint)')

    // Build the template using DOCX endpoint
    const templateId = await buildAgreementTemplate()

    // Log success and return template ID
    console.log('[API] Agreement template created successfully:', templateId)

    res.status(200).json({ 
      success: true,
      templateId,
      message: 'Agreement template created successfully via DOCX endpoint',
      envVariable: 'DOCUSEAL_TEMPLATE_ID_AGREEMENT',
      instructions: `Add this to your .env file: DOCUSEAL_TEMPLATE_ID_AGREEMENT=${templateId}`
    })

  } catch (error) {
    console.error('[API] Agreement template creation failed:', error)
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to create agreement template',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

// Simplified config for DOCX endpoint (no Puppeteer needed)
export const config = {
  api: {
    externalResolver: true,
    bodyParser: {
      sizeLimit: '5mb'
    }
  }
}
