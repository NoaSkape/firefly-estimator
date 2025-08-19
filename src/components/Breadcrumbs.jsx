import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-300 mb-3">
      <ol className="flex items-center gap-2 flex-wrap">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-center gap-2">
            {it.to ? (
              <Link to={it.to} className="hover:underline text-yellow-400">{it.label}</Link>
            ) : (
              <span className="text-gray-400">{it.label}</span>
            )}
            {idx < items.length - 1 && <span className="opacity-60">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}


