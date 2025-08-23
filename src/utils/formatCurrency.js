/**
 * Format currency to the nearest cent
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00'
  }
  
  // Round to nearest cent
  const roundedAmount = Math.round(amount * 100) / 100
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundedAmount)
}

/**
 * Format miles to whole number
 * @param {number} miles - The miles to format
 * @returns {string} Formatted miles string
 */
export const formatMiles = (miles) => {
  if (typeof miles !== 'number' || isNaN(miles)) {
    return '0 miles'
  }
  
  // Round to nearest whole number
  const roundedMiles = Math.round(miles)
  
  return `${roundedMiles} miles`
}
