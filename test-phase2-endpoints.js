#!/usr/bin/env node

// Test script for Phase 2 Admin Panel endpoints
// Run with: node test-phase2-endpoints.js

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

async function testEndpoint(endpoint, method = 'GET', body = null, expectedStatus = 200) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-admin-token'
      }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const data = await response.json()
    
    const status = response.status === expectedStatus ? '✅' : '❌'
    console.log(`${status} ${method} ${endpoint}: ${response.status}`)
    
    if (response.ok) {
      console.log(`  Success: ${data.success ? 'true' : 'false'}`)
      if (data.data) {
        console.log(`  Data keys: ${Object.keys(data.data).join(', ')}`)
      }
    } else {
      console.log(`  Error: ${data.error || 'Unknown error'}`)
    }
    
    return { status: response.status, success: response.ok, data }
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}: ERROR - ${error.message}`)
    return { status: 0, success: false, error: error.message }
  }
}

async function runPhase2Tests() {
  console.log('🚀 Starting Phase 2 Admin Panel Endpoint Tests\n')
  
  // Test 1: Advanced Analytics
  console.log('📊 Testing Advanced Analytics Endpoints...')
  await testEndpoint('/api/admin/analytics')
  await testEndpoint('/api/admin/analytics/revenue?range=30d')
  await testEndpoint('/api/admin/analytics/orders?range=7d')
  await testEndpoint('/api/admin/analytics/customers?range=90d')
  await testEndpoint('/api/admin/analytics/models?range=30d')
  await testEndpoint('/api/admin/analytics/predictive/revenue?months=6')
  await testEndpoint('/api/admin/analytics/customers/lifetime-value')
  await testEndpoint('/api/admin/analytics/funnel/conversion')
  console.log('')
  
  // Test 2: Order Management
  console.log('📦 Testing Order Management Endpoints...')
  await testEndpoint('/api/admin/orders')
  await testEndpoint('/api/admin/orders?page=1&limit=10&status=confirmed')
  await testEndpoint('/api/admin/orders?search=test&sort=createdAt&order=desc')
  await testEndpoint('/api/admin/orders/analytics/insights?range=30d')
  await testEndpoint('/api/admin/orders/alerts/overdue')
  console.log('')
  
  // Test 3: Financial Dashboard
  console.log('💰 Testing Financial Dashboard Endpoints...')
  await testEndpoint('/api/admin/financial/dashboard?range=30d')
  await testEndpoint('/api/admin/financial/revenue?range=30d&groupBy=day')
  await testEndpoint('/api/admin/financial/profit-margins?range=30d')
  await testEndpoint('/api/admin/financial/forecast?months=6')
  console.log('')
  
  // Test 4: Content Management
  console.log('📝 Testing Content Management Endpoints...')
  await testEndpoint('/api/admin/content/blog')
  await testEndpoint('/api/admin/content/blog?status=published&page=1&limit=10')
  await testEndpoint('/api/admin/content/policies')
  await testEndpoint('/api/admin/content/policies?type=privacy&status=active')
  await testEndpoint('/api/admin/content/analytics?range=30d')
  console.log('')
  
  // Test 5: User Management
  console.log('👥 Testing User Management Endpoints...')
  await testEndpoint('/api/admin/users')
  await testEndpoint('/api/admin/users?page=1&limit=10&role=customer')
  await testEndpoint('/api/admin/users?search=test&status=active')
  await testEndpoint('/api/admin/users/analytics/overview?range=30d')
  console.log('')
  
  // Test 6: Notification System
  console.log('🔔 Testing Notification System Endpoints...')
  await testEndpoint('/api/admin/notifications')
  await testEndpoint('/api/admin/notifications?type=info&status=unread')
  await testEndpoint('/api/admin/notifications/analytics/overview?range=30d')
  await testEndpoint('/api/admin/notifications/settings')
  console.log('')
  
  // Test 7: Create Test Data
  console.log('🧪 Testing Data Creation Endpoints...')
  
  // Create test blog post
  const testBlogPost = {
    title: 'Test Blog Post',
    slug: 'test-blog-post',
    content: 'This is a test blog post for Phase 2 testing.',
    excerpt: 'Test excerpt',
    status: 'draft',
    tags: ['test', 'phase2'],
    category: 'testing'
  }
  await testEndpoint('/api/admin/content/blog', 'POST', testBlogPost, 201)
  
  // Create test policy
  const testPolicy = {
    title: 'Test Policy',
    slug: 'test-policy',
    content: 'This is a test policy for Phase 2 testing.',
    type: 'other',
    status: 'draft',
    version: '1.0'
  }
  await testEndpoint('/api/admin/content/policies', 'POST', testPolicy, 201)
  
  // Create test notification
  const testNotification = {
    title: 'Test Notification',
    message: 'This is a test notification for Phase 2 testing.',
    type: 'info',
    category: 'system',
    priority: 'normal'
  }
  await testEndpoint('/api/admin/notifications', 'POST', testNotification, 201)
  
  console.log('')
  
  // Test 8: Error Handling
  console.log('⚠️  Testing Error Handling...')
  await testEndpoint('/api/admin/orders/nonexistent', 'GET', null, 404)
  await testEndpoint('/api/admin/content/blog/invalid-slug', 'GET', null, 404)
  await testEndpoint('/api/admin/notifications/invalid-id', 'GET', null, 404)
  console.log('')
  
  console.log('✅ Phase 2 Admin Panel Endpoint Tests Complete!')
  console.log('\n📋 Test Summary:')
  console.log('- Advanced Analytics: 8 endpoints tested')
  console.log('- Order Management: 5 endpoints tested')
  console.log('- Financial Dashboard: 4 endpoints tested')
  console.log('- Content Management: 5 endpoints tested')
  console.log('- User Management: 4 endpoints tested')
  console.log('- Notification System: 4 endpoints tested')
  console.log('- Data Creation: 3 endpoints tested')
  console.log('- Error Handling: 3 endpoints tested')
  console.log('\n🎉 Total: 36 endpoints tested across 8 categories')
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase2Tests().catch(console.error)
}

export { testEndpoint, runPhase2Tests }
