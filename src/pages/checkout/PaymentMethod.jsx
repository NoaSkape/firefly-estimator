import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'
import analytics from '../../utils/analytics'
import FunnelProgress from '../../components/FunnelProgress'
import Breadcrumbs from '../../components/Breadcrumbs'
import offlineQueue from '../../utils/offlineQueue'

export default function PaymentMethod() {
  const navigate = useNavigate()
  const { buildId } = useParams()
  const { getToken } = useAuth()
  const [choice, setChoice] = useState('')
  const [build, setBuild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    loadBuild()
  }, [buildId])

  async function loadBuild() {
    try {
      const token = await getToken()
      const res = await fetch(`/api/builds/${buildId}`, { 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      })
      if (res.ok) {
        const buildData = await res.json()
        setBuild(buildData)
        
        // Set choice from build data or localStorage
        const savedChoice = buildData.financing?.method || localStorage.getItem('ff.checkout.paymentMethod')
        if (savedChoice) setChoice(savedChoice)
      }
    } catch (error) {
      addToast({ 
        type: 'error', 
        title: 'Error Loading Build',
        message: 'Unable to load build data. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  async function continueNext() {
    if (!choice) { 
      addToast({ 
        type: 'warning', 
        title: 'Payment Method Required',
        message: 'Please select a payment method to continue.'
      })
      return 
    }
    
    setSaving(true)
    try {
      const token = await getToken()
      
      // Preserve existing buyer info when switching payment methods
      const existingBuyerInfo = build?.buyerInfo || {}
      const existingFinancing = build?.financing || {}
      
      const updateData = {
        financing: { 
          ...existingFinancing,
          method: choice 
        },
        step: 3
      }
      
      // If switching from finance to cash, preserve buyer info but clear financing details
      if (existingFinancing.method === 'finance' && choice === 'cash') {
        updateData.financing = {
          method: choice,
          // Keep lender info for potential future use
          lender: existingFinancing.lender
        }
        addToast({
          type: 'info',
          title: 'Payment Method Changed',
          message: 'Switched to cash payment. Your buyer information has been preserved.'
        })
      }
      
      // If switching from cash to finance, preserve buyer info
      if (existingFinancing.method === 'cash' && choice === 'finance') {
        addToast({
          type: 'info',
          title: 'Payment Method Changed',
          message: 'Switched to financing. Your buyer information has been preserved.'
        })
      }
      
      const res = await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(updateData)
      })
      
      if (!res.ok) { 
        addToast({ 
          type: 'error', 
          title: 'Save Failed',
          message: 'Could not save payment method. Please try again.'
        })
        return 
      }
      
      addToast({ 
        type: 'success', 
        title: 'Payment Method Saved',
        message: 'Your payment method has been updated.'
      })
      
      analytics.paymentSelected(buildId, choice)
      
      // Validate step progression
      const res2 = await fetch(`/api/builds/${buildId}/checkout-step`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify({ step: 3 }) 
      })
      
      if (!res2.ok) { 
        const j = await res2.json().catch(() => ({}))
        addToast({ 
          type: 'error', 
          title: 'Validation Failed',
          message: j?.error || 'Please complete required fields before continuing.'
        })
        return 
      }
      
      analytics.stepChanged(buildId, 2, 3)
      navigate(`/checkout/${buildId}/buyer`)
      
    } catch (error) {
      // Queue for offline processing if network fails
      if (!navigator.onLine) {
        offlineQueue.queueBuildUpdate(buildId, {
          financing: { method: choice },
          step: 3
        }, await getToken())
        
        addToast({
          type: 'warning',
          title: 'Offline Mode',
          message: 'Payment method will be saved when you reconnect.'
        })
        
        navigate(`/checkout/${buildId}/buyer`)
      } else {
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to save payment method. Please check your connection.'
        })
      }
    } finally {
      setSaving(false)
    }
  }

  function Card({ id, title, desc }) {
    const active = choice === id
    return (
      <button
        type="button"
        onClick={() => setChoice(id)}
        className={`text-left rounded-lg border p-4 transition-colors ${active ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-800 bg-gray-900/50 hover:bg-gray-900/70'}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-gray-100 font-medium">{title}</h3>
          <span className={`w-5 h-5 rounded-full ${active ? 'bg-yellow-400' : 'bg-gray-700'}`} />
        </div>
        <p className="mt-2 text-sm text-gray-300">{desc}</p>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading payment options...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'My Builds', to: '/builds' }, { label: 'Checkout', to: `/checkout/${buildId}/payment` }, { label: 'Payment' }]} />
      <FunnelProgress current="Payment Method" isSignedIn={true} onNavigate={()=>{}} />
      <div className="max-w-3xl mx-auto">
        <h1 className="section-header">Payment Method</h1>
        
        {/* Show current payment method if switching */}
        {build?.financing?.method && build.financing.method !== choice && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
            <div className="text-sm text-blue-200">
              <strong>Current:</strong> {build.financing.method === 'cash' ? 'Cash / ACH' : 'Financing'}
              {build.buyerInfo?.firstName && (
                <span className="ml-2">• Your buyer information will be preserved</span>
              )}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card id="cash" title="Cash / ACH" desc="Pay securely online and e-sign your purchase documents. Best for buyers who are ready to purchase now." />
          <Card id="finance" title="Financing" desc="Apply for modern financing or upload your existing pre-approval to secure your home." />
        </div>
        
        <div className="mt-6 flex gap-3">
          <button 
            className="btn-primary" 
            onClick={continueNext}
            disabled={saving || !choice}
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
          <a href="/faq" className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10">
            Questions? Read FAQs
          </a>
        </div>
      </div>
    </div>
  )
}


