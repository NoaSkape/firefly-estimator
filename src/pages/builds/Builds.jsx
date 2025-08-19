import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import CheckoutProgress from '../../components/CheckoutProgress'

export default function BuildsDashboard() {
  const { isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [builds, setBuilds] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      if (!isSignedIn) { setLoading(false); return }
      try {
        const token = await getToken()
        const res = await fetch('/api/builds', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (res.ok) setBuilds(await res.json())
      } finally { setLoading(false) }
    })()
  }, [isSignedIn, getToken])

  if (!isSignedIn) {
    return (
      <div className="card">
        <h1 className="section-header">My Builds</h1>
        <p className="text-sm text-gray-300">Sign in to save and manage your builds.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="section-header">My Builds</h1>
      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : builds.length === 0 ? (
        <div className="card">No builds yet. <button className="btn-primary ml-2" onClick={()=>navigate('/models')}>Start from Explore Models</button></div>
      ) : (
        <div className="space-y-3">
          {builds.map(b => (
            <div key={b._id} className="card flex items-center justify-between">
              <div>
                <div className="font-semibold">{b.modelName || b.modelSlug}</div>
                <div className="text-xs text-gray-400">Step {b.step}/5 · {b.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-primary" onClick={()=>navigate(`/builds/${b._id}`)}>Resume</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={()=>navigate(`/checkout/${b._id}`)}>Checkout</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


