/**
 * Unified DocuSeal Template Initialization
 * Creates all templates as v2 versions with proper content
 */

import type { NextApiRequest, NextApiResponse } from "next"
import { buildAgreementTemplate } from "../../../../../lib/docuseal/builders/agreement"
import { buildDeliveryTemplate } from "../../../../../lib/docuseal/builders/pack3_delivery"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    console.info("[TEMPLATE_INIT] Starting unified template initialization...")
    
    // Check environment variables
    if (!process.env.DOCUSEAL_API_KEY) {
      throw new Error('DOCUSEAL_API_KEY environment variable is required')
    }

    const results: Record<string, string> = {}
    
    console.info("[TEMPLATE_INIT] Creating Agreement v2...")
    results["Agreement v2"] = await buildAgreementTemplate()
    
    console.info("[TEMPLATE_INIT] Creating Delivery/Site Readiness v2...")
    results["Delivery/Site Readiness v2"] = await buildDeliveryTemplate()
    
    // Future templates can be added here:
    // results["Freight/Insurance v2"] = await buildFreightTemplate()
    // results["Final Acknowledgments v2"] = await buildFinalTemplate()
    
    console.info("[TEMPLATE_INIT] All templates created successfully:", results)
    
    const envInstructions = [
      `DOCUSEAL_TEMPLATE_ID_AGREEMENT=${results["Agreement v2"]}`,
      `DOCUSEAL_TEMPLATE_ID_DELIVERY=${results["Delivery/Site Readiness v2"]}`
    ]
    
    return res.status(200).json({ 
      ok: true, 
      templates: results,
      message: "All templates created successfully with v2 versions",
      envInstructions: envInstructions,
      dashboardUrl: "https://docuseal.com/templates",
      nextSteps: [
        "1. Update your .env file with the new template IDs above",
        "2. Verify templates in DocuSeal dashboard have readable content",
        "3. Archive or delete the old v1 templates to avoid confusion",
        "4. Test Step 7 contract flow with new template IDs"
      ]
    })
    
  } catch (e: any) {
    console.error("[TEMPLATE_INIT] Init templates failed:", e)
    return res.status(500).json({ 
      ok: false, 
      error: e?.message || "Template initialization failed",
      details: e?.stack
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
