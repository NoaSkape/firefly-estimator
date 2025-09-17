#!/usr/bin/env node

// Test script to verify admin endpoints are working
// Run with: node test-admin-endpoints.js

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Add a mock admin token for testing
        'Authorization': 'Bearer test-admin-token'
      }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const data = await response.json()
    
    console.log(`${method} ${endpoint}: ${response.status}`)
    if (response.ok) {
      console.log('  ✅ Success:', data.success ? 'true' : 'false')
    } else {
      console.log('  ❌ Error:', data.error || 'Unknown error')
    }
    
    return { status: response.status, data }
  } catch (error) {
    console.log(`${method} ${endpoint}: ERROR`)
    console.log('  ❌ Network error:', error.message)
    return { status: 0, error: error.message }
  }
}

async function runTests() {
  console.log('🧪 Testing Admin Endpoints...\n')
  
  // Test health endpoint (should work without auth)
  await testEndpoint('/api/admin/health')
  
  // Test admin endpoints (will fail auth but should not 404)
  await testEndpoint('/api/admin/me')
  await testEndpoint('/api/admin/dashboard')
  // Canonical endpoints
  await testEndpoint('/api/admin/users')
  await testEndpoint('/api/admin/analytics')
  await testEndpoint('/api/admin/financial/dashboard')
  await testEndpoint('/api/admin/dashboard/users/detailed')
  await testEndpoint('/api/admin/dashboard/orders/paid')
  await testEndpoint('/api/admin/dashboard/financial/revenue')
  await testEndpoint('/api/admin/dashboard/builds/active')
  await testEndpoint('/api/admin/content/blog')
  await testEndpoint('/api/admin/content/policies')
  
  console.log('\n✅ Admin endpoint tests completed!')
  console.log('\nNote: 401 errors are expected without proper authentication.')
  console.log('404 errors indicate missing endpoints that need to be implemented.')
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error)
}

export { testEndpoint, runTests }
