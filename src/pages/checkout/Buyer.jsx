import { useEffect, useState } from 'react'
import { useUser, useAuth, SignIn } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import CheckoutProgress from '../../components/CheckoutProgress'

export default function Buyer() {
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: ''
  })

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

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function next() {
    localStorage.setItem('ff.checkout.buyer', JSON.stringify(form))
    const orderId = localStorage.getItem('ff.orderId')
    if (orderId) {
      try {
        const token = await getToken()
        await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ buyer: form })
        })
      } catch {}
    }
    navigate('/checkout/review')
  }

  return (
    <div>
      <CheckoutProgress step={2} />
      <div className="max-w-3xl mx-auto">
        {!isSignedIn && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Create Your Account</h2>
            <p className="text-sm text-gray-300 mb-3">Sign in or create an account so your design and checkout progress are saved.</p>
            <SignIn redirectUrl="/checkout/buyer" signUpUrl={null} />
          </div>
        )}
        <h1 className="section-header">Buyer & Delivery Info</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="input-field" placeholder="First name" value={form.firstName} onChange={e=>setField('firstName', e.target.value)} />
          <input className="input-field" placeholder="Last name" value={form.lastName} onChange={e=>setField('lastName', e.target.value)} />
          <input className="input-field md:col-span-2" placeholder="Email" value={form.email} onChange={e=>setField('email', e.target.value)} />
          <input className="input-field md:col-span-2" placeholder="Phone" value={form.phone} onChange={e=>setField('phone', e.target.value)} />
          <input className="input-field md:col-span-2" placeholder="Address" value={form.address} onChange={e=>setField('address', e.target.value)} />
          <input className="input-field" placeholder="City" value={form.city} onChange={e=>setField('city', e.target.value)} />
          <input className="input-field" placeholder="State" value={form.state} onChange={e=>setField('state', e.target.value)} />
          <input className="input-field" placeholder="ZIP" value={form.zip} onChange={e=>setField('zip', e.target.value)} />
        </div>
        <div className="mt-6 flex gap-3">
          <button className="btn-primary" onClick={next}>Continue</button>
        </div>
      </div>
    </div>
  )
}


