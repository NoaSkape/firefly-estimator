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
  const [allModels, setAllModels] = useState(MODELS)
  const [selectedOptions, setSelectedOptions] = useState([])
  const [clientInfo, setClientInfo] = useState({})
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [searchParams] = useSearchParams()
  const taxRate = parseFloat(import.meta.env.VITE_TAX_RATE) || 0.0625 // Default 6.25% tax rate

  // Load latest model data from API and merge over local definitions
  useEffect(() => {
    let cancelled = false
    async function load() {
      const local = MODELS.map(m => ({ ...m }))
      setAllModels(local)
      try {
        const responses = await Promise.all(local.map(m => fetch(`/api/models/${m.id}`)))
        const apiModels = await Promise.all(responses.map(r => (r.ok ? r.json() : null)))
        const merged = local.map((m, i) => {
          const api = apiModels[i]
          if (!api) return m
          return {
            ...m,
            // prefer API values where available
            name: api.name || m.name,
            description: api.description ?? m.description,
            basePrice: typeof api.basePrice === 'number' ? api.basePrice : m.basePrice,
            // Only surface specs if explicitly present in API; otherwise leave undefined to hide on cards
            width: api?.width ?? null,
            length: api?.length ?? null,
            height: api?.height ?? null,
            weight: api?.weight ?? null,
            bedrooms: api?.bedrooms ?? null,
            bathrooms: api?.bathrooms ?? null,
            squareFeet: api?.squareFeet ?? null,
            images: Array.isArray(api.images) ? api.images : [],
            subtitle: api.modelCode || m.subtitle,
          }
        })
        if (!cancelled) setAllModels(merged)
      } catch (_) {
        // ignore; fall back to local models
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Check for initial model selection from URL or detail page, using enriched models
  useEffect(() => {
    const modelId = searchParams.get('model')
    if (modelId && !selectedModel) {
      const model = allModels.find(m => m.id === modelId)
      if (model) {
        setSelectedModel(model)
      }
    }
  }, [searchParams, selectedModel, allModels])

  // Calculate delivery fee when ZIP code changes
  useEffect(() => {
    if (clientInfo.zip) {
      // Stub: $3/mile rule or call a function calculateDelivery(clientInfo.zip)
      const baseDeliveryFee = parseFloat(import.meta.env.VITE_BASE_DELIVERY_FEE) || 500
      setDeliveryFee(baseDeliveryFee)
    }
  }, [clientInfo.zip])

  // Handle model selection
  const handleModelSelect = (modelId) => {
    const model = allModels.find(m => m.id === modelId)
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
            models={allModels}
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