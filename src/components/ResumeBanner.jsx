import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { trackEvent } from '../utils/analytics'

export default function ResumeBanner() {
  const { getToken } = useAuth()
  const [build, setBuild] = useState(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken()
        const res = await fetch('/api/builds', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (res.ok) {
          const list = await res.json()
          const candidate = Array.isArray(list) ? list.find(b => b.status === 'DRAFT' || b.status === 'CHECKOUT_IN_PROGRESS') : null
          if (candidate) {
            const dismissedId = localStorage.getItem('ff.resume.dismissed')
            if (dismissedId && dismissedId === String(candidate._id)) return
            setBuild(candidate)
          }
        }
      } catch {}
    })()
  }, [getToken])

  if (!build) return null
  if (dismissed) return null
  if (pathname.startsWith('/builds') || pathname.startsWith('/checkout')) return null
  const step = Number(build.step || 1)
  const url = step <= 1 ? `/builds/${build._id}` : `/checkout/${build._id}/${step===2?'payment':step===3?'buyer':step===4?'review':'confirm'}`

  return (
    <div className="fixed bottom-3 right-3 z-40">
      <div className="rounded bg-gray-900/80 backdrop-blur border border-gray-700 px-4 py-3 text-sm text-gray-200 shadow-lg">
        <div className="mb-2">You have an in‑progress build: <span className="font-semibold">{build.modelName || build.modelSlug}</span> (Step {step}/5)</div>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={()=>{ trackEvent('build_resumed', { buildId: build._id, step }); navigate(url) }}>Resume →</button>
          <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={()=>{ setDismissed(true); try{ localStorage.setItem('ff.resume.dismissed', String(build._id)) } catch {} }}>Dismiss</button>
        </div>
      </div>
    </div>
  )
}


