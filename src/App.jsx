import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import QuoteBuilder from './pages/QuoteBuilder'
import Home from './pages/Home'
import QuotePDFPreview from './pages/QuotePDFPreview'
import ModelDetail from './pages/ModelDetail'
import Configure from './pages/checkout/Configure'
import Confirm from './pages/checkout/Confirm'
import FAQPage from './pages/FAQ'
import ModelsPage from './pages/Models'
import PaymentMethod from './pages/checkout/PaymentMethod'
import Buyer from './pages/checkout/Buyer'
import Review from './pages/checkout/Review'
import AccountCreate from './pages/checkout/Account'
import HowItWorks from './pages/how/HowItWorks'
import Ordering from './pages/how/Ordering'
import Delivery from './pages/how/Delivery'
import Warranty from './pages/how/Warranty'
import WhyOnline from './pages/how/WhyOnline'
import PortalOrders from './pages/portal/Orders'
import PortalDashboard from './pages/portal/Dashboard'
import AdminOrders from './pages/admin/Orders'
import PublicModelDetail from './public/PublicModelDetail'
import PackageDetail from './public/PackageDetail'
import BuildsDashboard from './pages/builds/Builds'
import BuildCustomize from './pages/builds/Customize'
import About from './pages/About'
import Contact from './pages/Contact'
import { getAllValidSlugs } from './utils/modelUrlMapping'
import { testModelUrls, generateModelSitemap } from './utils/testModelUrls'
import { verifyImplementation } from './utils/verifyImplementation'
import ErrorBoundary from './components/ErrorBoundary'
import FirefliesBackground from './components/FirefliesBackground'
import BackgroundImage from './components/BackgroundImage'
import Header from './components/Header'
import Footer from './components/Footer'
import ResumeBanner from './components/ResumeBanner'
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
          {/* Background image with gradient + animated fireflies above it */}
          <BackgroundImage src="/hero/tiny-home-dusk.png" />
          <FirefliesBackground density={0.12} color="#FFD86B" parallax={0.25} />
          <Header isAdmin={isAdmin} />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ResumeBanner />
            <Routes>
              <Route 
                path="/" 
                element={<Home />} 
              />
              <Route path="/estimator" element={<QuoteBuilder />} />
              <Route path="/models" element={<ModelsPage />} />
              
              {/* Single dynamic route supporting slug or code */}
              <Route 
                path="/models/:id" 
                element={<ModelDetail onModelSelect={handleModelSelect} />} 
              />
              <Route path="/checkout/configure/:slug" element={<AccountCreate />} />
              <Route path="/checkout/payment" element={<PaymentMethod />} />
              <Route path="/checkout/buyer" element={<Buyer />} />
              <Route path="/checkout/review" element={<Review />} />
              <Route path="/how" element={<HowItWorks />} />
              <Route path="/how/ordering" element={<Ordering />} />
              <Route path="/how/delivery" element={<Delivery />} />
              <Route path="/how/warranty" element={<Warranty />} />
              <Route path="/how/why-buy-online" element={<WhyOnline />} />
              {/* Removed legacy steps: Delivery/Auth/Payment/Sign */}
              <Route path="/checkout/confirm" element={<Confirm />} />
              <Route path="/public/models/:id" element={<PublicModelDetail />} />
              <Route path="/public/models/:id/package/:key" element={<PackageDetail />} />
              <Route path="/builds" element={<BuildsDashboard />} />
              <Route path="/builds/:buildId" element={<BuildCustomize />} />
              <Route path="/checkout/:buildId" element={<Review />} />
              <Route path="/checkout/:buildId/payment" element={<PaymentMethod />} />
              <Route path="/checkout/:buildId/buyer" element={<Buyer />} />
              <Route path="/checkout/:buildId/review" element={<Review />} />
              <Route path="/checkout/:buildId/confirm" element={<Confirm />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/portal" element={<PortalOrders />} />
              <Route path="/portal/dashboard" element={<PortalDashboard />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/faq" element={<FAQPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
