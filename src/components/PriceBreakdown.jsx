const PriceBreakdown = ({ subtotal, tax, deliveryFee, total }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Simple amortized monthly payment using APR if provided
  const apr = parseFloat(import.meta.env.VITE_FINANCING_APR || '0.075')
  const years = parseFloat(import.meta.env.VITE_FINANCING_YEARS || '10')
  const n = Math.max(1, Math.round(years * 12))
  const r = apr / 12
  const monthlyPayment = r > 0 ? (total * r) / (1 - Math.pow(1 + r, -n)) : total / n

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">Price Breakdown</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <div className="font-medium">Subtotal</div>
          <div className="font-semibold">{formatCurrency(subtotal)}</div>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <div className="font-medium">Tax</div>
          <div className="font-semibold">{formatCurrency(tax)}</div>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <div className="font-medium">Delivery Fee</div>
          <div className="font-semibold">{formatCurrency(deliveryFee)}</div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="text-lg font-semibold">Total</div>
          <div className="text-xl font-bold text-yellow-400">{formatCurrency(total)}</div>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="text-sm text-yellow-300">
            <div className="font-medium">Estimated Monthly Payment:</div>
            <div className="text-lg font-semibold">
              {formatCurrency(monthlyPayment)} <span className="text-sm font-normal">({n} months at {(apr * 100).toFixed(1)}% APR)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PriceBreakdown 