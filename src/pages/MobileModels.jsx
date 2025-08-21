import React, { useState, useEffect, useMemo } from 'react'
import { MODELS } from '../data/models'
import { Seo } from '../components/Seo'
import MobileModelCard from '../components/MobileModelCard'
import MobileQuickViewModal from '../components/MobileQuickViewModal'
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
  const { addToast } = useToast()
  const [filters, setFilters] = useState(parseQuery())
  const [all, setAll] = useState(MODELS)
  const [showFilters, setShowFilters] = useState(false)
  const [quickViewModel, setQuickViewModel] = useState(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

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

  const handleQuickView = (model) => {
    setQuickViewModel(model)
    setIsQuickViewOpen(true)
  }

  const handleCustomize = (model) => {
    // Navigate to customize page
    window.location.href = `/builds/new?model=${model.slug}`
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
      
      <div className="min-h-screen-mobile bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Explore Homes</h1>
              <p className="text-sm text-gray-500">
                {models.length} {models.length === 1 ? 'home' : 'homes'} available
              </p>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="mobile-button flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white border-b border-gray-200 px-4 py-4">
            <div className="space-y-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <select 
                  value={filters.price} 
                  onChange={e => setFilter('price', e.target.value)} 
                  className="mobile-input w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Any Price</option>
                  <option value="50-70">$50k – $70k</option>
                  <option value="70-90">$70k – $90k</option>
                  <option value="90-120">$90k – $120k</option>
                  <option value="120-150">$120k – $150k</option>
                </select>
              </div>

              {/* Loft */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loft
                </label>
                <select 
                  value={filters.loft} 
                  onChange={e => setFilter('loft', e.target.value)} 
                  className="mobile-input w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Any</option>
                  <option value="true">Has loft</option>
                  <option value="false">No loft</option>
                </select>
              </div>

              {/* Porch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porch
                </label>
                <select 
                  value={filters.porch} 
                  onChange={e => setFilter('porch', e.target.value)} 
                  className="mobile-input w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Any</option>
                  <option value="true">Has porch</option>
                  <option value="false">No porch</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select 
                  value={filters.sort} 
                  onChange={e => setFilter('sort', e.target.value)} 
                  className="mobile-input w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Default</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="w-full mobile-button px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Models Grid */}
        <div className="px-4 py-4">
          {models.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No homes found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your filters to see more options.</p>
              <button
                onClick={clearFilters}
                className="mobile-button px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {models.map((model) => (
                <MobileModelCard
                  key={model.slug}
                  model={model}
                  onQuickView={handleQuickView}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick View Modal */}
        <MobileQuickViewModal
          model={quickViewModel}
          isOpen={isQuickViewOpen}
          onClose={() => {
            setIsQuickViewOpen(false)
            setQuickViewModel(null)
          }}
          onCustomize={handleCustomize}
        />
      </div>
    </>
  )
}
