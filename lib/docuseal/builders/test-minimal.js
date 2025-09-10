/**
 * Minimal test template builder
 */

import { dsCreateTemplateFromHtml } from '../client.js'
import { buildMinimalTestHtml } from '../../contracts/html/test-minimal.js'

export async function buildMinimalTestTemplate() {
  console.log('[MINIMAL_TEST_BUILDER] Starting minimal test template creation...')
  
  const html = buildMinimalTestHtml()
  
  const templateBody = {
    name: "Minimal Test Template - Field Test",
    html: html,
    size: "Letter",
    external_id: "minimal_test_template",
    folder_name: "Firefly Templates",
    shared_link: true,
    roles: ['buyer']
  }
  
  console.log('[MINIMAL_TEST_BUILDER] Creating DocuSeal template...')
  const templateId = await dsCreateTemplateFromHtml(templateBody)
  console.log('[MINIMAL_TEST_BUILDER] Minimal test template created with ID:', templateId)
  
  return templateId
}
