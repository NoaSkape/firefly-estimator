import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

import CheckoutProgress from '../../components/CheckoutProgress'
export default function Confirm() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const sessionId = params.get('session_id')
  const { buildId } = useParams()
  const { getToken } = useAuth()
  const [build, setBuild] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/builds/${buildId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (res.ok) setBuild(await res.json())
      } catch {}
    })()
  }, [buildId, getToken])

  return (
    <div className="max-w-2xl mx-auto">
      <CheckoutProgress step={5} />
      <div className="card text-center">
        <h2 className="section-header">Order Received</h2>
        <p className="text-gray-600 dark:text-gray-300">Thank you! Your order has been submitted.</p>
        {build && (
          <div className="text-sm text-gray-300 mt-2">
            <div>{build.modelName} ({build.modelSlug})</div>
            <div>Total: ${Number(build?.pricing?.total||0).toLocaleString()}</div>
          </div>
        )}
        {sessionId && (
          <p className="text-gray-500 dark:text-gray-400 mt-2">Stripe Session: {sessionId}</p>
        )}
        <div className="mt-4 flex justify-center gap-3">
          <a href="/builds" className="px-4 py-2 rounded border border-gray-700 text-white">My Builds</a>
          <button className="btn-primary" onClick={()=>navigate('/')}>Home</button>
        </div>
      </div>
    </div>
  )
}



