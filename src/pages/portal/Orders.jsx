import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function Orders() {
  const { getToken } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const token = await getToken()
      const res = await fetch('/api/portal/orders', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      const json = await res.json()
      if (mounted) { setOrders(Array.isArray(json) ? json : []); setLoading(false) }
    })()
    return () => { mounted = false }
  }, [getToken])
  if (loading) return <div className="text-center text-gray-600 dark:text-gray-300">Loading…</div>
  return (
    <div className="card">
      <h2 className="section-header">My Orders</h2>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {orders.map(o => {
          const status = o?.contract?.status || '—'
          const completed = status === 'COMPLETED'
          const signedUrl = o?.contract?.signedPdfUrl
          const auditUrl = o?.contract?.auditTrailUrl
          return (
            <div key={o._id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{o.model?.name}</div>
                  <div className="text-sm text-gray-500">Total ${(o.pricing?.total||0).toLocaleString()}</div>
                </div>
                <div className="text-sm">
                  <span className={`px-2 py-0.5 rounded ${completed?'bg-green-600/20 text-green-300':'bg-yellow-600/20 text-yellow-300'}`}>{status}</span>
                </div>
              </div>
              <div className="mt-2 flex gap-2 text-sm">
                {!completed && o?.contract?.signerLinks?.buyer1 && (
                  <a className="btn-primary" href={o.contract.signerLinks.buyer1} target="_blank" rel="noreferrer">Sign / View</a>
                )}
                {completed && (
                  <>
                    {signedUrl && <a className="px-3 py-1 rounded border border-gray-700 text-white" href={signedUrl} target="_blank" rel="noreferrer">Download Signed PDF</a>}
                    {auditUrl && <a className="px-3 py-1 rounded border border-gray-700 text-white" href={auditUrl} target="_blank" rel="noreferrer">View Audit Trail</a>}
                  </>
                )}
              </div>
            </div>
          )
        })}
        {orders.length === 0 && <div className="py-6 text-gray-500">No orders yet.</div>}
      </div>
    </div>
  )
}



