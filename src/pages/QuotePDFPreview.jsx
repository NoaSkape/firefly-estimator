import { useRef } from 'react'
import { generatePDF } from '../utils/generatePDF'

const QuotePDFPreview = ({ quoteData, onBack }) => {
  const pdfRef = useRef(null)

  const handleDownloadPDF = async () => {
    // Expect quoteData to already contain model, options, client, fees
    await generatePDF(quoteData)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="btn-secondary"
        >
          ← Back to Builder
        </button>
        <button
          onClick={handleDownloadPDF}
          className="btn-primary"
        >
          Download PDF
        </button>
      </div>

      {/* PDF Preview */}
      <div className="card max-w-4xl mx-auto" ref={pdfRef}>
        {/* Header */}
        <div className="text-center border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Firefly Tiny Homes</h1>
              <p className="text-gray-600">Custom Tiny Home Quote</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Quote ID: {quoteData.quoteId} | Date: {new Date(quoteData.timestamp).toLocaleDateString()}
          </div>
        </div>

        {/* Client Information */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Name:</span> {quoteData.client.name}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {quoteData.client.phone}
            </div>
            <div>
              <span className="font-medium">Email:</span> {quoteData.client.email}
            </div>
            <div>
              <span className="font-medium">Address:</span> {quoteData.client.address}
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Model</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">{quoteData.model.name}</h3>
            <p className="text-gray-600 mb-2">{quoteData.model.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Length:</span> {quoteData.model.specs.length}</div>
              <div><span className="font-medium">Width:</span> {quoteData.model.specs.width}</div>
              <div><span className="font-medium">Height:</span> {quoteData.model.specs.height}</div>
              <div><span className="font-medium">Weight:</span> {quoteData.model.specs.weight}</div>
            </div>
          </div>
        </div>

        {/* Selected Options */}
        {quoteData.options.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Options</h2>
            <div className="space-y-3">
              {quoteData.options.map((option) => (
                <div key={option.id} className="flex justify-between items-start py-2 border-b border-gray-100">
                  <div>
                    <div className="font-medium">{option.name}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                  <div className="font-semibold">{formatCurrency(option.price)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Breakdown */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Base Model:</span>
              <span>{formatCurrency(quoteData.model.basePrice)}</span>
            </div>
            {quoteData.options.length > 0 && (
              <div className="flex justify-between">
                <span>Options & Upgrades:</span>
                <span>{formatCurrency(quoteData.options.reduce((sum, opt) => sum + opt.price, 0))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(quoteData.pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (8%):</span>
              <span>{formatCurrency(quoteData.pricing.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>{formatCurrency(quoteData.pricing.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
              <span>Total:</span>
              <span>{formatCurrency(quoteData.pricing.total)}</span>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• This quote is valid for 30 days from the date of issue</p>
            <p>• A 25% deposit is required to secure your build slot</p>
            <p>• Delivery fee is an estimate and may vary based on final destination</p>
            <p>• Build time is approximately 8-12 weeks from deposit</p>
            <p>• All prices are subject to change without notice</p>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-300 h-12 mb-2"></div>
              <span className="text-sm text-gray-600">Client Signature</span>
            </div>
            <div>
              <div className="border-b border-gray-300 h-12 mb-2"></div>
              <span className="text-sm text-gray-600">Date</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Firefly Tiny Homes | 123 Tiny Home Lane | Tiny Town, TT 12345</p>
          <p>Phone: (555) 123-4567 | Email: info@fireflytinyhomes.com</p>
        </div>
      </div>
    </div>
  )
}

export default QuotePDFPreview 