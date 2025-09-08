/**
 * DocuSeal Template Builder for Pack 3: Delivery, Set & Site Readiness Agreement v2
 */

import { dsCreateTemplateFromHtml } from '../client.js'
import { buildDeliveryHtmlForDocuSeal } from '../../contracts/html/delivery.js'

export async function buildDeliveryTemplate() {
  console.log('[DELIVERY_BUILDER] Starting HTML template creation process...')

  // 1) Generate DocuSeal-compatible HTML with field tags
  console.log('[DELIVERY_BUILDER] Building HTML with DocuSeal field tags...')
  const html = buildDeliveryHtmlForDocuSeal()

  // 2) Create template via DocuSeal HTML API
  const templateBody = {
    name: "Firefly – Delivery, Set & Site Readiness Agreement v3",
    html: html,
    size: "Letter",
    external_id: "firefly_delivery_v3",
    folder_name: "Firefly Templates",
    shared_link: true
  }

  console.log('[DELIVERY_BUILDER] Creating DocuSeal template via HTML endpoint...')

  // 3) Create template via DocuSeal HTML API
  const templateId = await dsCreateTemplateFromHtml(templateBody)

  console.log('[DELIVERY_BUILDER] HTML template created successfully with ID:', templateId)
  
  return templateId
}
