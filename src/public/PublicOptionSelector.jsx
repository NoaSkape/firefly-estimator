import { useState } from 'react'

export default function PublicOptionSelector({ options, value = [], onChange }) {
  const [open, setOpen] = useState(new Set())
  const isSelected = (opt) => value.some(v => v.id === opt.id)
  const toggle = (opt, subject) => {
    const next = isSelected(opt) ? value.filter(v => v.id !== opt.id) : [...value, { ...opt, subject }]
    onChange?.(next)
  }
  const toggleSubject = (s) => {
    const n = new Set(open); n.has(s) ? n.delete(s) : n.add(s); setOpen(n)
  }
  return (
    <div className="space-y-4">
      {options.map(cat => (
        <div key={cat.subject} className="card overflow-hidden">
          <button className="w-full px-4 py-3 font-semibold text-left flex justify-between items-center" onClick={() => toggleSubject(cat.subject)}>
            <span>{cat.subject}</span>
            <span className="opacity-60">{open.has(cat.subject)?'▾':'▸'}</span>
          </button>
          {open.has(cat.subject) && (
            <div className="p-4 space-y-3">
              {cat.items.map(opt => (
                <label key={opt.id} className="flex items-start gap-3">
                  <input type="checkbox" checked={isSelected(opt)} onChange={() => toggle(opt, cat.subject)} />
                  <div className="flex-1">
                    <div className="font-medium">{opt.name} - ${opt.price.toLocaleString()}</div>
                    {opt.description && <div className="text-sm opacity-80">{opt.description}</div>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}




