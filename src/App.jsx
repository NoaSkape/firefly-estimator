import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import QuoteBuilder from './pages/QuoteBuilder'
import Home from './pages/Home'
import QuotePDFPreview from './pages/QuotePDFPreview'
import ModelDetail from './pages/ModelDetail'
import Configure from './pages/checkout/Configure'
import Delivery from './pages/checkout/Delivery'
import AuthStep from './pages/checkout/Auth'
import Payment from './pages/checkout/Payment'
import Sign from './pages/checkout/Sign'
import Confirm from './pages/checkout/Confirm'
import PortalOrders from './pages/portal/Orders'
import AdminOrders from './pages/admin/Orders'
import { getAllValidSlugs } from './utils/modelUrlMapping'
import { testModelUrls, generateModelSitemap } from './utils/testModelUrls'
import { verifyImplementation } from './utils/verifyImplementation'
import ErrorBoundary from './components/ErrorBoundary'
import FirefliesBackground from './components/FirefliesBackground'
import './App.css'
import { SignedIn, useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from './lib/canEditModels'

function App() {
  const [quoteData, setQuoteData] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const persisted = window.localStorage.getItem('theme')
    return persisted ? persisted === 'dark' : true
  })
  

  const handleModelSelect = (modelCode) => {
    setSelectedModel(modelCode)
  }

  // Dynamic routing handles all slugs/codes; no need to enumerate

  // Test URLs in development
  useEffect(() => {
    // apply theme on mount and when toggled
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

    if (import.meta.env.DEV) {
      console.log('🚀 Development Mode - Comprehensive Testing...')
      
      // Basic URL testing
      testModelUrls()
      generateModelSitemap()
      
      // Comprehensive verification
      setTimeout(() => {
        console.log('\n🔍 Running comprehensive verification...')
        verifyImplementation()
      }, 1000)
    }
  }, [dark])

  const toggleTheme = () => setDark(v => !v)
  const { user } = useUser()
  const isAdmin = canEditModelsClient(user)

  // Fallback injection: if Clerk doesn't render our MenuItems in production, insert a row into the open popover
  useEffect(() => {
    function tryInjectThemeRow() {
      // Defer to allow Clerk popover DOM to mount
      setTimeout(() => {
        try {
          const signOutBtn = Array.from(document.querySelectorAll('button, a'))
            .find(el => (el.textContent || '').trim() === 'Sign out')
          if (!signOutBtn) return
          const listItem = signOutBtn.closest('li, div') || signOutBtn.parentElement
          const list = listItem?.parentElement
          if (!list || list.querySelector('[data-ff-theme-toggle]')) return

          const wrapper = document.createElement(listItem?.tagName || 'div')
          wrapper.setAttribute('data-ff-theme-toggle', 'true')
          wrapper.className = listItem?.className || ''

          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = signOutBtn.className || 'w-full text-left px-4 py-3'
          function iconSvg(isDarkLabel) {
            // isDarkLabel === true => label says "Switch to dark mode" → show moon icon
            if (isDarkLabel) {
              return '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
            }
            // else show sun icon
            return '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
          }
          function setButtonLabel() {
            const toDark = !dark
            const label = toDark ? 'Switch to dark mode' : 'Switch to light mode'
            btn.innerHTML = '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-right:12px;opacity:.9">' + iconSvg(toDark) + '</span><span>' + label + '</span>'
          }
          setButtonLabel()
          btn.onclick = () => {
            toggleTheme()
            // update label shortly after theme flips
            setTimeout(() => {
              setButtonLabel()
            }, 0)
          }

          wrapper.appendChild(btn)
          list.insertBefore(wrapper, listItem)
        } catch {}
      }, 50)
    }

    document.addEventListener('click', tryInjectThemeRow)
    return () => document.removeEventListener('click', tryInjectThemeRow)
  }, [dark])

  // no custom popover; rely on Clerk UserButton.Action; above effect injects only if missing

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen transition-colors duration-300" data-app-container>
          {/* Animated background (behind all content) */}
          <FirefliesBackground density={0.14} color="#FFD86B" parallax={0.25} />
          <header className="bg-gray-900/50 border-b border-gray-800 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-5">
                <div className="flex items-center">
                  <img src="/logo/firefly-logo.png" alt="Firefly Tiny Homes" className="h-12 w-auto mr-3" />
                  <h1 className="text-xl font-semibold text-gray-100">Firefly Estimator</h1>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <a href="/estimator" className="text-sm px-3 py-1.5 rounded bg-white/10 text-white hover:bg-white/20">Estimator</a>
                  )}
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: 'w-8 h-8',
                        userButtonTrigger: 'focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
                      }
                    }}
                  >
                    {/* Append a theme toggle entry to the default Clerk menu */}
                    <UserButton.MenuItems>
                      <UserButton.Action
                        id="toggle-theme"
                        label="Toggle dark mode"
                        onClick={toggleTheme}
                      />
                    </UserButton.MenuItems>
                  </UserButton>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route 
                path="/" 
                element={<Home />} 
              />
              <Route path="/estimator" element={<QuoteBuilder />} />
              
              {/* Single dynamic route supporting slug or code */}
              <Route 
                path="/models/:id" 
                element={<ModelDetail onModelSelect={handleModelSelect} />} 
              />
              <Route path="/checkout/configure/:slug" element={<Configure />} />
              <Route path="/checkout/delivery" element={<Delivery />} />
              <Route path="/checkout/auth" element={<AuthStep />} />
              <Route path="/checkout/payment" element={<Payment />} />
              <Route path="/checkout/sign" element={<Sign />} />
              <Route path="/checkout/confirm" element={<Confirm />} />
              <Route path="/portal" element={<PortalOrders />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
