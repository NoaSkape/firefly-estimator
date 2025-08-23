import { useEffect, useState } from 'react'
import { useUser, useAuth, SignIn } from '@clerk/clerk-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { trackEvent } from '../../utils/analytics'
import ConfirmLeaveModal from '../../components/ConfirmLeaveModal'
import FunnelProgress from '../../components/FunnelProgress'
import Breadcrumbs from '../../components/Breadcrumbs'

export default function Buyer() {
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const { buildId } = useParams()
  const { addToast } = useToast()
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: ''
  })
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ff.checkout.buyer') || '{}')
      setForm(f => ({ ...f, ...saved }))
    } catch {}
    if (user) setForm(f => ({
      ...f,
      firstName: f.firstName || user.firstName || '',
      lastName: f.lastName || user.lastName || '',
      email: f.email || user.primaryEmailAddress?.emailAddress || ''
    }))
  }, [user])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setDirty(true) }
  function validate() {
    const e = {}
    if (!form.firstName) e.firstName = 'Required'
    if (!form.lastName) e.lastName = 'Required'
    if (!form.email) e.email = 'Required'
    if (!form.address) e.address = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function next() {
    if (!validate()) { addToast({ type:'error', message:'Please complete required fields' }); return }
    try {
      const token = await getToken()
      setSaving(true)
      const res = await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ buyerInfo: form, step: 4 })
      })
      if (!res.ok) { addToast({ type: 'error', message: 'Please complete required fields' }); return }
      addToast({ type: 'success', message: 'Saved' })
      trackEvent('buyer_saved', { buildId })
      const res2 = await fetch(`/api/builds/${buildId}/checkout-step`, { method:'POST', headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ step: 4 }) })
      if (!res2.ok) { const j = await res2.json().catch(()=>({})); addToast({ type:'error', message: j?.error || 'Complete previous steps' }); return }
      trackEvent('step_changed', { buildId, step: 4 })
    } catch {} finally { setSaving(false); setDirty(false) }
    navigate(`/checkout/${buildId}/review`)
  }

  // Leave guards
  useEffect(() => {
    function onBeforeUnload(e) {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    function onPop(e) {
      e.preventDefault?.()
      setShowLeave(true)
      window.history.pushState({ stay: true }, '')
    }
    window.addEventListener('popstate', onPop)
    window.history.pushState({ stay: true }, '')
    return () => window.removeEventListener('popstate', onPop)
  }, [dirty])

  return (
    <div>
      <FunnelProgress current="Delivery Address" isSignedIn={true} onNavigate={()=>{}} />
      <div className="max-w-3xl mx-auto">
        {!isSignedIn && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Create Your Account</h2>
            <p className="text-sm text-gray-300 mb-3">Sign in or create an account so your design and checkout progress are saved.</p>
            <SignIn 
              fallbackRedirectUrl={location.pathname + location.search}
              afterSignInUrl={location.pathname + location.search}
              signUpUrl={`/sign-up?redirect=${encodeURIComponent(location.pathname + location.search)}`}
              appearance={{
                elements: {
                  formButtonPrimary: 'btn-primary w-full',
                  card: 'bg-transparent shadow-none p-0',
                  headerTitle: 'text-lg font-semibold text-gray-100',
                  headerSubtitle: 'text-gray-400',
                  formFieldInput: 'w-full px-3 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent',
                  formFieldLabel: 'block text-sm font-medium text-gray-300 mb-1',
                  footerActionLink: 'text-yellow-400 hover:text-yellow-300'
                }
              }}
              onError={(error) => {
                console.error('Buyer SignIn error:', error)
                addToast({
                  type: 'error',
                  title: 'Sign In Error',
                  message: 'Unable to sign in. Please check your credentials and try again.',
                  duration: 6000
                })
              }}
            />
          </div>
        )}
        <h1 className="section-header">Buyer & Delivery Info</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className={`input-field ${errors.firstName?'border-red-600':''}`} placeholder="First name" value={form.firstName} onChange={e=>setField('firstName', e.target.value)} />
          <input className={`input-field ${errors.lastName?'border-red-600':''}`} placeholder="Last name" value={form.lastName} onChange={e=>setField('lastName', e.target.value)} />
          <input className={`input-field md:col-span-2 ${errors.email?'border-red-600':''}`} placeholder="Email" value={form.email} onChange={e=>setField('email', e.target.value)} />
          <input className="input-field md:col-span-2" placeholder="Phone" value={form.phone} onChange={e=>setField('phone', e.target.value)} />
          <input className={`input-field md:col-span-2 ${errors.address?'border-red-600':''}`} placeholder="Address" value={form.address} onChange={e=>setField('address', e.target.value)} />
          <input className="input-field" placeholder="City" value={form.city} onChange={e=>setField('city', e.target.value)} />
          <input className="input-field" placeholder="State" value={form.state} onChange={e=>setField('state', e.target.value)} />
          <input className="input-field" placeholder="ZIP" value={form.zip} onChange={e=>setField('zip', e.target.value)} />
        </div>
        <div className="mt-6 flex gap-3">
          <button className="btn-primary" onClick={next}>Continue</button>
        </div>
        <ConfirmLeaveModal
          open={showLeave}
          saving={saving}
          onSaveLeave={async ()=>{ await next(); setShowLeave(false) }}
          onDiscard={()=>{ setDirty(false); setShowLeave(false); window.history.back() }}
          onStay={()=>setShowLeave(false)}
        />
      </div>
    </div>
  )
}


