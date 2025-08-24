import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MODELS } from '../data/models'
import { Seo } from '../components/Seo'
import MobileModelCard from '../components/MobileModelCard'
import { useToast } from '../components/ToastProvider'
import analytics from '../utils/analytics'

function parseQuery() {
  const p = new URLSearchParams(window.location.search)
  return {
    price: p.get('price') || '',
    loft: p.get('loft') || '',
    porch: p.get('porch') || '',
    sort: p.get('sort') || '',
  }
}

function updateQuery(q) {
  const p = new URLSearchParams()
  if (q.price) p.set('price', q.price)
  if (q.loft) p.set('loft', q.loft)
  if (q.porch) p.set('porch', q.porch)
  if (q.sort) p.set('sort', q.sort)
  const url = `${window.location.pathname}${p.toString() ? '?' + p.toString() : ''}`
  window.history.replaceState(null, '', url)
}

export default function MobileModelsPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [filters, setFilters] = useState(parseQuery())
  const [all, setAll] = useState(MODELS)
  const [showFilters, setShowFilters] = useState(false)

  // Load latest model data from API and merge over local definitions
  useEffect(() => {
    let cancelled = false
    async function load() {
      const local = MODELS.map(m => ({ ...m }))
      setAll(local)
      try {
        const responses = await Promise.all(local.map(m => fetch(`/api/models/${m.id}`)))
        const apiModels = await Promise.all(responses.map(r => (r.ok ? r.json() : null)))
        const merged = local.map((m, i) => {
          const api = apiModels[i]
          if (!api) return m
          return {
            ...m,
            // prefer API values where available
            name: api.name || m.name,
            description: api.description ?? m.description,
            basePrice: typeof api.basePrice === 'number' ? api.basePrice : m.basePrice,
            // Only surface specs if explicitly present in API; otherwise leave undefined to hide on cards
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
        if (!cancelled) setAll(merged)
      } catch (_) {
        // ignore; fall back to local models
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { 
    updateQuery(filters) 
    
    analytics.trackEvent('mobile_models_page_view', {
      filters: filters,
      modelCount: all.length
    })
  }, [filters])

  // Apply filters
  const models = useMemo(() => {
    let list = [...all]
    if (filters.price) {
      const [min, max] = filters.price.split('-').map(v => Number(v))
      list = list.filter(m => {
        const price = Number(m.basePrice || 0)
        return (!isNaN(min) ? price >= min * 1000 : true) && (!isNaN(max) ? price <= max * 1000 : true)
      })
    }
    if (filters.loft) {
      const want = filters.loft === 'true'
      list = list.filter(m => Boolean(m?.hasLoft) === want)
    }
    if (filters.porch) {
      const want = filters.porch === 'true'
      list = list.filter(m => Boolean(m?.hasPorch) === want)
    }
    if (filters.sort === 'price-asc') list.sort((a,b) => (a.basePrice||0) - (b.basePrice||0))
    if (filters.sort === 'price-desc') list.sort((a,b) => (b.basePrice||0) - (a.basePrice||0))
    return list
  }, [all, filters])

  function setFilter(k, v) { 
    setFilters(f => ({ ...f, [k]: v }))
    
    analytics.trackEvent('mobile_models_filter', {
      filter: k,
      value: v,
      resultCount: models.length
    })
  }

  const handleCustomize = (model) => {
    // Use React Router navigation instead of window.location.href
    navigate(`/builds/new?model=${model.slug}`)
  }

  const clearFilters = () => {
    setFilters({})
    addToast({
      type: 'info',
      title: 'Filters Cleared',
      message: 'All filters have been reset'
    })
  }

  const activeFiltersCount = Object.values(filters).filter(v => v).length

  return (
    <>
      <Seo
        title="Park Model Homes for Sale in Texas | Firefly Tiny Homes"
        description="Browse all Champion Park Model Homes. Filter by price, size, loft, and porches. Buy online with Firefly Tiny Homes."
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Explore Park Model Homes</h1>
          <p className="text-gray-300 mt-2">Filter by price, loft, or porch to find the perfect Champion Park Model.</p>
        </header>

        {/* Filter Toggle Button */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-gray-800 text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
          
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-yellow-500 hover:text-yellow-400 text-sm"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col text-sm text-gray-200">
                Price Range
                <select 
                  value={filters.price} 
                  onChange={e => setFilter('price', e.target.value)} 
                  className="mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                >
                  <option value="">Any</option>
                  <option value="50-70">$50k – $70k</option>
                  <option value="70-90">$70k – $90k</option>
                  <option value="90-120">$90k – $120k</option>
                </select>
              </label>
              
              <label className="flex flex-col text-sm text-gray-200">
                Loft
                <select 
                  value={filters.loft} 
                  onChange={e => setFilter('loft', e.target.value)} 
                  className="mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                >
                  <option value="">Any</option>
                  <option value="true">With Loft</option>
                  <option value="false">Without Loft</option>
                </select>
              </label>
              
              <label className="flex flex-col text-sm text-gray-200">
                Porch
                <select 
                  value={filters.porch} 
                  onChange={e => setFilter('porch', e.target.value)} 
                  className="mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                >
                  <option value="">Any</option>
                  <option value="true">With Porch</option>
                  <option value="false">Without Porch</option>
                </select>
              </label>
              
              <label className="flex flex-col text-sm text-gray-200">
                Sort By
                <select 
                  value={filters.sort} 
                  onChange={e => setFilter('sort', e.target.value)} 
                  className="mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                >
                  <option value="">Default</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 text-gray-300">
          {models.length} model{models.length !== 1 ? 's' : ''} found
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 gap-6">
          {models.map((model) => (
            <MobileModelCard
              key={model.id}
              model={model}
            />
          ))}
        </div>

        {/* No Results */}
        {models.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">No models found</h3>
            <p className="text-gray-400 mb-4">Try adjusting your filters to see more results.</p>
            <button
              onClick={clearFilters}
              className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </>
  )
}
