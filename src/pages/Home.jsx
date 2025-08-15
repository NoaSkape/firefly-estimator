import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PublicModelSelector from '../public/PublicModelSelector'
import { MODELS } from '../data/models'
import { modelIdToSlug } from '../utils/modelUrlMapping'

export default function Home() {
  const [allModels, setAllModels] = useState(MODELS)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const local = MODELS.map(m => ({ ...m }))
      setAllModels(local)
      try {
        const responses = await Promise.all(local.map(m => fetch(`/api/models/${m.id}`)))
        const apiModels = await Promise.all(responses.map(r => (r.ok ? r.json() : null)))
        const merged = local.map((m, i) => {
          const api = apiModels[i]
          if (!api) return m
          return {
            ...m,
            name: api.name || m.name,
            description: api.description ?? m.description,
            basePrice: typeof api.basePrice === 'number' ? api.basePrice : m.basePrice,
            width: api?.width ?? null,
            length: api?.length ?? null,
            height: api?.height ?? null,
            weight: api?.weight ?? null,
            bedrooms: api?.bedrooms ?? null,
            bathrooms: api?.bathrooms ?? null,
            squareFeet: api?.squareFeet ?? null,
            images: Array.isArray(api.images) ? api.images : [],
            subtitle: api.modelCode || m.subtitle,
          }
        })
        if (!cancelled) setAllModels(merged)
      } catch (_) {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleCardSelect = (modelId) => {
    const slug = modelIdToSlug(modelId)
    if (slug) navigate(`/public/models/${slug}`)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="section-header">Explore Our Models</h2>
        <PublicModelSelector models={allModels} />
      </div>
    </div>
  )
}


