import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ModelSelector from '../../components/ModelSelector'
import OptionSelector from '../../components/OptionSelector'
import { MODELS } from '../../data/models'
import { OPTIONS } from '../../data/options'

export default function Configure() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [models, setModels] = useState(MODELS)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedOptions, setSelectedOptions] = useState([])

  useEffect(() => {
    const m = MODELS.find(m => m.slug === slug || m.id === slug)
    if (m) setSelectedModelId(m.id)
  }, [slug])

  const model = models.find(m => m.id === selectedModelId)
  const base = model?.basePrice || 0
  const optionsTotal = selectedOptions.reduce((s, o) => s + (o.price || 0), 0)
  const total = base + optionsTotal

  function proceed() {
    const cart = { model, selections: selectedOptions, pricing: { base, options: optionsTotal, delivery: 0, total } }
    localStorage.setItem('ff.cart', JSON.stringify(cart))
    navigate('/checkout/delivery')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="card">
          <h2 className="section-header">Select Base Model</h2>
          <ModelSelector models={models} value={selectedModelId} onChange={setSelectedModelId} />
        </div>
        <div className="card">
          <h2 className="section-header">Customize Your Home</h2>
          <OptionSelector options={OPTIONS} selectedItems={selectedOptions} onSelectionChange={setSelectedOptions} />
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="sticky top-8 card">
          <h3 className="text-lg font-semibold mb-2">Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Base</span><span>${base.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Options</span><span>${optionsTotal.toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-800 pt-2"><span>Total</span><span>${total.toLocaleString()}</span></div>
          </div>
          <button className="btn-primary w-full mt-4" disabled={!model} onClick={proceed}>Proceed to Checkout</button>
        </div>
      </div>
    </div>
  )
}


