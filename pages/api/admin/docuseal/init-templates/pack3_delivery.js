/**
 * API Route: Create DocuSeal Template for Pack 3 - Delivery Agreement
 * POST /api/admin/docuseal/init-templates/pack3_delivery
 */

import { buildDeliveryTemplate } from "../../../../../lib/docuseal/builders/pack3_delivery.js"

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[API] Starting Pack 3 Delivery template creation...')
    
    const templateId = await buildDeliveryTemplate()
    
    console.log('[API] Pack 3 Delivery template created successfully:', templateId)
    
    res.status(200).json({ 
      success: true,
      templateId,
      templateName: "Firefly – Delivery, Set & Site Readiness Agreement v1",
      message: `Template created successfully! Add DOCUSEAL_TEMPLATE_ID_DELIVERY=${templateId} to your .env file`,
      dashboardUrl: "https://docuseal.com/templates"
    })
    
  } catch (error) {
    console.error('[API] Pack 3 Delivery template creation failed:', error)
    
    res.status(500).json({ 
      success: false,
      error: error.message || "Template creation failed",
      details: error.stack
    })
  }
}

// Enable external resolvers and configure body parser
export const config = {
  api: {
    externalResolver: true,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
