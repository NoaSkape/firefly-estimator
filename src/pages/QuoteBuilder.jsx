import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MODELS } from '../data/models'
import { OPTIONS } from '../data/options'
import ClientInfoForm from '../components/ClientInfoForm'
import ModelSelector from '../components/ModelSelector'
import OptionSelector from '../components/OptionSelector'
import PriceBreakdown from '../components/PriceBreakdown'
import { generatePDF } from '../utils/generatePDF'

const QuoteBuilder = () => {
  // Component State
  const [selectedModel, setSelectedModel] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState([])
  const [clientInfo, setClientInfo] = useState({})
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [searchParams] = useSearchParams()
  const taxRate = parseFloat(import.meta.env.VITE_TAX_RATE) || 0.08 // Default 8% tax rate

  // Check for initial model selection from URL or detail page
  useEffect(() => {
    const modelCode = searchParams.get('model')
    if (modelCode && !selectedModel) {
      const model = MODELS.find(m => m.modelCode === modelCode)
      if (model) {
        setSelectedModel(model)
      }
    }
  }, [searchParams, selectedModel])

  // Calculate delivery fee when ZIP code changes
  useEffect(() => {
    if (clientInfo.zip) {
      // Stub: $3/mile rule or call a function calculateDelivery(clientInfo.zip)
      const baseDeliveryFee = parseFloat(import.meta.env.VITE_BASE_DELIVERY_FEE) || 500
      setDeliveryFee(baseDeliveryFee)
    }
  }, [clientInfo.zip])

  // Handle model selection
  const handleModelSelect = (modelCode) => {
    const model = MODELS.find(m => m.modelCode === modelCode)
    setSelectedModel(model)
    // Reset options & fees when model changes
    setSelectedOptions([])
    setDeliveryFee(0)
  }

  // Compute pricing
  const base = selectedModel?.basePrice || 0
  const optionsTotal = selectedOptions.reduce((sum, o) => sum + o.price, 0)
  const subtotal = base + optionsTotal
  const tax = subtotal * taxRate
  const total = subtotal + tax + deliveryFee

  // Validation for PDF generation
  const canGeneratePDF = selectedModel && selectedOptions.length > 0 && clientInfo.fullName && clientInfo.zip

  // Handle PDF generation
  const handleGeneratePDF = () => {
    if (!canGeneratePDF) return

    generatePDF({
      model: selectedModel,
      options: selectedOptions,
      client: clientInfo,
      fees: { subtotal, tax, deliveryFee, total }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Quote Builder */}
      <div className="lg:col-span-2 space-y-6">
        <div className="card">
          <h2 className="section-header">Select Base Model</h2>
          <ModelSelector
            models={MODELS}
            value={selectedModel?.id || ''}
            onChange={handleModelSelect}
          />
        </div>

        <div className="card">
          <h2 className="section-header">Customize Your Home</h2>
          <OptionSelector
            options={OPTIONS}
            selectedItems={selectedOptions}
            onSelectionChange={items => setSelectedOptions(items)}
          />
        </div>

        <div className="card">
          <h2 className="section-header">Client Information</h2>
          <ClientInfoForm
            value={clientInfo}
            onChange={info => setClientInfo(info)}
          />
        </div>
      </div>

      {/* Right Column - Price Breakdown */}
      <div className="lg:col-span-1">
        <div className="sticky top-8">
          <PriceBreakdown
            subtotal={subtotal}
            tax={tax}
            deliveryFee={deliveryFee}
            total={total}
          />
          
          <button
            onClick={handleGeneratePDF}
            disabled={!canGeneratePDF}
            className="w-full btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Quote PDF
          </button>
          
          {!canGeneratePDF && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-2">To generate a quote PDF, please:</p>
                <ul className="list-disc list-inside space-y-1">
                  {!selectedModel && <li>Select a base model</li>}
                  {selectedOptions.length === 0 && <li>Choose at least one option</li>}
                  {!clientInfo.fullName && <li>Enter your full name</li>}
                  {!clientInfo.zip && <li>Enter your ZIP code</li>}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuoteBuilder 