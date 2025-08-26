/**
 * Phone Number Formatting Utilities
 */

/**
 * Format a phone number to include dashes (e.g., 8303286109 -> 830-328-6109)
 * @param {string} phone - Phone number string
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // If it's not 10 digits, return as-is
  if (cleaned.length !== 10) return phone
  
  // Format as XXX-XXX-XXXX
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
}

/**
 * Check if a phone number is already formatted with dashes
 * @param {string} phone - Phone number string
 * @returns {boolean} True if already formatted
 */
export function isPhoneFormatted(phone) {
  if (!phone) return false
  return /^\d{3}-\d{3}-\d{4}$/.test(phone)
}

/**
 * Format phone number if it's not already formatted
 * @param {string} phone - Phone number string
 * @returns {string} Formatted phone number
 */
export function formatPhoneIfNeeded(phone) {
  if (!phone) return ''
  if (isPhoneFormatted(phone)) return phone
  return formatPhoneNumber(phone)
}
