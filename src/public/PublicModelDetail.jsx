import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { isValidSlug, slugToModelId, modelIdToSlug } from '../utils/modelUrlMapping'
import { MODELS } from '../data/models'
import SEOHead from '../components/SEOHead'
import AdminModelEditor from '../components/AdminModelEditor'

export default function PublicModelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken } = useAuth()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const isAdmin = canEditModelsClient(user)
  const debug = (import.meta.env?.VITE_DEBUG_ADMIN === 'true')

  useEffect(() => {
    if (!isViewerOpen) return
    function onPop() { setIsViewerOpen(false) }
    window.addEventListener('popstate', onPop)
    window.history.pushState({ viewer: true }, '')
    return () => window.removeEventListener('popstate', onPop)
  }, [isViewerOpen])

  const getModelCode = () => {
    if (!id) return null
    if (isValidSlug(id)) return slugToModelId(id)
    return id
  }
  const actualModelCode = getModelCode()

  useEffect(() => { fetchModel() }, [actualModelCode])

  const fetchModel = async () => {
    try {
      setLoading(true); setError(null)
      if (!actualModelCode) throw new Error('Invalid model code')
      try {
        const token = await getToken()
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
        const res = await fetch(`/api/models/${actualModelCode}`, { headers })
        if (res.ok) {
          const apiModelData = await res.json(); setModel(apiModelData); return
        }
      } catch (e) {
        if (debug) console.log('[DEBUG_ADMIN] public model API error', e)
      }
      const localModel = MODELS.find(m => m.id === actualModelCode)
      if (!localModel) throw new Error('Model not found')
      const transformed = {
        ...localModel,
        modelCode: localModel.subtitle,
        width: localModel.specs?.width,
        length: localModel.specs?.length,
        height: localModel.specs?.height,
        weight: localModel.specs?.weight,
        bedrooms: localModel.specs?.bedrooms,
        bathrooms: localModel.specs?.bathrooms,
        squareFeet: (() => {
          const lengthNum = parseFloat((localModel.specs?.length || '').replace(/['"]/g, ''))
          const widthNum = parseFloat((localModel.specs?.width || '').replace(/['"]/g, ''))
          return isNaN(lengthNum) || isNaN(widthNum) ? null : Math.round(lengthNum * widthNum)
        })(),
        images: [],
        features: localModel.features || []
      }
      setModel(transformed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const nextImage = () => { if (model?.images?.length) setCurrentImageIndex((p)=>(p+1)%model.images.length) }
  const prevImage = () => { if (model?.images?.length) setCurrentImageIndex((p)=>(p-1+model.images.length)%model.images.length) }

  useEffect(() => {
    if (!isViewerOpen) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'Escape') setIsViewerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isViewerOpen, model?.images?.length])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div><p className="mt-4 text-gray-600">Loading model...</p></div></div>
  )
  if (error || !model) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-gray-900 mb-4">Model Not Found</h1><button onClick={()=>navigate('/')} className="btn-primary">Back to Models</button></div></div>
  )

  const handleChooseHome = () => {
    const slug = modelIdToSlug(actualModelCode) || id
    navigate(`/checkout/configure/${slug}`)
  }

  const handleModelUpdate = (updated) => { setModel(updated) }

  // Fallback demo packages/add-ons if none configured so the UI is visible publicly
  const fallbackPackages = [
    { key:'comfort-xtreme', name:'Comfort Xtreme', priceDelta:3500, description:'HVAC mini‑split, insulation upgrades, blackout shades.', images:(model.images||[]).slice(0,3).map(i=>i.url), items:['Mini‑split HVAC','Upgraded insulation','Blackout shades'] },
    { key:'chefs-pick', name:"Chef's Pick", priceDelta:5200, description:'Solid-surface counters, gas range, deep sink, pull‑outs.', images:(model.images||[]).slice(0,3).map(i=>i.url), items:['Solid-surface counters','Gas range','Deep sink'] },
    { key:'cozy-cottage', name:'Cozy Cottage', priceDelta:2800, description:'Wood accents, warm lighting, upgraded trim.', images:(model.images||[]).slice(0,3).map(i=>i.url), items:['Wood accents','Warm lighting','Upgraded trim'] },
    { key:'ultra', name:'Ultra', priceDelta:7400, description:'Premium finishes across kitchen, bath and exterior.', images:(model.images||[]).slice(0,3).map(i=>i.url), items:['Premium finishes','Exterior lighting','Tile shower'] },
  ]
  const showPackages = Array.isArray(model.packages) && model.packages.length ? model.packages : fallbackPackages
  const fallbackAddOns = [
    { id:'awnings', name:'Window Awnings', priceDelta:900, description:'Add charm and shade with custom awnings.', image:(model.images||[])[0]?.url||'' },
    { id:'skylight', name:'Skylight', priceDelta:650, description:'Bring in natural light with a roof skylight.', image:(model.images||[])[1]?.url||'' },
  ]
  const showAddOns = Array.isArray(model.addOns) && model.addOns.length ? model.addOns : fallbackAddOns

  return (
    <div className="min-h-screen">
      <SEOHead title={model ? `${model.name} - Firefly Tiny Homes` : 'Model Not Found - Firefly Tiny Homes'} description={model ? `${model.name} - ${model.description || 'Explore this beautiful tiny home model from Firefly Tiny Homes.'}` : 'The model you\'re looking for doesn\'t exist.'} model={model} />
      <div className="bg-white dark:bg-gray-900/50 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">← Back to Models</button>
            </div>
            {isAdmin && (
              <button onClick={() => setIsEditorOpen(true)} className="px-3 py-2 btn-primary rounded-md">Edit</button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="relative">
              {model.images && model.images.length > 0 ? (
                <img src={model.images[currentImageIndex]?.url} alt={`${model.name} - Image ${currentImageIndex + 1}`} className="w-full h-96 object-cover rounded-lg shadow-lg cursor-zoom-in" onClick={() => setIsViewerOpen(true)} />
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-lg shadow-lg flex items-center justify-center"><div className="text-center text-gray-500"><svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p>No images available</p></div></div>
              )}
              {model.images && model.images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75">←</button>
                  <button onClick={nextImage} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75">→</button>
                </>
              )}
            </div>
            {model.images && model.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {model.images.map((image, index) => (
                  <button key={index} onClick={() => setCurrentImageIndex(index)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden ${currentImageIndex === index ? 'ring-2 ring-primary-500' : ''}`}>
                    <img src={image.url} alt={`${model.name} - Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* New: Packages grid under photos */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Popular Add‑On Packages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showPackages.slice(0,4).map((p) => (
                  <div key={p.key} className="border rounded p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-lg">{p.name}</div>
                        {p.description && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">{p.description}</div>}
                      </div>
                      <a className="text-sm text-yellow-400 hover:underline" href={`/public/models/${modelIdToSlug(actualModelCode) || id}/package/${encodeURIComponent(p.key)}`}>Details</a>
                    </div>
                    {!!p.images?.length && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {p.images.slice(0,3).map((u, i) => (<img key={i} src={u} alt={p.name} className="w-full h-16 object-cover rounded" />))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-gray-700 dark:text-gray-300">+${Number(p.priceDelta||0).toLocaleString()}</div>
                      <a href={`/checkout/configure/${modelIdToSlug(actualModelCode) || id}?pkg=${encodeURIComponent(p.key)}`} className="btn-primary">Choose Package</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* New: single add-ons below packages */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Additional Add‑Ons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showAddOns.map(a => (
                  <div key={a.id} className="border rounded p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex gap-3">
                    {a.image && <img src={a.image} alt={a.name} className="w-24 h-24 object-cover rounded" />}
                    <div className="flex-1">
                      <div className="font-medium">{a.name}</div>
                      {a.description && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a.description}</div>}
                      <div className="text-sm mt-2">+${Number(a.priceDelta||0).toLocaleString()}</div>
                    </div>
                    <a className="btn-primary self-start" href={`/checkout/configure/${modelIdToSlug(actualModelCode) || id}?addon=${encodeURIComponent(a.id)}`}>Add</a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{model.name}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">{model.modelCode}</p>
              <p className="text-xl text-yellow-500 font-semibold">${model.basePrice?.toLocaleString() || 'N/A'}</p>
            </div>
            {/* 2x2 Add-on packages grid */}
            {Array.isArray(model.packages) && model.packages.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Popular Add‑On Packages</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {model.packages.slice(0,4).map((p) => (
                    <div key={p.key} className="border rounded p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-lg">{p.name}</div>
                          {p.description && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">{p.description}</div>}
                        </div>
                        <a className="text-sm text-yellow-400 hover:underline" href={`/public/models/${modelIdToSlug(actualModelCode) || id}/package/${encodeURIComponent(p.key)}`}>Details</a>
                      </div>
                      {!!p.images?.length && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {p.images.slice(0,3).map((u, i) => (<img key={i} src={u} alt={p.name} className="w-full h-16 object-cover rounded" />))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-sm text-gray-700 dark:text-gray-300">+${Number(p.priceDelta||0).toLocaleString()}</div>
                        <a href={`/checkout/configure/${modelIdToSlug(actualModelCode) || id}?pkg=${encodeURIComponent(p.key)}`} className="btn-primary">Choose Package</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h2>
              <p className="text-gray-700 dark:text-gray-300">{model.description || 'No description available.'}</p>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-gray-500 dark:text-gray-400">Width</span><p className="font-medium">{model.width}</p></div>
                <div><span className="text-sm text-gray-500 dark:text-gray-400">Square Feet</span><p className="font-medium">{model.squareFeet} sq ft</p></div>
                {model.length && (<div><span className="text-sm text-gray-500 dark:text-gray-400">Length</span><p className="font-medium">{model.length}</p></div>)}
                {model.height && (<div><span className="text-sm text-gray-500 dark:text-gray-400">Height</span><p className="font-medium">{model.height}</p></div>)}
                {model.weight && (<div><span className="text-sm text-gray-500 dark:text-gray-400">Weight</span><p className="font-medium">{model.weight}</p></div>)}
                {model.bedrooms && (<div><span className="text-sm text-gray-500 dark:text-gray-400">Bedrooms</span><p className="font-medium">{model.bedrooms}</p></div>)}
                {model.bathrooms && (<div><span className="text-sm text-gray-500 dark:text-gray-400">Bathrooms</span><p className="font-medium">{model.bathrooms}</p></div>)}
              </div>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Features</h2>
              <ul className="space-y-2">
                {model.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            {/* Single add-ons list (admin editable) */}
            {Array.isArray(model.addOns) && model.addOns.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Additional Add‑Ons</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {model.addOns.map(a => (
                    <div key={a.id} className="border rounded p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex gap-3">
                      {a.image && <img src={a.image} alt={a.name} className="w-24 h-24 object-cover rounded" />}
                      <div className="flex-1">
                        <div className="font-medium">{a.name}</div>
                        {a.description && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a.description}</div>}
                        <div className="text-sm mt-2">+${Number(a.priceDelta||0).toLocaleString()}</div>
                      </div>
                      <a className="btn-primary self-start" href={`/checkout/configure/${modelIdToSlug(actualModelCode) || id}?addon=${encodeURIComponent(a.id)}`}>Add</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card">
              <button onClick={handleChooseHome} className="w-full btn-primary text-lg py-4">Choose This Home</button>
              <p className="text-sm text-gray-600 mt-2 text-center">This will select this home and take you to design options</p>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && isEditorOpen && model && (
        <AdminModelEditor idParam={actualModelCode} model={model} onClose={() => setIsEditorOpen(false)} onSaved={handleModelUpdate} />
      )}

      {isViewerOpen && model?.images?.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {model.images.length > 1 && (<>
            <button onClick={prevImage} aria-label="Previous image" className="absolute left-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded">←</button>
            <button onClick={nextImage} aria-label="Next image" className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded">→</button>
          </>)}
          <button aria-label="Close" className="absolute top-4 right-4 text-white bg-black/60 hover:bg-black/80 rounded px-3 py-1" onClick={() => setIsViewerOpen(false)}>✕</button>
          <div className="flex-1 flex items-center justify-center select-none">
            <img src={model.images[currentImageIndex]?.url} alt={`${model.name} - Image ${currentImageIndex + 1}`} className="max-h-[85vh] max-w-[90vw] object-contain" />
          </div>
          {model.images.length > 1 && (
            <div className="p-4 flex items-center justify-between text-white">
              <button onClick={prevImage} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded">Prev</button>
              <div className="space-x-2 overflow-x-auto">
                {model.images.map((img, idx) => (
                  <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`inline-block w-16 h-16 rounded overflow-hidden ${idx===currentImageIndex?'ring-2 ring-yellow-400':''}`}>
                    <img src={img.url} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <button onClick={nextImage} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


