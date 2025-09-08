/**
 * Test script to examine the HTML content being generated for DocuSeal
 */

import { buildAgreementHtmlForDocuSeal } from './lib/contracts/html/agreement.js'

console.log('=== TESTING HTML GENERATION ===')

try {
  const html = buildAgreementHtmlForDocuSeal()
  
  console.log('\n=== HTML CONTENT (first 1000 chars) ===')
  console.log(html.substring(0, 1000))
  
  console.log('\n=== FIELD TAGS ANALYSIS ===')
  const fieldTags = html.match(/\{\{[^}]+\}\}/g) || []
  console.log('Total field tags found:', fieldTags.length)
  console.log('First 10 field tags:')
  fieldTags.slice(0, 10).forEach((tag, i) => {
    console.log(`${i + 1}. ${tag}`)
  })
  
  console.log('\n=== ROLE ANALYSIS ===')
  const buyerTags = fieldTags.filter(tag => tag.includes('role=buyer'))
  const cobuyerTags = fieldTags.filter(tag => tag.includes('role=cobuyer'))
  const firefllyTags = fieldTags.filter(tag => tag.includes('role=firefly'))
  
  console.log('Buyer role tags:', buyerTags.length)
  console.log('Co-buyer role tags:', cobuyerTags.length)
  console.log('Firefly role tags:', firefllyTags.length)
  
  console.log('\n=== SIGNATURE TAGS ===')
  const signatureTags = fieldTags.filter(tag => tag.includes('type=signature'))
  console.log('Signature tags found:', signatureTags.length)
  signatureTags.forEach(tag => console.log(' -', tag))
  
} catch (error) {
  console.error('Error generating HTML:', error)
}
