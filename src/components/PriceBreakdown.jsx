const PriceBreakdown = ({ 
  selectedModel, 
  selectedOptions, 
  deliveryFee, 
  subtotal, 
  tax, 
  total 
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const optionsTotal = selectedOptions.reduce((sum, option) => sum + option.price, 0)

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Breakdown</h3>
      
      <div className="space-y-3">
        {selectedModel && (
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <div className="font-medium">{selectedModel.name}</div>
              <div className="text-sm text-gray-600">Base Model</div>
            </div>
            <div className="font-semibold">{formatCurrency(selectedModel.basePrice)}</div>
          </div>
        )}

        {selectedOptions.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <div className="font-medium">Options & Upgrades</div>
                <div className="text-sm text-gray-600">{selectedOptions.length} items selected</div>
              </div>
              <div className="font-semibold">{formatCurrency(optionsTotal)}</div>
            </div>
            
            {selectedOptions.map((option) => (
              <div key={option.id} className="flex justify-between items-center text-sm">
                <div className="text-gray-600">• {option.name}</div>
                <div>{formatCurrency(option.price)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <div className="font-medium">Subtotal</div>
          <div className="font-semibold">{formatCurrency(subtotal)}</div>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <div className="font-medium">Tax (8%)</div>
          <div className="font-semibold">{formatCurrency(tax)}</div>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <div className="font-medium">Delivery Fee</div>
          <div className="font-semibold">{formatCurrency(deliveryFee)}</div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="text-lg font-semibold">Total</div>
          <div className="text-xl font-bold text-primary-600">{formatCurrency(total)}</div>
        </div>
      </div>

      {selectedModel && (
        <div className="mt-4 p-3 bg-primary-50 rounded-lg">
          <div className="text-sm text-primary-800">
            <div className="font-medium">Estimated Monthly Payment:</div>
            <div className="text-lg font-semibold">
              {formatCurrency(total / 120)} <span className="text-sm font-normal">(120 months at 7.5% APR)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PriceBreakdown 