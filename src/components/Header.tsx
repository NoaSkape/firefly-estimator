import React, { useEffect, useState } from 'react'
import { UserButton } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'

type HeaderProps = {
  isAdmin?: boolean
}

export default function Header({ isAdmin }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [shrink, setShrink] = useState(false)

  useEffect(() => {
    function onScroll() {
      setShrink(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function NavLinks() {
    return (
      <nav className="hidden md:flex items-center gap-6 text-sm">
        <a href="/models" className="hover:text-yellow-400">Explore Models</a>
        <a href="/estimator" className="hover:text-yellow-400">Design & Price</a>
        <a href="/#financing" className="hover:text-yellow-400">Financing</a>
        <a href="/how" className="hover:text-yellow-400">How It Works</a>
        <a href="/faq" className="hover:text-yellow-400">FAQ</a>
        <a href="/about" className="hover:text-yellow-400">About</a>
      </nav>
    )
  }

  return (
    <header className={`sticky top-0 z-40 bg-gray-900/60 border-b border-gray-800 backdrop-blur-sm transition-all ${shrink ? 'py-3' : 'py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <img src="/logo/firefly-logo.png" alt="Firefly Tiny Homes" className="h-10 w-auto mr-3" loading="eager" />
            <span className="text-lg font-semibold text-gray-100">Firefly Estimator</span>
          </a>
        </div>

        <NavLinks />

        <div className="flex items-center gap-3">
          {isAdmin && (
            <a href="/estimator" className="hidden sm:inline text-sm px-3 py-1.5 rounded bg-white/10 text-white hover:bg-white/20">Estimator</a>
          )}
          <a href="/checkout?mode=finance" className="hidden md:inline text-sm px-3 py-1.5 rounded bg-yellow-400 text-gray-900 hover:bg-yellow-300">Get Pre-Approved</a>
          <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
          <button aria-label="Open menu" className="md:hidden p-2 rounded hover:bg-white/10" onClick={() => setOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 top-0 h-full w-80 max-w-[80%] bg-gray-900 border-l border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <img src="/logo/firefly-logo.png" alt="Firefly Tiny Homes" className="h-8 w-auto mr-2" />
                <span className="text-sm font-semibold text-gray-100">Menu</span>
              </div>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2 rounded hover:bg-white/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <nav className="flex flex-col gap-3 text-sm">
              <a href="/models" className="px-2 py-2 rounded hover:bg-white/10" onClick={() => setOpen(false)}>Explore Models</a>
              <a href="/estimator" className="px-2 py-2 rounded hover:bg-white/10" onClick={() => setOpen(false)}>Design & Price</a>
              <a href="/#financing" className="px-2 py-2 rounded hover:bg-white/10" onClick={() => setOpen(false)}>Financing</a>
              <a href="/how" className="px-2 py-2 rounded hover:bg-white/10" onClick={() => setOpen(false)}>How It Works</a>
              <a href="/faq" className="px-2 py-2 rounded hover:bg-white/10" onClick={() => setOpen(false)}>FAQ</a>
              <a href="/about" className="px-2 py-2 rounded hover:bg-white/10" onClick={() => setOpen(false)}>About</a>
              <a href="/checkout?mode=finance" className="mt-2 text-center px-3 py-2 rounded bg-yellow-400 text-gray-900 hover:bg-yellow-300" onClick={() => setOpen(false)}>Get Pre-Approved</a>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}


