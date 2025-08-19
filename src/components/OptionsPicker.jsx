import { useMemo, useState } from 'react'

// optionsCatalog: Array<{ id, name, price, description?, group }>
export default function OptionsPicker({ optionsCatalog = [], value = [], onChange }) {
  const [expanded, setExpanded] = useState({})
  const groups = useMemo(() => {
    const map = new Map()
    for (const opt of optionsCatalog) {
      const g = opt.group || 'General'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(opt)
    }
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }))
  }, [optionsCatalog])

  function isChecked(opt) { return value.some(v => (v.code || v.id) === opt.id) }
  function getQuantity(opt) { return (value.find(v => (v.code || v.id) === opt.id)?.quantity) || 1 }
  function setQuantity(opt, qty) {
    const q = Math.max(1, Number.isFinite(qty) ? qty : 1)
    const exists = isChecked(opt)
    let next
    if (!exists) {
      next = [...value, { code: opt.id, name: opt.name, price: Number(opt.price||0), quantity: q }]
    } else {
      next = value.map(v => (v.code === opt.id || v.id === opt.id) ? { ...v, quantity: q } : v)
    }
    onChange(next)
  }
  function toggle(opt) {
    const exists = isChecked(opt)
    const next = exists
      ? value.filter(v => (v.code || v.id) !== opt.id)
      : [...value, { code: opt.id, name: opt.name, price: Number(opt.price||0), quantity: 1 }]
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {groups.map(({ group, items }) => (
        <div key={group} className="card overflow-hidden">
          <button type="button" onClick={()=>setExpanded(e=>({...e,[group]:!e[group]}))} className="w-full px-4 py-3 text-left font-semibold border-b border-white/10">
            {group} <span className="opacity-60">{expanded[group] ? '▾' : '▸'}</span>
          </button>
          {expanded[group] && (
            <div className="p-3 space-y-2">
              {items.map(opt => (
                <div key={opt.id} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={isChecked(opt)} onChange={()=>toggle(opt)} />
                  <div className="flex-1">
                    <div className="font-medium flex items-center justify-between">
                      <span>{opt.name} <span className="opacity-70">${Number(opt.price||0).toLocaleString()}</span></span>
                      {isChecked(opt) && (
                        <div className="flex items-center gap-2 text-xs">
                          <button className="px-2 py-1 rounded border border-gray-700" onClick={()=>setQuantity(opt, getQuantity(opt)-1)}>-</button>
                          <input className="w-12 px-2 py-1 rounded border border-gray-700 bg-transparent"
                                 value={getQuantity(opt)}
                                 onChange={(e)=>setQuantity(opt, parseInt(e.target.value, 10)||1)} />
                          <button className="px-2 py-1 rounded border border-gray-700" onClick={()=>setQuantity(opt, getQuantity(opt)+1)}>+</button>
                        </div>
                      )}
                    </div>
                    {opt.description && <div className="text-sm opacity-80">{opt.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


