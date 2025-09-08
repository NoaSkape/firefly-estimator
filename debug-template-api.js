/**
 * Debug the actual template creation API call
 */

import { buildAgreementTemplate } from './lib/docuseal/builders/agreement.js'

console.log('=== DEBUGGING TEMPLATE CREATION ===')

try {
  console.log('Creating agreement template...')
  const templateId = await buildAgreementTemplate()
  console.log('✅ Template created with ID:', templateId)
} catch (error) {
  console.error('❌ Error creating template:', error)
}
