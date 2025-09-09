import { getFieldMap } from './fieldMaps.js'

/**
 * Template registry for DocuSeal templates
 * Maps template keys to their IDs and field maps
 */
export const TEMPLATES = {
  masterRetail: {
    id: parseInt(process.env.DOCUSEAL_TEMPLATE_ID_AGREEMENT || process.env.DOCUSEAL_PURCHASE_TEMPLATE_ID || '1710241'),
    name: 'Master Retail Purchase Agreement',
    fieldMap: getFieldMap('masterRetail')
  },
  delivery: {
    id: parseInt(process.env.DOCUSEAL_TEMPLATE_ID_DELIVERY || '1710288'),
    name: 'Delivery, Set & Site Readiness Agreement',
    fieldMap: getFieldMap('delivery')
  }
}

/**
 * Get template configuration by key
 * @param {string} templateKey - Template key
 * @returns {Object} Template configuration
 */
export function getTemplate(templateKey) {
  const template = TEMPLATES[templateKey]
  if (!template) {
    throw new Error(`Unknown template key: ${templateKey}`)
  }
  return template
}

/**
 * Get all available template keys
 * @returns {Array<string>} Array of template keys
 */
export function getTemplateKeys() {
  return Object.keys(TEMPLATES)
}
