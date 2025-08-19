import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import CheckoutProgress from '../../components/CheckoutProgress'
import PriceSummary from '../../components/PriceSummary'
import OptionsPicker from '../../components/OptionsPicker'
import { useToast } from '../../components/ToastProvider'
import ConfirmLeaveModal from '../../components/ConfirmLeaveModal'

export default function BuildCustomize() {
  const { buildId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [build, setBuild] = useState(null)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)
  const { addToast } = useToast()
  const [dirty, setDirty] = useState(false)
  const [showLeave, setShowLeave] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/builds/${buildId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (res.ok) setBuild(await res.json())
      } catch {}
      // flush any pending offline save
      try {
        const pending = localStorage.getItem(`ff.pending_patch_${buildId}`)
        if (pending) {
          await savePatch(JSON.parse(pending))
          localStorage.removeItem(`ff.pending_patch_${buildId}`)
        }
      } catch {}
    })()
    function onOnline() {
      try {
        const pending = localStorage.getItem(`ff.pending_patch_${buildId}`)
        if (pending) {
          savePatch(JSON.parse(pending)).then(() => localStorage.removeItem(`ff.pending_patch_${buildId}`))
        }
      } catch {}
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [buildId, getToken])

  const price = useMemo(() => build?.pricing?.total || 0, [build])

  async function savePatch(patch) {
    setSaving(true)
    try {
      const token = await getToken()
      const resp = await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(patch),
      })
      if (!resp.ok) addToast({ type: 'error', message: 'Save failed' }); else addToast({ type: 'success', message: 'Saved' })
      const res = await fetch(`/api/builds/${buildId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.ok) setBuild(await res.json())
    } catch (e) {
      try { localStorage.setItem(`ff.pending_patch_${buildId}`, JSON.stringify(patch)) } catch {}
      addToast({ type: 'error', message: 'Offline – changes queued' })
    } finally { setSaving(false) }
  }

  function onOptionsChange(nextOptions) {
    // optimistic update local state
    setBuild(b => ({ ...b, selections: { ...(b?.selections||{}), options: nextOptions } }))
    setDirty(true)
    // debounce server save
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      savePatch({ selections: { options: nextOptions } })
      setDirty(false)
    }, 500)
  }

  if (!build) return <div className="text-gray-400">Loading…</div>

  return (
    <div>
      <CheckoutProgress step={1} onNavigate={async (n)=>{
        if (n===2) {
          try {
            const token = await getToken()
            const res = await fetch(`/api/builds/${buildId}/checkout-step`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token?{ Authorization:`Bearer ${token}` }: {}) }, body: JSON.stringify({ step: 2 }) })
            if (!res.ok) { const j = await res.json().catch(()=>({})); addToast({ type:'error', message: j?.error || 'Complete your customization before continuing.' }); return }
            navigate(`/checkout/${buildId}/payment`)
          } catch { addToast({ type:'error', message:'Unable to validate step' }) }
        }
      }} />
      <div className="flex items-start justify-between gap-4">
        <div className="card flex-1">
          <h1 className="section-header">Customize: {build.modelName || build.modelSlug}</h1>
          <OptionsPicker
            optionsCatalog={(build?.optionCatalog)||[]}
            value={(build?.selections?.options)||[]}
            onChange={onOptionsChange}
          />
          <div className="mt-3">
            <button className="btn-primary" onClick={async ()=>{
              try {
                const token = await getToken()
                const res = await fetch(`/api/builds/${buildId}/checkout-step`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token?{ Authorization:`Bearer ${token}` }: {}) }, body: JSON.stringify({ step: 2 }) })
                if (!res.ok) { const j = await res.json().catch(()=>({})); addToast({ type:'error', message: j?.error || 'Complete your customization before continuing.' }); return }
                navigate(`/checkout/${buildId}/payment`)
              } catch { addToast({ type:'error', message:'Unable to continue' }) }
            }}>Continue to Checkout</button>
          </div>
        </div>
        <PriceSummary pricing={build?.pricing || { total: price }} />
      </div>
      {/* Mobile SaveBar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-800 bg-gray-900/90 backdrop-blur px-4 py-3 flex items-center justify-between lg:hidden">
        <div className="text-sm text-gray-300">Total: ${price.toLocaleString()}</div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={()=>savePatch({})}>Save Build</button>
          <button className="btn-primary" onClick={async ()=>{
            try {
              const token = await getToken()
              const res = await fetch(`/api/builds/${buildId}/checkout-step`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token?{ Authorization:`Bearer ${token}` }: {}) }, body: JSON.stringify({ step: 2 }) })
              if (!res.ok) { const j = await res.json().catch(()=>({})); addToast({ type:'error', message: j?.error || 'Complete your customization before continuing.' }); return }
              navigate(`/checkout/${buildId}/payment`)
            } catch { addToast({ type:'error', message:'Unable to continue' }) }
          }}>Continue</button>
        </div>
      </div>
      <ConfirmLeaveModal
        open={showLeave}
        saving={saving}
        onSaveLeave={async ()=>{ await savePatch({}); setShowLeave(false); window.history.back() }}
        onDiscard={()=>{ setShowLeave(false); window.history.back() }}
        onStay={()=>setShowLeave(false)}
      />
    </div>
  )
}


