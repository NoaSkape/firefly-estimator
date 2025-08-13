import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const html = document.documentElement
    if (dark) {
      html.setAttribute('data-theme', 'dark')
      document.body.classList.remove('bg-gray-50', 'text-gray-900')
    } else {
      html.setAttribute('data-theme', 'light')
      document.body.classList.add('bg-gray-50', 'text-gray-900')
    }
  }, [dark])

  return (
    <button
      onClick={() => setDark(v => !v)}
      className="ml-3 px-3 py-1 rounded-md text-sm bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700"
      title="Toggle theme"
      aria-pressed={dark ? 'true' : 'false'}
    >
      {dark ? 'Dark' : 'Light'}
    </button>
  )
}


