#!/usr/bin/env node

// Test script for Phase 3 Admin Panel endpoints
// Run with: node test-phase3-endpoints.js

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

async function runPhase3Tests() {
  console.log('🚀 Starting Phase 3 Admin Panel Endpoint Tests\n')
  
  // Test 1: AI Insights
  console.log('🤖 Testing AI Insights Endpoints...')
  await testEndpoint('/api/admin/ai-insights/insights')
  await testEndpoint('/api/admin/ai-insights/insights?type=revenue&priority=high')
  await testEndpoint('/api/admin/ai-insights/insights?type=customer&limit=5')
  console.log('')
  
  // Test 2: Advanced Reporting
  console.log('📊 Testing Advanced Reporting Endpoints...')
  await testEndpoint('/api/admin/reports')
  await testEndpoint('/api/admin/reports?type=financial&isPublic=true')
  await testEndpoint('/api/admin/reports/templates')
  console.log('')
  
  // Test 3: Integration Hub
  console.log('🔗 Testing Integration Hub Endpoints...')
  await testEndpoint('/api/admin/integrations')
  await testEndpoint('/api/admin/integrations?type=payment&status=active')
  await testEndpoint('/api/admin/integrations/templates')
  console.log('')
  
  // Test 4: Security & Audit
  console.log('🔒 Testing Security & Audit Endpoints...')
  await testEndpoint('/api/admin/security/events')
  await testEndpoint('/api/admin/security/dashboard?range=7d')
  await testEndpoint('/api/admin/security/recommendations')
  console.log('')
  
  // Test 5: Workflow Automation
  console.log('⚙️  Testing Workflow Automation Endpoints...')
  await testEndpoint('/api/admin/workflows')
  await testEndpoint('/api/admin/workflows?isActive=true&triggerType=event')
  await testEndpoint('/api/admin/workflows/templates')
  console.log('')
  
  // Test 6: Performance Monitoring
  console.log('📈 Testing Performance Monitoring Endpoints...')
  await testEndpoint('/api/admin/monitoring/health')
  await testEndpoint('/api/admin/monitoring/performance?range=24h')
  await testEndpoint('/api/admin/monitoring/alerts')
  await testEndpoint('/api/admin/monitoring/logs?level=error&limit=10')
  await testEndpoint('/api/admin/monitoring/config')
  console.log('')
  
  // Test 7: Data Export & Backup
  console.log('💾 Testing Data Export & Backup Endpoints...')
  await testEndpoint('/api/admin/export')
  await testEndpoint('/api/admin/export?type=full&format=json')
  await testEndpoint('/api/admin/export/templates')
  await testEndpoint('/api/admin/export/backup/status')
  console.log('')
  
  // Test 8: Create Test Data
  console.log('🧪 Testing Data Creation Endpoints...')
  
  // Create test AI insight
  const testInsight = {
    type: 'revenue',
    priority: 'high',
    title: 'Test Revenue Insight',
    description: 'This is a test revenue insight for Phase 3 testing.',
    recommendation: 'Test recommendation for revenue optimization.',
    impact: 'high',
    confidence: 85,
    actionItems: ['Test action 1', 'Test action 2'],
    estimatedValue: 100000
  }
  await testEndpoint('/api/admin/ai-insights/insights', 'POST', testInsight, 201)
  
  // Create test report
  const testReport = {
    name: 'Test Report',
    description: 'This is a test report for Phase 3 testing.',
    type: 'financial',
    columns: ['createdAt', 'totalAmount', 'status'],
    aggregations: [
      { field: 'totalAmount', function: 'sum', alias: 'totalRevenue' }
    ],
    groupBy: ['status']
  }
  await testEndpoint('/api/admin/reports', 'POST', testReport, 201)
  
  // Create test integration
  const testIntegration = {
    name: 'Test Integration',
    type: 'payment',
    provider: 'Test Provider',
    status: 'pending',
    configuration: {
      apiKey: 'test_key',
      endpoint: 'https://api.test.com'
    },
    isEnabled: false
  }
  await testEndpoint('/api/admin/integrations', 'POST', testIntegration, 201)
  
  // Create test workflow
  const testWorkflow = {
    name: 'Test Workflow',
    description: 'This is a test workflow for Phase 3 testing.',
    trigger: {
      type: 'manual'
    },
    steps: [
      {
        id: 'step1',
        name: 'Test Step',
        type: 'notification',
        config: {
          title: 'Test Notification',
          message: 'This is a test notification',
          type: 'info'
        }
      }
    ],
    isActive: true
  }
  await testEndpoint('/api/admin/workflows', 'POST', testWorkflow, 201)
  
  // Create test export
  const testExport = {
    name: 'Test Export',
    description: 'This is a test export for Phase 3 testing.',
    type: 'selective',
    format: 'json',
    collections: ['orders'],
    includeMetadata: true
  }
  await testEndpoint('/api/admin/export', 'POST', testExport, 201)
  
  console.log('')
  
  // Test 9: Error Handling
  console.log('⚠️  Testing Error Handling...')
  await testEndpoint('/api/admin/ai-insights/insights/invalid-id', 'GET', null, 404)
  await testEndpoint('/api/admin/reports/invalid-id', 'GET', null, 404)
  await testEndpoint('/api/admin/integrations/invalid-id', 'GET', null, 404)
  await testEndpoint('/api/admin/workflows/invalid-id', 'GET', null, 404)
  await testEndpoint('/api/admin/export/invalid-id', 'GET', null, 404)
  console.log('')
  
  console.log('✅ Phase 3 Admin Panel Endpoint Tests Complete!')
  console.log('\n📋 Test Summary:')
  console.log('- AI Insights: 3 endpoints tested')
  console.log('- Advanced Reporting: 3 endpoints tested')
  console.log('- Integration Hub: 3 endpoints tested')
  console.log('- Security & Audit: 3 endpoints tested')
  console.log('- Workflow Automation: 3 endpoints tested')
  console.log('- Performance Monitoring: 5 endpoints tested')
  console.log('- Data Export & Backup: 4 endpoints tested')
  console.log('- Data Creation: 5 endpoints tested')
  console.log('- Error Handling: 5 endpoints tested')
  console.log('\n🎉 Total: 34 endpoints tested across 9 categories')
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase3Tests().catch(console.error)
}

export { testEndpoint, runPhase3Tests }
