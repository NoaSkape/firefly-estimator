import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../../lib/canEditModels'

export default function AdminOrders() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const isAdmin = canEditModelsClient(user)
  useEffect(() => {
    if (!isAdmin) return
    let mounted = true
    ;(async () => {
      const token = await getToken()
      const res = await fetch('/api/admin/orders', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      const json = await res.json()
      if (mounted) { setOrders(Array.isArray(json) ? json : []); setLoading(false) }
    })()
    return () => { mounted = false }
  }, [getToken, isAdmin])
  if (!isAdmin) return <div className="text-center text-gray-600 dark:text-gray-300">Admins only.</div>
  if (loading) return <div className="text-center text-gray-600 dark:text-gray-300">Loading…</div>
  return (
    <div className="card">
      <h2 className="section-header">All Orders</h2>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {orders.map(o => (
          <div key={o._id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{o.model?.name}</div>
              <div className="text-sm text-gray-500">{o.userId} • {o.status}</div>
            </div>
            <div className="text-sm">${(o.pricing?.total||0).toLocaleString()}</div>
          </div>
        ))}
        {orders.length === 0 && <div className="py-6 text-gray-500">No orders.</div>}
      </div>
    </div>
  )
}



