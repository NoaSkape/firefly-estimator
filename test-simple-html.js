/**
 * Test creating a minimal HTML template to isolate the issue
 */

import { dsCreateTemplateFromHtml } from './lib/docuseal/client.js'

console.log('=== TESTING MINIMAL HTML TEMPLATE ===')

const minimalHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Test Template</title>
</head>
<body>
    <h1>Simple Test Document</h1>
    
    <p>Buyer Name: {{buyer_name;type=text;role=buyer;required=true}}</p>
    <p>Buyer Signature: {{buyer_signature;type=signature;role=buyer;required=true}}</p>
    
    <p>Firefly Signature: {{firefly_signature;type=signature;role=firefly_signer;required=true}}</p>
</body>
</html>`

const templateBody = {
  name: "Minimal Test Template",
  html: minimalHtml,
  size: "Letter",
  external_id: "test_minimal",
  folder_name: "Test",
  shared_link: true,
  roles: ['buyer', 'firefly_signer']
}

try {
  console.log('Creating minimal template...')
  console.log('Field tags in HTML:', (minimalHtml.match(/\{\{[^}]+\}\}/g) || []).length)
  
  const templateId = await dsCreateTemplateFromHtml(templateBody)
  console.log('✅ Minimal template created:', templateId)
  
} catch (error) {
  console.error('❌ Error creating minimal template:', error)
}
