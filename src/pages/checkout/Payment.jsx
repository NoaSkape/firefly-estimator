import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

export default function Payment() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [cart, setCart] = useState(null)
  const [choice, setChoice] = useState('cash')
  const [creating, setCreating] = useState(false)
  const [orderId, setOrderId] = useState(null)

  useEffect(() => {
    const c = localStorage.getItem('ff.cart')
    if (c) setCart(JSON.parse(c))
  }, [])

  async function createDraft() {
    if (!cart) return
    setCreating(true)
    const token = await getToken()
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
      body: JSON.stringify({ model: { modelCode: cart.model?.subtitle || cart.model?.id, slug: cart.model?.id, name: cart.model?.name, basePrice: cart.model?.basePrice || 0 }, selections: cart.selections || [], pricing: cart.pricing || { base:0, options:0, delivery:0, total:0, deposit:0 } })
    })
    const json = await res.json()
    setCreating(false)
    if (json?.orderId) setOrderId(json.orderId)
  }

  function next() {
    if (!orderId) return
    if (choice === 'cash') navigate('/checkout/sign')
    else navigate('/checkout/sign') // finance stub uses same step for now
  }

  return (
    <div className="max-w-2xl mx-auto card">
      <h2 className="section-header">Payment</h2>
      <div className="space-y-4">
        <div className="flex gap-3">
          <button onClick={() => setChoice('cash')} className={`px-3 py-2 rounded ${choice==='cash' ? 'bg-yellow-500 text-black' : 'bg-gray-200 dark:bg-gray-800'}`}>Cash / Deposit</button>
          <button onClick={() => setChoice('finance')} className={`px-3 py-2 rounded ${choice==='finance' ? 'bg-yellow-500 text-black' : 'bg-gray-200 dark:bg-gray-800'}`}>Financing</button>
        </div>
        {!orderId ? (
          <button className="btn-primary" disabled={!cart || creating} onClick={createDraft}>{creating ? 'Creating order…' : 'Create Order Draft'}</button>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">Order created: {orderId}</div>
            <button className="btn-primary w-full" onClick={next}>Continue</button>
          </div>
        )}
      </div>
    </div>
  )
}


