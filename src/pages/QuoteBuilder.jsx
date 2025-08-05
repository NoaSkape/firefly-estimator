import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import ModelSelector from '../components/ModelSelector'
import OptionSelector from '../components/OptionSelector'
import PriceBreakdown from '../components/PriceBreakdown'
import ClientInfoForm from '../components/ClientInfoForm'

const QuoteBuilder = ({ onGenerateQuote }) => {
  const [models, setModels] = useState([])
  const [options, setOptions] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState([])
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const { register, handleSubmit, formState: { errors } } = useForm()

  useEffect(() => {
    // Load models and options from JSON files
    const loadData = async () => {
      try {
        const [modelsResponse, optionsResponse] = await Promise.all([
          fetch('/data/models.json'),
          fetch('/data/options.json')
        ])
        
        const modelsData = await modelsResponse.json()
        const optionsData = await optionsResponse.json()
        
        setModels(modelsData)
        setOptions(optionsData.categories)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const calculateSubtotal = () => {
    const modelPrice = selectedModel?.basePrice || 0
    const optionsPrice = selectedOptions.reduce((sum, option) => sum + option.price, 0)
    return modelPrice + optionsPrice
  }

  const calculateTax = (subtotal) => {
    // TODO: Implement tax calculation based on location
    return subtotal * 0.08 // 8% tax rate placeholder
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax(subtotal)
    return subtotal + tax + deliveryFee
  }

  const handleModelSelect = (model) => {
    setSelectedModel(model)
  }

  const handleOptionToggle = (option) => {
    setSelectedOptions(prev => {
      const isSelected = prev.find(item => item.id === option.id)
      if (isSelected) {
        return prev.filter(item => item.id !== option.id)
      } else {
        return [...prev, option]
      }
    })
  }

  const handleDeliveryCalculation = async (zipCode) => {
    try {
      const response = await fetch('/api/calculate-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zipCode }),
      })
      
      const data = await response.json()
      if (data.success) {
        setDeliveryFee(data.deliveryFee)
      }
    } catch (error) {
      console.error('Error calculating delivery:', error)
    }
  }

  const onSubmit = (clientData) => {
    const quoteData = {
      model: selectedModel,
      options: selectedOptions,
      client: clientData,
      pricing: {
        subtotal: calculateSubtotal(),
        tax: calculateTax(calculateSubtotal()),
        deliveryFee,
        total: calculateTotal()
      },
      timestamp: new Date().toISOString(),
      quoteId: `FF-${Date.now()}`
    }
    
    onGenerateQuote(quoteData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Quote Builder */}
      <div className="lg:col-span-2 space-y-6">
        <div className="card">
          <h2 className="section-header">Select Base Model</h2>
          <ModelSelector 
            models={models}
            selectedModel={selectedModel}
            onSelect={handleModelSelect}
          />
        </div>

        <div className="card">
          <h2 className="section-header">Customize Your Home</h2>
          <OptionSelector 
            options={options}
            selectedOptions={selectedOptions}
            onToggle={handleOptionToggle}
          />
        </div>

        <div className="card">
          <h2 className="section-header">Client Information</h2>
          <ClientInfoForm 
            register={register}
            errors={errors}
            onDeliveryCalculation={handleDeliveryCalculation}
          />
        </div>
      </div>

      {/* Right Column - Price Breakdown */}
      <div className="lg:col-span-1">
        <div className="sticky top-8">
          <PriceBreakdown 
            selectedModel={selectedModel}
            selectedOptions={selectedOptions}
            deliveryFee={deliveryFee}
            subtotal={calculateSubtotal()}
            tax={calculateTax(calculateSubtotal())}
            total={calculateTotal()}
          />
          
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={!selectedModel}
            className="w-full btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Quote PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuoteBuilder 