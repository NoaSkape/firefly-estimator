import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'
import { analytics } from '../../utils/analytics'
import CheckoutProgress from '../../components/CheckoutProgress'
import Breadcrumbs from '../../components/Breadcrumbs'

export default function PaymentMethod() {
  const navigate = useNavigate()
  const { buildId } = useParams()
  const { getToken } = useAuth()
  const [choice, setChoice] = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    const saved = localStorage.getItem('ff.checkout.paymentMethod')
    if (saved) setChoice(saved)
  }, [])

  async function continueNext() {
    if (!choice) { alert('Please select a payment method to continue'); return }
    try {
      const token = await getToken()
      const res = await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ financing: { method: choice }, step: 3 })
      })
      if (!res.ok) { addToast({ type:'error', message:'Could not save payment method' }); return }
      addToast({ type:'success', message:'Payment method saved' })
              analytics.paymentSelected(buildId, choice)
      const res2 = await fetch(`/api/builds/${buildId}/checkout-step`, { method:'POST', headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ step: 3 }) })
      if (!res2.ok) { const j = await res2.json().catch(()=>({})); addToast({ type:'error', message: j?.error || 'Complete required fields first' }); return }
              analytics.stepChanged(buildId, 2, 3)
    } catch {}
    navigate(`/checkout/${buildId}/buyer`)
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

  return (
    <div>
      <Breadcrumbs items={[{ label: 'My Builds', to: '/builds' }, { label: 'Checkout', to: `/checkout/${buildId}/payment` }, { label: 'Payment' }]} />
      <CheckoutProgress
        step={2}
        getBlockReason={(n)=> (n>=3 && !choice) ? 'Select a payment method first' : ''}
        onNavigate={async (n)=>{
          if (n === 1) { navigate(`/builds/${buildId}`); return }
          if (n === 3) { await continueNext(); return }
        }}
      />
      <div className="max-w-3xl mx-auto">
        <h1 className="section-header">Payment Method</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card id="cash" title="Cash / ACH" desc="Pay securely online and e-sign your purchase documents. Best for buyers who are ready to purchase now." />
          <Card id="finance" title="Financing" desc="Apply for modern financing or upload your existing pre-approval to secure your home." />
        </div>
        <div className="mt-6 flex gap-3">
          <button className="btn-primary" onClick={continueNext}>Continue</button>
          <a href="/faq" className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10">Questions? Read FAQs</a>
        </div>
      </div>
    </div>
  )
}


