// src/utils/testModelUrls.js
import { getAllValidSlugs, slugToModelId, modelIdToSlug, isValidSlug, getModelBySlug } from './modelUrlMapping'
import { MODELS } from '../data/models'

/**
 * Test utility to verify all model URLs work correctly
 */
export const testModelUrls = () => {
  console.log('🧪 Testing Model URL Mapping...')
  
  const slugs = getAllValidSlugs()
  const results = []
  
  slugs.forEach(slug => {
    const modelId = slugToModelId(slug)
    const model = getModelBySlug(slug, MODELS)
    const reverseSlug = modelIdToSlug(modelId)
    
    const result = {
      slug,
      modelId,
      modelName: model?.name || 'NOT FOUND',
      isValid: isValidSlug(slug),
      reverseMapping: reverseSlug === slug,
      hasModel: !!model
    }
    
    results.push(result)
    
    console.log(`✅ ${slug} → ${modelId} → ${model?.name || 'NOT FOUND'}`)
  })
  
  const failedTests = results.filter(r => !r.isValid || !r.hasModel || !r.reverseMapping)
  
  if (failedTests.length > 0) {
    console.error('❌ Failed tests:', failedTests)
    return false
  } else {
    console.log('🎉 All model URL tests passed!')
    return true
  }
}

/**
 * Generate a sitemap of all model URLs
 */
export const generateModelSitemap = () => {
  const slugs = getAllValidSlugs()
  const baseUrl = 'https://fireflyestimator.com'
  
  console.log('🗺️ Model Sitemap:')
  slugs.forEach(slug => {
    const model = getModelBySlug(slug, MODELS)
    console.log(`${baseUrl}/models/${slug} - ${model?.name || 'Unknown Model'}`)
  })
}

/**
 * Validate a specific URL
 */
export const validateModelUrl = (url) => {
  const slug = url.split('/').pop()
  const isValid = isValidSlug(slug)
  const model = getModelBySlug(slug, MODELS)
  
  return {
    url,
    slug,
    isValid,
    model: model?.name || null,
    modelId: model?.id || null
  }
} 