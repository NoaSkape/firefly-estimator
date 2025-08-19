import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import CheckoutProgress from '../../components/CheckoutProgress'
import PriceSummary from '../../components/PriceSummary'

export default function BuildCustomize() {
  const { buildId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [build, setBuild] = useState(null)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/builds/${buildId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (res.ok) setBuild(await res.json())
      } catch {}
    })()
  }, [buildId, getToken])

  const price = useMemo(() => build?.pricing?.total || 0, [build])

  async function savePatch(patch) {
    setSaving(true)
    try {
      const token = await getToken()
      await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(patch),
      })
      const res = await fetch(`/api/builds/${buildId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.ok) setBuild(await res.json())
    } finally { setSaving(false) }
  }

  function onOptionsChange(nextOptions) {
    // optimistic update local state
    setBuild(b => ({ ...b, selections: { ...(b?.selections||{}), options: nextOptions } }))
    // debounce server save
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      savePatch({ selections: { options: nextOptions } })
    }, 500)
  }

  if (!build) return <div className="text-gray-400">Loading…</div>

  return (
    <div>
      <CheckoutProgress step={1} onNavigate={(n)=>{
        if (n===2) navigate(`/checkout/${buildId}/payment`)
      }} />
      <div className="flex items-start justify-between gap-4">
        <div className="card flex-1">
          <h1 className="section-header">Customize: {build.modelName || build.modelSlug}</h1>
          <p className="text-sm text-gray-400">(Options UI placeholder)</p>
          <div className="mt-3">
            <button className="btn-primary" onClick={()=>savePatch({ step: 2, status: 'CHECKOUT_IN_PROGRESS' }) && navigate(`/checkout/${buildId}/payment`)}>Continue to Checkout</button>
          </div>
        </div>
        <PriceSummary pricing={build?.pricing || { total: price }} />
      </div>
    </div>
  )
}


