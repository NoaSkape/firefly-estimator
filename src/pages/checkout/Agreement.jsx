import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import CheckoutProgress from '../../components/CheckoutProgress'
import { useToast } from '../../components/ToastProvider'

export default function Agreement() {
  const { buildId } = useParams()
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [signerUrl, setSignerUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef(null)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const token = await getToken()
        // For v1, re-use builds/:id/contract route to start contract flow
        const res = await fetch(`/api/builds/${buildId}/contract`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const json = await res.json().catch(()=>({}))
        if (res.ok && json?.signingUrl) {
          setSignerUrl(json.signingUrl)
        } else if (json?.signerUrl) {
          setSignerUrl(json.signerUrl)
        } else {
          addToast({ type:'error', message: 'Could not start agreement' })
        }
      } catch (e) {
        addToast({ type:'error', message: 'Could not start agreement' })
      } finally {
        setLoading(false)
      }
    })()
  }, [buildId, getToken, addToast])

  return (
    <div>
      <CheckoutProgress step={4} />
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="section-header">Agreement & Signature</h1>
        <div className="card">
          {loading && <div className="text-gray-300">Loading signer…</div>}
          {!loading && signerUrl && (
            <div className="space-y-3">
              <div className="h-[70vh] rounded overflow-hidden border border-gray-700 bg-black/20">
                <iframe ref={iframeRef} title="Agreement" src={signerUrl} className="w-full h-full" allow="fullscreen; clipboard-write; autoplay" />
              </div>
              <div className="flex gap-3">
                <a className="btn-primary" href={signerUrl} target="_blank" rel="noreferrer">Open in New Tab</a>
                <button className="px-4 py-2 rounded border border-gray-700 text-white" onClick={()=>navigate(`/checkout/${buildId}/confirm`)}>Skip (debug)</button>
              </div>
            </div>
          )}
          {!loading && !signerUrl && (
            <div className="text-red-400">Unable to load signing session.</div>
          )}
        </div>
      </div>
    </div>
  )
}


