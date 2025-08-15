import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ModelSelector from '../../components/ModelSelector'
import PublicOptionSelector from '../../public/PublicOptionSelector'
import PackagesSelector from '../../components/PackagesSelector'
import { MODELS } from '../../data/models'
import { OPTIONS } from '../../data/options'

export default function Configure() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [models, setModels] = useState(MODELS)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedOptions, setSelectedOptions] = useState([])
  const [selectedPackage, setSelectedPackage] = useState('')
  const [packages, setPackages] = useState([
    { key:'comfort', name:'Comfort Pack', priceDelta: 3500, items:['Mini-split HVAC','Upgraded insulation'] },
    { key:'chef', name:'Chef’s Kitchen', priceDelta: 5200, items:['Solid-surface counters','Gas range','Deep sink'] },
    { key:'spa', name:'Spa Bath', priceDelta: 4300, items:['Tile shower','Upgraded vanity'] },
    { key:'outdoor', name:'Outdoor Living', priceDelta: 2800, items:['Extended porch','Exterior lighting'] },
  ])

  useEffect(() => {
    const m = MODELS.find(m => m.slug === slug || m.id === slug)
    if (m) setSelectedModelId(m.id)
    // pick preset from query if provided
    const sp = new URLSearchParams(window.location.search)
    const preset = sp.get('pkg')
    if (preset) setSelectedPackage(preset)
    const addon = sp.get('addon')
    if (addon) {
      // noop here; addon pricing handled later when persisted
    }
  }, [slug])

  const model = models.find(m => m.id === selectedModelId)
  const base = model?.basePrice || 0
  const optionsTotal = selectedOptions.reduce((s, o) => s + (o.price || 0), 0)
  const pkgDelta = (packages.find(p => (p.key||p.name) === selectedPackage)?.priceDelta) || 0
  const total = base + optionsTotal + pkgDelta

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
          <PublicOptionSelector options={OPTIONS} value={selectedOptions} onChange={setSelectedOptions} />
        </div>
        <div className="card">
          <PackagesSelector packages={packages} value={selectedPackage} onChange={setSelectedPackage} />
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="sticky top-8 card">
          <h3 className="text-lg font-semibold mb-2">Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Base</span><span>${base.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Options</span><span>${optionsTotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Package</span><span>${pkgDelta.toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-800 pt-2"><span>Total</span><span>${total.toLocaleString()}</span></div>
          </div>
          <button className="btn-primary w-full mt-4" disabled={!model} onClick={proceed}>Proceed to Checkout</button>
        </div>
      </div>
    </div>
  )
}


