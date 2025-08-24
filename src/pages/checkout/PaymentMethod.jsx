import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'
import analytics from '../../utils/analytics'
import FunnelProgress from '../../components/FunnelProgress'
import Breadcrumbs from '../../components/Breadcrumbs'
import offlineQueue from '../../utils/offlineQueue'
import { navigateToStep, updateBuildStep } from '../../utils/checkoutNavigation'

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
        body: JSON.stringify({ step: 7 }) 
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
      
      // Update build step to 7 (Contract)
      await updateBuildStep(buildId, 7, token)
      analytics.stepChanged(buildId, 6, 7)
      navigate(`/checkout/${buildId}/agreement`)
      
    } catch (error) {
      // Queue for offline processing if network fails
      if (!navigator.onLine) {
        offlineQueue.queueBuildUpdate(buildId, {
          financing: { method: choice },
          step: 7
        }, await getToken())
        
        addToast({
          type: 'warning',
          title: 'Offline Mode',
          message: 'Payment method will be saved when you reconnect.'
        })
        
        navigate(`/checkout/${buildId}/agreement`)
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

  function Card({ id, title, desc, features, icon }) {
    const active = choice === id
    return (
      <button
        type="button"
        onClick={() => setChoice(id)}
        className={`text-left rounded-lg border p-6 transition-colors ${active ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-800 bg-gray-900/50 hover:bg-gray-900/70'}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-white font-semibold text-lg">{title}</h3>
          </div>
          <span className={`w-6 h-6 rounded-full border-2 ${active ? 'bg-yellow-400 border-yellow-400' : 'bg-gray-700 border-gray-600'}`} />
        </div>
        <p className="text-sm text-white mb-4">{desc}</p>
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-white">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </button>
    )
  }

  const handleFunnelNavigation = (stepName, stepIndex) => {
    navigateToStep(stepName, 'Payment Method', buildId, true, build, navigate, addToast)
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
      <FunnelProgress 
        current="Payment Method" 
        isSignedIn={true} 
        onNavigate={handleFunnelNavigation}
        build={build}
        buildId={buildId}
      />
      <div className="max-w-3xl mx-auto">
        <h1 className="section-header">Payment Method</h1>
        
                 {/* Show current payment method if switching */}
         {build?.financing?.method && build.financing.method !== choice && (
           <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
             <div className="text-sm text-white">
               <strong>Current:</strong> {build.financing.method === 'cash' ? 'Cash / ACH' : 'Financing'}
               {build.buyerInfo?.firstName && (
                 <span className="ml-2">• Your buyer information will be preserved</span>
               )}
             </div>
           </div>
         )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            id="cash" 
            title="Cash / ACH" 
            desc="Pay securely online and e-sign your purchase documents. Best for buyers who are ready to purchase now."
                         icon={
               <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             }
            features={[
              "Secure online payment processing",
              "No credit check required",
              "Immediate purchase confirmation",
              "Electronic document signing",
              "Fastest path to ownership",
              "No monthly payments"
            ]}
          />
          <Card 
            id="finance" 
            title="Financing" 
            desc="Apply for modern financing or upload your existing pre-approval to secure your home."
            icon={
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            features={[
              "Competitive interest rates",
              "Flexible payment terms",
              "Quick pre-approval process",
              "Upload existing pre-approval",
              "No prepayment penalties",
              "Build credit history"
            ]}
          />
        </div>
        
                 {/* Additional Information */}
         {choice && (
           <div className="mt-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
             <h3 className="text-white font-medium mb-2">
               {choice === 'cash' ? 'Cash Payment Details' : 'Financing Details'}
             </h3>
             <div className="text-sm text-white space-y-1">
               {choice === 'cash' ? (
                 <>
                   <p>• Payment will be processed securely through our payment partner</p>
                   <p>• You'll receive immediate confirmation of your purchase</p>
                   <p>• All documents will be available for electronic signing</p>
                   <p>• Your tiny home will be scheduled for production immediately</p>
                 </>
               ) : (
                 <>
                   <p>• We'll guide you through the financing application process</p>
                   <p>• You can upload existing pre-approval documents</p>
                   <p>• Competitive rates and flexible terms available</p>
                   <p>• No impact on your current application until you're ready</p>
                 </>
               )}
             </div>
           </div>
         )}

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


