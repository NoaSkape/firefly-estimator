import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import CheckoutProgress from '../../components/CheckoutProgress'
import PriceSummary from '../../components/PriceSummary'
import OptionsPicker from '../../components/OptionsPicker'
import Breadcrumbs from '../../components/Breadcrumbs'
import { useToast } from '../../components/ToastProvider'
import { trackEvent } from '../../utils/analytics'
import ConfirmLeaveModal from '../../components/ConfirmLeaveModal'

export default function BuildCustomize() {
  const { buildId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { getToken, isSignedIn } = useAuth()
  const [build, setBuild] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const saveTimer = useRef(null)
  const { addToast } = useToast()
  const [dirty, setDirty] = useState(false)
  const [showLeave, setShowLeave] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/builds/${buildId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (res.ok) { 
          const buildData = await res.json()
          setBuild(buildData)
          trackEvent('build_loaded', { buildId })
        } else if (res.status === 404) {
          setError('Build not found')
          addToast({ 
            type: 'error', 
            title: 'Build Not Found',
            message: 'This build does not exist or you do not have access to it.'
          })
        } else {
          setError('Failed to load build')
          addToast({ 
            type: 'error', 
            title: 'Error',
            message: 'Failed to load build. Please try again.'
          })
        }
      } catch (err) {
        setError('Network error')
        addToast({ 
          type: 'error', 
          title: 'Network Error',
          message: 'Unable to load build. Please check your connection.'
        })
      }
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
  }, [buildId, getToken, addToast])

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
      if (!resp.ok) addToast({ type: 'error', message: 'Save failed' }); else { addToast({ type: 'success', message: 'Saved' }); trackEvent('build_saved', { buildId }) }
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

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <h1 className="section-header text-red-600">Build Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error === 'Build not found' 
              ? 'This build does not exist or you do not have access to it.'
              : 'Unable to load the build. Please try again.'
            }
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/builds')} className="btn-primary">
              Go to My Builds
            </button>
            <button onClick={() => navigate('/models')} className="btn-secondary">
              Explore Models
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!build) return <div className="text-gray-400">Loading…</div>

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Models', to: '/models' }, { label: 'My Builds', to: '/builds' }, { label: build.modelName || build.modelSlug }]} />
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
        <PriceSummary pricing={build?.pricing || { total: price }} onSave={async () => {
          if (!isSignedIn) {
            // Prompt sign-in, then migrate guest draft and resume
            const { openSignIn } = await import('@clerk/clerk-react')
            openSignIn({
              redirectUrl: location.pathname + location.search,
              afterSignInUrl: location.pathname + location.search
            })
            return
          }
          await savePatch({})
        }} onDuplicate={async ()=>{
          try { const token = await getToken(); const r = await fetch(`/api/builds/${buildId}/duplicate`, { method:'POST', headers: token?{Authorization:`Bearer ${token}`}:{}}); const j = await r.json(); if (j?.buildId) { trackEvent('build_duplicated', { from: buildId, to: j.buildId }); navigate(`/builds/${j.buildId}`) } }
          catch {}
        }} />
      </div>
      {/* Mobile SaveBar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-800 bg-gray-900/90 backdrop-blur px-4 py-3 flex items-center justify-between lg:hidden">
        <div className="text-sm text-gray-300">Total: ${price.toLocaleString()}</div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={async () => {
            if (!isSignedIn) {
              // Prompt sign-in, then migrate guest draft and resume
              const { openSignIn } = await import('@clerk/clerk-react')
              openSignIn({
                redirectUrl: location.pathname + location.search,
                afterSignInUrl: location.pathname + location.search
              })
              return
            }
            await savePatch({})
          }}>Save Build</button>
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


