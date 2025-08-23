// Test script to verify delivery calculation
import { getDeliveryQuote } from './lib/delivery-quote.js'

// Mock settings
const settings = {
  factory: {
    address: '606 S 2nd Ave, Mansfield, TX 76063'
  },
  pricing: {
    delivery_rate_per_mile: 12.5,
    delivery_minimum: 2000
  }
}

// Test the calculation
async function testDeliveryCalculation() {
  console.log('Testing delivery calculation...')
  
  // Test with 303 miles (should be $3,787.50)
  const result = await getDeliveryQuote('Test Address', settings)
  
  console.log('Test result:', {
    miles: result.miles,
    fee: result.fee,
    ratePerMile: result.ratePerMile,
    minimum: result.minimum,
    expectedFee: 303 * 12.5, // Should be $3,787.50
    isCorrect: result.fee === 3787.5
  })
  
  // Test with 50 miles (should be $2,000 minimum)
  const result2 = await getDeliveryQuote('Nearby Address', settings)
  console.log('Nearby test result:', {
    miles: result2.miles,
    fee: result2.fee,
    expectedFee: Math.max(2000, 50 * 12.5), // Should be $2,000
    isCorrect: result2.fee === 2000
  })
}

testDeliveryCalculation().catch(console.error)
