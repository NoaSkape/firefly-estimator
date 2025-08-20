import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { slugToModelId } from '../utils/modelUrlMapping'

export default function PackageDetail() {
  const { id, key } = useParams()
  const navigate = useNavigate()
  const [model, setModel] = useState(null)
  const [pkg, setPkg] = useState(null)
  useEffect(() => {
    (async () => {
      const code = /^[a-z]/i.test(id) ? slugToModelId(id) : id
      const res = await fetch(`/api/models/${code}`)
      const m = await res.json()
      setModel(m)
      const found = (m?.packages || []).find(p => (p.key||'').toLowerCase() === String(key||'').toLowerCase())
      setPkg(found || null)
    })()
  }, [id, key])
  if (!model || !pkg) return <div className="max-w-4xl mx-auto card">Loading…</div>
  const slug = id
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card">
        <button className="text-sm text-gray-500" onClick={()=>navigate(`/public/models/${slug}`)}>← Back</button>
        <h1 className="text-2xl font-semibold mt-2">{pkg.name}</h1>
        <div className="text-gray-600 dark:text-gray-300">+${Number(pkg.priceDelta||0).toLocaleString()}</div>
      </div>
      <div className="card">
        {pkg.images?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pkg.images.map((u,i)=>(<img key={i} src={u} alt={pkg.name} className="w-full h-40 object-cover rounded" />))}
          </div>
        ) : null}
      </div>
      <div className="card">
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pkg.description}</p>
        {Array.isArray(pkg.items) && pkg.items.length>0 && (
          <ul className="list-disc list-inside mt-3 text-gray-700 dark:text-gray-300">
            {pkg.items.map((it,idx)=>(<li key={idx}>{it}</li>))}
          </ul>
        )}
        <a className="btn-primary inline-block mt-4" href={`/checkout/configure/${slug}?pkg=${encodeURIComponent(pkg.key)}`}>Choose This Package</a>
      </div>
    </div>
  )
}




