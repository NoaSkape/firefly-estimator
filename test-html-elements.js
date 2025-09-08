/**
 * Test creating HTML template with HTML element syntax instead of {{}} tags
 */

import { dsCreateTemplateFromHtml } from './lib/docuseal/client.js'

console.log('=== TESTING HTML ELEMENT SYNTAX ===')

const htmlElementSyntax = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>HTML Element Test</title>
</head>
<body>
    <h1>HTML Element Test Document</h1>
    
    <p>Buyer Name: <text-field name="buyer_name" role="buyer" required="true" style="display: inline-block; width: 200px; height: 20px;"></text-field></p>
    
    <p>Buyer Signature: <signature-field name="buyer_signature" role="buyer" required="true" style="display: inline-block; width: 200px; height: 50px;"></signature-field></p>
    
    <p>Firefly Signature: <signature-field name="firefly_signature" role="firefly_signer" required="true" style="display: inline-block; width: 200px; height: 50px;"></signature-field></p>
</body>
</html>`

const templateBody = {
  name: "HTML Element Test Template",
  html: htmlElementSyntax,
  size: "Letter", 
  external_id: "test_html_elements",
  folder_name: "Test",
  shared_link: true,
  roles: ['buyer', 'firefly_signer']
}

try {
  console.log('Creating HTML element template...')
  
  const templateId = await dsCreateTemplateFromHtml(templateBody)
  console.log('✅ HTML element template created:', templateId)
  
} catch (error) {
  console.error('❌ Error creating HTML element template:', error)
}
