import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Delivery() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [zip, setZip] = useState('')
  const [address, setAddress] = useState('')
  const [estimate, setEstimate] = useState(null)

  useEffect(() => {
    const c = localStorage.getItem('ff.cart')
    if (c) setCart(JSON.parse(c))
  }, [])

  async function quote() {
    if (!zip) return
    const r = await fetch(`/api/delivery/quote?zip=${encodeURIComponent(zip)}`)
    const q = await r.json()
    setEstimate(q)
  }

  function next() {
    const nextCart = { ...cart, delivery: { address, zip }, pricing: { ...cart.pricing, delivery: estimate?.price || 0, total: (cart.pricing.base + cart.pricing.options + (estimate?.price||0)) } }
    localStorage.setItem('ff.cart', JSON.stringify(nextCart))
    navigate('/checkout/auth')
  }

  return (
    <div className="max-w-2xl mx-auto card">
      <h2 className="section-header">Delivery Details</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">ZIP code</label>
          <input value={zip} onChange={e => setZip(e.target.value)} className="input-field w-full" placeholder="ZIP" />
        </div>
        <div>
          <label className="block text-sm mb-1">Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className="input-field w-full" placeholder="Street, City, State" />
        </div>
        <button className="btn-primary" onClick={quote} disabled={!zip}>Get Estimate</button>
        {estimate && (
          <div className="p-3 rounded border border-gray-200 dark:border-gray-800">Estimated delivery: ${estimate.price.toLocaleString()} • Lead time {estimate.etaRange.weeksMin}-{estimate.etaRange.weeksMax} weeks</div>
        )}
        <button className="btn-primary w-full" disabled={!estimate} onClick={next}>Continue</button>
      </div>
    </div>
  )
}


