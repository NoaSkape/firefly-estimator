// src/utils/verifyImplementation.js
import { 
  getAllValidSlugs, 
  slugToModelId, 
  modelIdToSlug, 
  isValidSlug, 
  getModelBySlug,
  modelNameToSlug,
  generateModelUrl
} from './modelUrlMapping'
import { MODELS } from '../data/models'

/**
 * Comprehensive verification of the URL implementation
 */
export const verifyImplementation = () => {
  console.log('🔍 Verifying Model URL Implementation...')
  
  const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    errors: []
  }

  // Test 1: All slugs are valid
  console.log('\n📋 Test 1: Validating all slugs...')
  const slugs = getAllValidSlugs()
  results.totalTests += slugs.length
  
  slugs.forEach(slug => {
    if (isValidSlug(slug)) {
      results.passedTests++
      console.log(`✅ ${slug} is valid`)
    } else {
      results.failedTests++
      results.errors.push(`❌ ${slug} is invalid`)
      console.log(`❌ ${slug} is invalid`)
    }
  })

  // Test 2: All models have corresponding slugs
  console.log('\n📋 Test 2: Checking model to slug mapping...')
  MODELS.forEach(model => {
    results.totalTests++
    const slug = modelNameToSlug(model.name)
    const modelId = slugToModelId(slug)
    
    if (modelId === model.id) {
      results.passedTests++
      console.log(`✅ ${model.name} → ${slug} → ${modelId}`)
    } else {
      results.failedTests++
      results.errors.push(`❌ ${model.name} mapping failed`)
      console.log(`❌ ${model.name} → ${slug} → ${modelId} (expected ${model.id})`)
    }
  })

  // Test 3: Reverse mapping works
  console.log('\n📋 Test 3: Testing reverse mapping...')
  slugs.forEach(slug => {
    results.totalTests++
    const modelId = slugToModelId(slug)
    const reverseSlug = modelIdToSlug(modelId)
    
    if (reverseSlug === slug) {
      results.passedTests++
      console.log(`✅ ${slug} ↔ ${modelId} ↔ ${reverseSlug}`)
    } else {
      results.failedTests++
      results.errors.push(`❌ Reverse mapping failed for ${slug}`)
      console.log(`❌ ${slug} ↔ ${modelId} ↔ ${reverseSlug}`)
    }
  })

  // Test 4: URL generation
  console.log('\n📋 Test 4: Testing URL generation...')
  MODELS.forEach(model => {
    results.totalTests++
    const url = generateModelUrl(model)
    const expectedSlug = modelNameToSlug(model.name)
    const expectedUrl = `/models/${expectedSlug}`
    
    if (url === expectedUrl) {
      results.passedTests++
      console.log(`✅ ${model.name} → ${url}`)
    } else {
      results.failedTests++
      results.errors.push(`❌ URL generation failed for ${model.name}`)
      console.log(`❌ ${model.name} → ${url} (expected ${expectedUrl})`)
    }
  })

  // Test 5: Model retrieval by slug
  console.log('\n📋 Test 5: Testing model retrieval...')
  slugs.forEach(slug => {
    results.totalTests++
    const model = getModelBySlug(slug, MODELS)
    const expectedModelId = slugToModelId(slug)
    
    if (model && model.id === expectedModelId) {
      results.passedTests++
      console.log(`✅ ${slug} → ${model.name}`)
    } else {
      results.failedTests++
      results.errors.push(`❌ Model retrieval failed for ${slug}`)
      console.log(`❌ ${slug} → ${model?.name || 'NOT FOUND'}`)
    }
  })

  // Test 6: Edge cases
  console.log('\n📋 Test 6: Testing edge cases...')
  const edgeCases = [
    { input: null, test: 'null slug' },
    { input: '', test: 'empty slug' },
    { input: 'invalid-slug', test: 'invalid slug' },
    { input: 'MAGNOLIA', test: 'uppercase slug' },
    { input: 'Magnolia', test: 'titlecase slug' }
  ]

  edgeCases.forEach(({ input, test }) => {
    results.totalTests++
    const isValid = isValidSlug(input)
    const model = getModelBySlug(input, MODELS)
    
    if (input === null || input === '' || input === 'invalid-slug') {
      if (!isValid && !model) {
        results.passedTests++
        console.log(`✅ ${test}: correctly rejected`)
      } else {
        results.failedTests++
        results.errors.push(`❌ ${test}: should be rejected`)
        console.log(`❌ ${test}: incorrectly accepted`)
      }
    } else {
      // Case-insensitive slugs should work
      if (isValid && model) {
        results.passedTests++
        console.log(`✅ ${test}: correctly handled`)
      } else {
        results.failedTests++
        results.errors.push(`❌ ${test}: should be accepted`)
        console.log(`❌ ${test}: incorrectly rejected`)
      }
    }
  })

  // Summary
  console.log('\n📊 Test Summary:')
  console.log(`Total Tests: ${results.totalTests}`)
  console.log(`Passed: ${results.passedTests}`)
  console.log(`Failed: ${results.failedTests}`)
  console.log(`Success Rate: ${((results.passedTests / results.totalTests) * 100).toFixed(1)}%`)

  if (results.failedTests > 0) {
    console.log('\n❌ Failed Tests:')
    results.errors.forEach(error => console.log(error))
    return false
  } else {
    console.log('\n🎉 All tests passed! Implementation is ready for production.')
    return true
  }
}

/**
 * Generate a sitemap for all model URLs
 */
export const generateSitemap = () => {
  const baseUrl = 'https://fireflyestimator.com'
  const slugs = getAllValidSlugs()
  
  console.log('\n🗺️ Model Sitemap:')
  console.log('<?xml version="1.0" encoding="UTF-8"?>')
  console.log('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  
  slugs.forEach(slug => {
    const model = getModelBySlug(slug, MODELS)
    const url = `${baseUrl}/models/${slug}`
    console.log(`  <url>`)
    console.log(`    <loc>${url}</loc>`)
    console.log(`    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`)
    console.log(`    <changefreq>weekly</changefreq>`)
    console.log(`    <priority>0.8</priority>`)
    console.log(`  </url>`)
  })
  
  console.log('</urlset>')
}

/**
 * Test specific URL validation
 */
export const testSpecificUrl = (url) => {
  const slug = url.split('/').pop()
  const validation = {
    url,
    slug,
    isValid: isValidSlug(slug),
    modelId: slugToModelId(slug),
    model: getModelBySlug(slug, MODELS),
    generatedUrl: null
  }
  
  if (validation.model) {
    validation.generatedUrl = generateModelUrl(validation.model)
  }
  
  console.log('🔍 URL Validation Results:')
  console.log(JSON.stringify(validation, null, 2))
  
  return validation
} 