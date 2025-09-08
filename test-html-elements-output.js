/**
 * Test script to examine the HTML elements being generated for DocuSeal
 */

import { buildAgreementHtmlForDocuSeal } from './lib/contracts/html/agreement.js'

console.log('=== TESTING HTML ELEMENT GENERATION ===')

try {
  const html = buildAgreementHtmlForDocuSeal()
  
  console.log('\n=== HTML CONTENT (first 1000 chars) ===')
  console.log(html.substring(0, 1000))
  
  console.log('\n=== HTML ELEMENTS ANALYSIS ===')
  const textFields = html.match(/<text-field[^>]*>/g) || []
  const signatureFields = html.match(/<signature-field[^>]*>/g) || []
  const initialsFields = html.match(/<initials-field[^>]*>/g) || []
  
  console.log('Text fields found:', textFields.length)
  console.log('Signature fields found:', signatureFields.length)
  console.log('Initials fields found:', initialsFields.length)
  console.log('Total field elements:', textFields.length + signatureFields.length + initialsFields.length)
  
  console.log('\n=== FIRST 5 TEXT FIELDS ===')
  textFields.slice(0, 5).forEach((field, i) => {
    console.log(`${i + 1}. ${field}`)
  })
  
  console.log('\n=== ALL SIGNATURE FIELDS ===')
  signatureFields.forEach((field, i) => {
    console.log(`${i + 1}. ${field}`)
  })
  
  console.log('\n=== ROLE DISTRIBUTION ===')
  const buyerFields = html.match(/role="buyer"/g) || []
  const cobuyerFields = html.match(/role="cobuyer"/g) || []
  const fireflyFields = html.match(/role="firefly_signer"/g) || []
  
  console.log('Buyer role fields:', buyerFields.length)
  console.log('Co-buyer role fields:', cobuyerFields.length)  
  console.log('Firefly role fields:', fireflyFields.length)
  
} catch (error) {
  console.error('Error generating HTML:', error)
}
