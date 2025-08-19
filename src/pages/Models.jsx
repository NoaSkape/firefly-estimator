import { useMemo, useState, useEffect } from 'react'
import { MODELS } from '../data/models'
import { Seo } from '../components/Seo'
import PublicModelSelector from '../public/PublicModelSelector'

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

export default function ModelsPage() {
  const [filters, setFilters] = useState(parseQuery())
  const [all, setAll] = useState(MODELS)

  useEffect(() => { updateQuery(filters) }, [filters])

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

  function setFilter(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  return (
    <>
      <Seo
        title="Park Model Homes for Sale in Texas | Firefly Tiny Homes"
        description="Browse all Champion Park Model Homes. Filter by price, size, loft, and porches. Buy online with Firefly Tiny Homes."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Explore Park Model Homes</h1>
          <p className="text-gray-300 mt-2">Filter by price, loft, or porch to find the perfect Champion Park Model.</p>
        </header>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="flex flex-col text-sm text-gray-200">
            Price Range
            <select value={filters.price} onChange={e => setFilter('price', e.target.value)} className="mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded">
              <option value="">Any</option>
              <option value="50-70">$50k – $70k</option>
              <option value="70-90">$70k – $90k</option>
              <option value="90-120">$90k – $120k</option>
            </select>
          </label>
          <label className="flex flex-col text-sm text-gray-200">
            Loft
            <select value={filters.loft} onChange={e => setFilter('loft', e.target.value)} className="mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded">
              <option value="">Any</option>
              <option value="true">Has loft</option>
              <option value="false">No loft</option>
            </select>
          </label>
          <label className="flex flex-col text-sm text-gray-200">
            Porch
            <select value={filters.porch} onChange={e => setFilter('porch', e.target.value)} className="mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded">
              <option value="">Any</option>
              <option value="true">Has porch</option>
              <option value="false">No porch</option>
            </select>
          </label>
          <label className="flex flex-col text-sm text-gray-200">
            Sort
            <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)} className="mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded">
              <option value="">Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </label>
        </div>

        {/* Reuse public selector grid */}
        <div className="card">
          <PublicModelSelector models={models} />
        </div>
      </div>
    </>
  )
}


