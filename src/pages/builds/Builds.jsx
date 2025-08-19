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
                <div className="font-semibold">{b.modelName || b.modelSlug} {b.primary && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-400 text-black">Primary</span>}</div>
                <div className="text-xs text-gray-400">Step {b.step}/5 · {b.status} · Total ${Number(b?.pricing?.total||0).toLocaleString()} · Updated {(new Date(b.updatedAt)).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-primary" onClick={()=>navigate(`/builds/${b._id}`)}>Resume</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={()=>navigate(`/checkout/${b._id}/payment`)}>Checkout</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={async()=>{ const token = await getToken(); const r = await fetch(`/api/builds/${b._id}/duplicate`, { method:'POST', headers: token?{Authorization:`Bearer ${token}`}:{}}); const j=await r.json(); if(j?.buildId) navigate(`/builds/${j.buildId}`) }}>Duplicate</button>
                <button className="px-3 py-2 rounded border border-red-800 text-red-300 hover:bg-red-900/30" onClick={async()=>{ const token = await getToken(); await fetch(`/api/builds/${b._id}`, { method:'DELETE', headers: token?{Authorization:`Bearer ${token}`}:{}}); setBuilds(list=>list.filter(x=>x._id!==b._id)); if (location.pathname.includes(`/builds/${b._id}`) || location.pathname.includes(`/checkout/${b._id}`)) { navigate('/builds') } }}>Delete</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={async()=>{ const token = await getToken(); await fetch(`/api/builds/${b._id}`, { method:'PATCH', headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ primary: true }) }); setBuilds(list=>list.map(x=>({ ...x, primary: x._id===b._id }))) }}>Set Primary</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={async()=>{ const name = prompt('Rename build', b.modelName || 'Build'); if (!name) return; const token = await getToken(); await fetch(`/api/builds/${b._id}`, { method:'PATCH', headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ modelName: name }) }); setBuilds(list=>list.map(x=>x._id===b._id?{...x, modelName:name}:x)) }}>Rename</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


