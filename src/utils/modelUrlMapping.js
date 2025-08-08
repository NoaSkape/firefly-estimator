// src/utils/modelUrlMapping.js

// Map model names to URL slugs (removing "The" and converting to lowercase)
const MODEL_URL_MAPPING = {
  'magnolia': 'aps-630',
  'bluebonnet': 'aps-601', 
  'nest': 'aps-520ms',
  'azul': 'aps-523',
  'meadow': 'aps-528',
  'lookout': 'aps-527b',
  'canyon': 'aps-532',
  'falcon': 'apx-118sl',
  'hilltop': 'aps-544',
  'juniper-xl': 'apx-150',
  'sage': 'aps-550',
  'homestead': 'aps-531',
  'willow': 'apx-118',
  'ranch': 'apx-122',
  'juniper': 'aps-522a',
  'pecan': 'aps-590'
}

// Reverse mapping for converting model IDs back to URL slugs
const MODEL_ID_TO_SLUG = Object.fromEntries(
  Object.entries(MODEL_URL_MAPPING).map(([slug, id]) => [id, slug])
)

/**
 * Convert a model name to a URL slug
 * @param {string} modelName - The full model name (e.g., "The Magnolia")
 * @returns {string} URL slug (e.g., "magnolia")
 */
export const modelNameToSlug = (modelName) => {
  if (!modelName) return null
  
  // Remove "The" prefix and convert to lowercase
  const cleanName = modelName.replace(/^the\s+/i, '').toLowerCase()
  
  // Handle special cases
  if (cleanName === 'juniper xl') return 'juniper-xl'
  
  return cleanName
}

/**
 * Convert a URL slug to a model ID
 * @param {string} slug - The URL slug (e.g., "magnolia")
 * @returns {string} Model ID (e.g., "aps-630")
 */
export const slugToModelId = (slug) => {
  if (!slug) return null
  return MODEL_URL_MAPPING[slug.toLowerCase()]
}

/**
 * Convert a model ID to a URL slug
 * @param {string} modelId - The model ID (e.g., "aps-630")
 * @returns {string} URL slug (e.g., "magnolia")
 */
export const modelIdToSlug = (modelId) => {
  if (!modelId) return null
  return MODEL_ID_TO_SLUG[modelId]
}

/**
 * Get all valid URL slugs
 * @returns {string[]} Array of valid URL slugs
 */
export const getAllValidSlugs = () => {
  return Object.keys(MODEL_URL_MAPPING)
}

/**
 * Check if a slug is valid
 * @param {string} slug - The URL slug to validate
 * @returns {boolean} True if the slug is valid
 */
export const isValidSlug = (slug) => {
  return slug && MODEL_URL_MAPPING.hasOwnProperty(slug.toLowerCase())
}

/**
 * Get the model data for a given slug
 * @param {string} slug - The URL slug
 * @param {Array} models - Array of model objects
 * @returns {Object|null} Model object or null if not found
 */
export const getModelBySlug = (slug, models) => {
  const modelId = slugToModelId(slug)
  if (!modelId) return null
  
  return models.find(model => model.id === modelId) || null
}

/**
 * Generate SEO-friendly URL for a model
 * @param {Object} model - Model object
 * @returns {string} SEO-friendly URL
 */
export const generateModelUrl = (model) => {
  if (!model || !model.name) return null
  const slug = modelNameToSlug(model.name)
  return slug ? `/models/${slug}` : null
} 