import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'

function Card({ title, children, action }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [orders, setOrders] = useState([])
  const [drafts, setDrafts] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await fetch('/api/portal/orders', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        const json = await res.json()
        if (mounted) setOrders(Array.isArray(json) ? json : [])
      } catch {}
      try {
        const res2 = await fetch('/api/orders?status=draft')
        const json2 = await res2.json()
        if (mounted) setDrafts(Array.isArray(json2) ? json2 : [])
      } catch {}
    })()
    return () => { mounted = false }
  }, [getToken])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Resume Your Purchase" action={<a href="/models" className="px-3 py-1.5 rounded bg-white/10 text-white hover:bg-white/20">Start new</a>}>
        <div className="divide-y divide-gray-800">
          {drafts.map((d) => (
            <div key={d._id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-100">{d.model?.name}</div>
                <div className="text-sm text-gray-400">Saved design • ${(d.pricing?.total||0).toLocaleString()}</div>
              </div>
              <a href={`/checkout/review`} className="px-3 py-1.5 rounded bg-yellow-400 text-gray-900 hover:bg-yellow-300">Resume</a>
            </div>
          ))}
          {drafts.length === 0 && <div className="py-6 text-gray-400 text-sm">No saved designs yet.</div>}
        </div>
      </Card>

      <Card title="My Orders" action={<a href="/portal" className="px-3 py-1.5 rounded border border-gray-700 text-white hover:bg-white/10">View all</a>}>
        <div className="divide-y divide-gray-800">
          {orders.map((o) => (
            <div key={o._id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-100">{o.model?.name}</div>
                <div className="text-sm text-gray-400">Status: {o.status}</div>
              </div>
              <div className="text-sm">${(o.pricing?.total||0).toLocaleString()}</div>
            </div>
          ))}
          {orders.length === 0 && <div className="py-6 text-gray-400 text-sm">No orders yet.</div>}
        </div>
      </Card>
    </div>
  )
}


