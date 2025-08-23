/**
 * Calculate the total purchase price for a build using the same logic as the Overview page
 * @param {Object} build - The build object
 * @param {Object} settings - The settings object containing pricing defaults
 * @returns {number} The total purchase price
 */
export function calculateTotalPurchasePrice(build, settings = {}) {
  // Calculate comprehensive pricing breakdown
  const basePrice = Number(build?.selections?.basePrice || 0)
  const options = build?.selections?.options || []
  const optionsSubtotal = options.reduce((sum, opt) => sum + Number(opt.price || 0) * (opt.quantity || 1), 0)
  const subtotalBeforeFees = basePrice + optionsSubtotal
  
  // Get fees from settings or build
  const deliveryFee = Number(build?.pricing?.delivery || 0)
  const titleFee = Number(settings?.pricing?.title_fee_default || 500)
  const setupFee = Number(settings?.pricing?.setup_fee_default || 3000)
  const taxRate = Number(settings?.pricing?.tax_rate_percent || 6.25) / 100
  
  const feesSubtotal = deliveryFee + titleFee + setupFee
  const subtotalBeforeTax = subtotalBeforeFees + feesSubtotal
  const salesTax = subtotalBeforeTax * taxRate
  const total = subtotalBeforeTax + salesTax
  
  return total
}
