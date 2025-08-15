import React from 'react'

// value: key of selected package or ''
export default function PackagesSelector({ packages = [], value = '', onChange }) {
  if (!Array.isArray(packages) || packages.length === 0) return null
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Popular Packages</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.slice(0, 4).map((p) => (
          <label key={p.key || p.name} className={`block p-4 rounded border cursor-pointer ${value === (p.key||p.name) ? 'border-yellow-400 ring-1 ring-yellow-300' : 'border-gray-200 dark:border-gray-800'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                {p.description && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{p.description}</div>}
              </div>
              <input
                type="radio"
                name="model-package"
                className="mt-1"
                checked={value === (p.key||p.name)}
                onChange={() => onChange?.(p.key || p.name)}
              />
            </div>
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">+${Number(p.priceDelta||0).toLocaleString()}</div>
            {Array.isArray(p.items) && p.items.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                {p.items.map((it, idx) => <li key={idx}>{it}</li>)}
              </ul>
            )}
          </label>
        ))}
      </div>
      <div>
        <button
          type="button"
          className="text-sm text-gray-600 dark:text-gray-300 underline"
          onClick={() => onChange?.('')}
        >Remove package</button>
      </div>
    </div>
  )
}


