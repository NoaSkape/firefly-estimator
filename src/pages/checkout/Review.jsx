import CheckoutProgress from '../../components/CheckoutProgress'
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'

export default function Review() {
  const { buildId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [build, setBuild] = useState(null)
  const { addToast } = useToast()

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/builds/${buildId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (res.ok) setBuild(await res.json())
      } catch {}
    })()
  }, [buildId, getToken])

  if (!build) return (
    <div>
      <CheckoutProgress step={4} getBlockReason={(n)=> n===5 ? 'Complete required items before confirming' : ''} onNavigate={async (n)=>{
        if (n<=3) navigate(`/checkout/${buildId}/${n===2?'payment':'buyer'}`)
        if (n===5) {
          try {
            const token = await getToken()
            const res = await fetch(`/api/builds/${buildId}/checkout-step`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ step: 5 }) })
            if (!res.ok) { const j = await res.json().catch(()=>({})); addToast({ type:'error', message: j?.error || 'Complete previous steps' }); return }
            navigate(`/checkout/${buildId}/confirm`)
          } catch { addToast({ type:'error', message:'Unable to continue' }) }
        }
      }} />
      <div className="text-gray-400">Loading…</div>
    </div>
  )

  const rows = [
    { label: 'Base', value: Number(build?.selections?.basePrice || 0) },
    { label: 'Options', value: (build?.selections?.options || []).reduce((s,o)=>s+Number(o.price||0)*(o.quantity||1),0) },
    { label: 'Delivery', value: Number(build?.pricing?.delivery || 0) },
  ]
  const total = Number(build?.pricing?.total || rows.reduce((s,r)=>s+r.value,0))

  return (
    <div>
      <CheckoutProgress step={4} />
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="section-header">Review & Sign</h1>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100">Order Summary</h2>
          <p className="text-sm text-gray-300">{build?.modelName} ({build?.modelSlug})</p>
          <ul className="mt-3 text-sm text-gray-300 list-disc list-inside">
            {(build?.selections?.options||[]).map((s, i) => (<li key={i}>{s.name || s.code} (+${Number(s.price||0).toLocaleString()})</li>))}
          </ul>
          <div className="mt-3 text-sm text-gray-200">
            {rows.map(r => (
              <div key={r.label} className="flex justify-between"><span>{r.label}</span><span>${r.value.toLocaleString()}</span></div>
            ))}
            <div className="flex justify-between font-semibold border-t border-gray-800 pt-2"><span>Total</span><span>${total.toLocaleString()}</span></div>
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100">Buyer & Delivery</h2>
          <p className="text-sm text-gray-300">{build?.buyerInfo?.firstName} {build?.buyerInfo?.lastName} • {build?.buyerInfo?.email}</p>
          <p className="text-sm text-gray-300">{build?.buyerInfo?.deliveryAddress}</p>
          <p className="text-sm text-gray-300 mt-1">Payment Method: <span className="font-medium">{build?.financing?.method || '—'}</span></p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn-primary"
            onClick={async () => {
              try {
                const token = await getToken()
                const res = await fetch(`/api/builds/${buildId}/contract`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} })
                const data = await res.json()
                if (data?.signingUrl) window.location.assign(data.signingUrl)
                else addToast({ type:'error', message:'Could not start signing' })
              } catch (e) { addToast({ type:'error', message:'Could not start signing' }) }
            }}
          >
            Sign & Submit
          </button>
          <button
            className="px-4 py-2 rounded border border-gray-700 text-white"
            onClick={async ()=>{
              try {
                const token = await getToken()
                const res = await fetch(`/api/builds/${buildId}/confirm`, { method:'POST', headers: token?{ Authorization:`Bearer ${token}` }:{} })
                if (!res.ok) { addToast({ type:'error', message:'Could not place order' }); return }
                navigate(`/checkout/${buildId}/confirm`)
              } catch { addToast({ type:'error', message:'Could not place order' }) }
            }}
          >
            Place Order (stub)
          </button>
        </div>
      </div>
    </div>
  )
}


