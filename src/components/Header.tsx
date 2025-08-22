import React, { useEffect, useState } from 'react'
import { useUser, UserButton, useClerk } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import AuthButton from './AuthButton'

export default function Header() {
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [shrink, setShrink] = useState(false)
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setShrink(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const checkAdminStatus = () => {
      if (user) {
        const adminStatus = canEditModelsClient(user)
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
    }
    checkAdminStatus()
  }, [user])

  function NavLinks() {
    return (
      <nav className="hidden md:flex items-center gap-6 text-sm">
        <a href="/models" className={`hover:text-yellow-400 ${shrink ? 'text-gray-700' : 'text-gray-300'}`}>Explore Models</a>
        {isSignedIn && (
          <a href="/builds" className={`hover:text-yellow-400 ${shrink ? 'text-gray-700' : 'text-gray-300'}`}>My Home</a>
        )}
        <a href="/financing" className={`hover:text-yellow-400 ${shrink ? 'text-gray-700' : 'text-gray-300'}`}>Financing</a>
        <a href="/how" className={`hover:text-yellow-400 ${shrink ? 'text-gray-700' : 'text-gray-300'}`}>How It Works</a>
        <div 
          className="relative"
          onMouseEnter={() => setAboutDropdownOpen(true)}
          onMouseLeave={() => setAboutDropdownOpen(false)}
        >
          <button className={`hover:text-yellow-400 flex items-center gap-1 ${shrink ? 'text-gray-700' : 'text-gray-300'}`}>
            About
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {aboutDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-50">
              <a href="/faq" className="block px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-gray-800">FAQ</a>
              <a href="/about" className="block px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-gray-800">About Us</a>
            </div>
          )}
        </div>
      </nav>
    )
  }

  return (
    <header className={`sticky top-0 z-40 transition-all ${shrink ? 'py-3 bg-gray-100/95 border-b border-gray-300 backdrop-blur-sm' : 'py-5 bg-gray-900/60 border-b border-gray-800 backdrop-blur-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <img src="/logo/firefly-logo.png" alt="Firefly Tiny Homes" className="h-10 w-auto mr-3" loading="eager" />
            <span className={`text-lg font-semibold ${shrink ? 'text-gray-900' : 'text-gray-100'}`}>Firefly Tiny Homes</span>
          </a>
        </div>

        <NavLinks />

        <div className="flex items-center gap-3">
          {isAdmin && (
            <a href="/admin" className="hidden sm:inline text-sm px-3 py-1.5 rounded bg-yellow-500 text-gray-900 hover:bg-yellow-400">Admin</a>
          )}
          <AuthButton />
          <button aria-label="Open menu" className="md:hidden p-2 rounded hover:bg-white/10" onClick={() => setOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={shrink ? "text-gray-900" : "text-gray-100"}>
              <path d="M3 8h18M3 12h18M3 16h18" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

             {/* Mobile Drawer */}
       {open && (
         <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
           <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)}></div>
           <div className="absolute right-0 top-0 h-full w-80 max-w-[80%] bg-white border-l border-gray-200 p-4 flex flex-col">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center">
                 <img src="/logo/firefly-logo.png" alt="Firefly Tiny Homes" className="h-8 w-auto mr-2" />
                 <span className="text-sm font-semibold text-gray-900">Firefly Tiny Homes</span>
               </div>
               <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2 rounded hover:bg-gray-100">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-900"><path d="M18 6L6 18M6 6l12 12"/></svg>
               </button>
             </div>
             
             {/* Main Navigation */}
             <nav className="flex flex-col gap-3 text-sm flex-1">
               <a href="/models" className="px-2 py-2 rounded hover:bg-gray-100 text-gray-900 font-semibold" onClick={() => setOpen(false)}>Explore Models</a>
               {isSignedIn && (
                 <a href="/builds" className="px-2 py-2 rounded hover:bg-gray-100 text-gray-900 font-semibold" onClick={() => setOpen(false)}>My Home</a>
               )}
               <a href="/financing" className="px-2 py-2 rounded hover:bg-gray-100 text-gray-900 font-semibold" onClick={() => setOpen(false)}>Financing</a>
               <a href="/how" className="px-2 py-2 rounded hover:bg-gray-100 text-gray-900 font-semibold" onClick={() => setOpen(false)}>How It Works</a>
               <a href="/faq" className="px-2 py-2 rounded hover:bg-gray-100 text-gray-900 font-semibold" onClick={() => setOpen(false)}>FAQ</a>
               <a href="/about" className="px-2 py-2 rounded hover:bg-gray-100 text-gray-900 font-semibold" onClick={() => setOpen(false)}>About</a>
               {isAdmin && (
                 <a href="/admin" className="px-2 py-2 rounded bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-semibold" onClick={() => setOpen(false)}>Admin</a>
               )}
             </nav>
             
             {/* Sign Out at Bottom */}
             {isSignedIn && (
               <div className="border-t border-gray-200 pt-4 mt-auto">
                 <button 
                   onClick={() => {
                     signOut()
                     setOpen(false)
                   }}
                   className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 text-gray-900 font-semibold"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                   </svg>
                   Sign Out
                 </button>
               </div>
             )}
           </div>
         </div>
       )}
    </header>
  )
}


