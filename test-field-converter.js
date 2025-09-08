/**
 * Test the field converter functionality
 */

import { convertFieldTagsToHtmlElements } from './lib/contracts/html/field-converter.js'

console.log('=== TESTING FIELD CONVERTER ===')

// Test basic conversions
const testCases = [
  '{{buyer_full_name;type=text;role=buyer;required=true}}',
  '{{buyer_signature;type=signature;role=buyer;required=true}}',
  '{{buyer_initials;type=initials;role=buyer;required=true}}',
  '{{cobuyer_full_name;type=text;role=cobuyer;required=false}}'
]

testCases.forEach((testCase, i) => {
  console.log(`\n${i + 1}. Input:  ${testCase}`)
  const converted = convertFieldTagsToHtmlElements(testCase)
  console.log(`   Output: ${converted}`)
})

// Test with actual HTML content
const htmlContent = `
<div>
  <p>Buyer Name: {{buyer_full_name;type=text;role=buyer;required=true}}</p>
  <p>Signature: {{buyer_signature;type=signature;role=buyer;required=true}}</p>
</div>
`

console.log('\n=== FULL HTML CONVERSION ===')
console.log('Input HTML:')
console.log(htmlContent)
console.log('\nConverted HTML:')
console.log(convertFieldTagsToHtmlElements(htmlContent))
