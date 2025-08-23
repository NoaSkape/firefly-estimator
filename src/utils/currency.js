/**
 * Format a number as currency with exactly 2 decimal places
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00'
  }
  
  // Round to 2 decimal places and format
  const rounded = Math.round(Number(amount) * 100) / 100
  return `$${rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Format a number as currency without the dollar sign
 * @param {number} amount - The amount to format
 * @returns {string} Formatted number string (e.g., "1,234.56")
 */
export function formatNumber(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00'
  }
  
  // Round to 2 decimal places and format
  const rounded = Math.round(Number(amount) * 100) / 100
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Round a number to exactly 2 decimal places
 * @param {number} amount - The amount to round
 * @returns {number} Rounded number
 */
export function roundToCents(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0
  }
  return Math.round(Number(amount) * 100) / 100
}
