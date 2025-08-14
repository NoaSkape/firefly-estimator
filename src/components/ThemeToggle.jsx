import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const persisted = window.localStorage.getItem('theme')
    return persisted ? persisted === 'dark' : true
  })

  useEffect(() => {
    const html = document.documentElement
    if (dark) {
      html.classList.add('dark')
      html.setAttribute('data-theme', 'dark')
      document.body.setAttribute('data-theme', 'dark')
      window.localStorage.setItem('theme', 'dark')
    } else {
      html.classList.remove('dark')
      html.setAttribute('data-theme', 'light')
      document.body.setAttribute('data-theme', 'light')
      window.localStorage.setItem('theme', 'light')
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


