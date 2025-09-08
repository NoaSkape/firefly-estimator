/**
 * Convert curly brace field syntax to HTML element syntax for DocuSeal
 * 
 * DocuSeal's HTML API requires HTML elements, not curly brace tags:
 * {{field;type=text;role=buyer}} → <text-field name="field" role="buyer">
 */

/**
 * Convert field tag syntax to HTML element syntax
 * @param {string} html - HTML content with {{field}} tags
 * @returns {string} HTML content with proper HTML field elements
 */
export function convertFieldTagsToHtmlElements(html) {
  return html.replace(/\{\{([^}]+)\}\}/g, (match, fieldDef) => {
    const params = parseFieldDefinition(fieldDef)
    return createHtmlFieldElement(params)
  })
}

/**
 * Parse field definition string into parameters
 * @param {string} fieldDef - Field definition like "name;type=text;role=buyer;required=true"
 * @returns {Object} Parsed parameters
 */
function parseFieldDefinition(fieldDef) {
  const parts = fieldDef.split(';')
  const params = { name: parts[0] }
  
  // Parse key=value pairs
  for (let i = 1; i < parts.length; i++) {
    const [key, value] = parts[i].split('=')
    if (key && value) {
      params[key] = value
    }
  }
  
  return params
}

/**
 * Create HTML field element based on parameters
 * @param {Object} params - Field parameters
 * @returns {string} HTML field element
 */
function createHtmlFieldElement(params) {
  const { name, type = 'text', role, required = 'true', ...otherParams } = params
  
  // Determine element type based on field type
  const elementType = getElementType(type)
  
  // Create base attributes
  const attrs = [
    `name="${name}"`,
    role && `role="${role}"`,
    `required="${required}"`,
    `style="${getFieldStyle(type)}"`
  ].filter(Boolean)
  
  // Add other parameters as attributes
  Object.entries(otherParams).forEach(([key, value]) => {
    if (key !== 'style') { // Don't override our style
      attrs.push(`${key}="${value}"`)
    }
  })
  
  return `<${elementType} ${attrs.join(' ')}></${elementType}>`
}

/**
 * Get HTML element type based on field type
 * @param {string} type - Field type
 * @returns {string} HTML element name
 */
function getElementType(type) {
  const typeMap = {
    'text': 'text-field',
    'signature': 'signature-field', 
    'initials': 'initials-field',
    'date': 'date-field',
    'number': 'number-field',
    'checkbox': 'checkbox-field',
    'select': 'select-field',
    'radio': 'radio-field',
    'image': 'image-field',
    'file': 'file-field'
  }
  
  return typeMap[type] || 'text-field'
}

/**
 * Get appropriate styling for field type
 * @param {string} type - Field type
 * @returns {string} CSS style string
 */
function getFieldStyle(type) {
  const baseStyle = "display: inline-block; border: 1px solid #ccc; padding: 4px;"
  
  const typeStyles = {
    'text': "width: 200px; height: 20px;",
    'signature': "width: 200px; height: 50px;",
    'initials': "width: 60px; height: 30px;", 
    'date': "width: 120px; height: 20px;",
    'number': "width: 100px; height: 20px;",
    'checkbox': "width: 20px; height: 20px;",
    'select': "width: 150px; height: 25px;",
    'radio': "width: 20px; height: 20px;"
  }
  
  return baseStyle + (typeStyles[type] || typeStyles['text'])
}
