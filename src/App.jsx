import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'

// Lazy load all page components for better performance
const QuoteBuilder = lazy(() => import('./pages/QuoteBuilder'))
const Home = lazy(() => import('./pages/Home'))
const QuotePDFPreview = lazy(() => import('./pages/QuotePDFPreview'))
const ModelDetail = lazy(() => import('./pages/ModelDetail'))
const Configure = lazy(() => import('./pages/checkout/Configure'))
const Confirm = lazy(() => import('./pages/checkout/Confirm'))
const FAQPage = lazy(() => import('./pages/FAQ'))
const ModelsPage = lazy(() => import('./pages/Models'))
const PaymentMethod = lazy(() => import('./pages/checkout/PaymentMethod'))
const CashPayment = lazy(() => import('./pages/checkout/CashPayment'))
const Buyer = lazy(() => import('./pages/checkout/Buyer'))
const Review = lazy(() => import('./pages/checkout/Review'))
const Agreement = lazy(() => import('./pages/checkout/Agreement'))
const AccountCreate = lazy(() => import('./pages/checkout/Account'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Ordering = lazy(() => import('./pages/how/Ordering'))
const Delivery = lazy(() => import('./pages/how/Delivery'))
const Warranty = lazy(() => import('./pages/how/Warranty'))
const WhyOnline = lazy(() => import('./pages/how/WhyOnline'))
const PortalOrders = lazy(() => import('./pages/portal/Orders'))
const PortalDashboard = lazy(() => import('./pages/portal/Dashboard'))
const AdminOrders = lazy(() => import('./pages/admin/Orders'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const AdvancedReporting = lazy(() => import('./components/AdvancedReporting'))
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'))
const PublicModelDetail = lazy(() => import('./public/PublicModelDetail'))
const PackageDetail = lazy(() => import('./public/PackageDetail'))
const BuildsDashboard = lazy(() => import('./pages/builds/Builds'))
const BuildCustomize = lazy(() => import('./pages/builds/Customize'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Financing = lazy(() => import('./pages/Financing'))
const Customize = lazy(() => import('./pages/Customize'))
const SignUp = lazy(() => import('./pages/SignUp'))
const SignIn = lazy(() => import('./pages/SignIn'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsConditions = lazy(() => import('./pages/TermsConditions'))
const OtherPolicies = lazy(() => import('./pages/OtherPolicies'))
const AdminPolicies = lazy(() => import('./pages/admin/Policies'))
import { getAllValidSlugs } from './utils/modelUrlMapping'
import { testModelUrls, generateModelSitemap } from './utils/testModelUrls'
import { verifyImplementation } from './utils/verifyImplementation'
import ErrorBoundary from './components/ErrorBoundary'
import FirefliesBackground from './components/FirefliesBackground'
import BackgroundImage from './components/BackgroundImage'
import Header from './components/Header'
import MobileNavigation from './components/MobileNavigation'
import Footer from './components/Footer'
import OfflineIndicator from './components/OfflineIndicator'
import { PageLoadingSpinner } from './components/LoadingSpinner'
import NetworkErrorHandler from './components/NetworkErrorHandler'
import './App.css'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from './lib/canEditModels'
import ProtectedRoute from './components/ProtectedRoute'
import { useGlobalAuthErrorInterceptor } from './components/AuthErrorHandler'
import { useScrollToTop } from './hooks/useScrollToTop'
import CustomizationMigration from './components/CustomizationMigration'

import './utils/performance' // Initialize performance monitoring
import './utils/accessibility' // Initialize accessibility features
import { initializeMobileOptimizations } from './utils/mobileOptimizations' // Initialize mobile optimizations

// Component that handles scroll-to-top within Router context
function ScrollToTop() {
  useScrollToTop()
  return null
}

// Component that determines mobile spacing based on route
function MobileSpacingWrapper({ children }) {
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const isAuthPage = location.pathname.startsWith('/sign-in') || location.pathname.startsWith('/sign-up')
  
  // Apply mobile-content-spacing to all pages except homepage and auth pages
  const mainClassName = isHomePage || isAuthPage
    ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-8"
    : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-8 mobile-content-spacing"
  
  return (
    <main id="main-content" className={mainClassName}>
      {children}
    </main>
  )
}

function App() {
  const [quoteData, setQuoteData] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const persisted = window.localStorage.getItem('theme')
    return persisted ? persisted === 'dark' : true
  })
  
  // Initialize global auth error interceptor
  useGlobalAuthErrorInterceptor()

  // Initialize mobile optimizations for smooth viewport handling
  useEffect(() => {
    initializeMobileOptimizations()
  }, [])

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

    // Register service worker for caching and offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })
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
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = canEditModelsClient(user)
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
    }
    checkAdminStatus()
  }, [user])

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
            const isDark = document.documentElement.classList.contains('dark')
            btn.innerHTML = `${iconSvg(!isDark)} ${isDark ? 'Switch to light mode' : 'Switch to dark mode'}`
          }
          setButtonLabel()
          btn.onclick = () => {
            toggleTheme()
            setTimeout(setButtonLabel, 50)
          }
          wrapper.appendChild(btn)
          list.insertBefore(wrapper, listItem)
        } catch (error) {
          console.log('Failed to inject theme toggle:', error)
        }
      }, 100)
    }

    document.addEventListener('click', tryInjectThemeRow)
    return () => document.removeEventListener('click', tryInjectThemeRow)
  }, [dark])

  // no custom popover; rely on Clerk UserButton.Action; above effect injects only if missing

  return (
    <ErrorBoundary>
      <NetworkErrorHandler>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col transition-colors duration-300" data-app-container>
            {/* Skip links for accessibility */}
            <a href="#main-content" className="skip-link sr-only-focusable">
              Skip to main content
            </a>
            <a href="#navigation" className="skip-link sr-only-focusable">
              Skip to navigation
            </a>
            
            {/* Background image with gradient + animated fireflies above it */}
            <BackgroundImage src="/hero/tiny-home-dusk.png" />
            <FirefliesBackground density={0.12} color="#FFD86B" parallax={0.25} />
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <Header />
            </div>
            
            {/* Mobile Navigation */}
            <div className="md:hidden">
              <MobileNavigation />
            </div>

            <div className="flex-1">
              <MobileSpacingWrapper>
                <OfflineIndicator />
                <CustomizationMigration />
                <Suspense fallback={<PageLoadingSpinner />}>
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
              <Route path="/builds" element={
                <ProtectedRoute>
                  <BuildsDashboard />
                </ProtectedRoute>
              } />
              <Route path="/builds/:buildId" element={
                <ProtectedRoute>
                  <BuildCustomize />
                </ProtectedRoute>
              } />
              <Route path="/checkout/:buildId" element={
                <ProtectedRoute>
                  <Review />
                </ProtectedRoute>
              } />
              <Route path="/checkout/:buildId/payment-method" element={
                <ProtectedRoute>
                  <PaymentMethod />
                </ProtectedRoute>
              } />
              <Route path="/checkout/:buildId/cash-payment" element={
                <ProtectedRoute>
                  <CashPayment />
                </ProtectedRoute>
              } />
              <Route path="/checkout/:buildId/buyer" element={
                <ProtectedRoute>
                  <Buyer />
                </ProtectedRoute>
              } />
              <Route path="/checkout/:buildId/review" element={
                <ProtectedRoute>
                  <Review />
                </ProtectedRoute>
              } />
              <Route path="/checkout/:buildId/agreement" element={
                <ProtectedRoute>
                  <Agreement />
                </ProtectedRoute>
              } />
              <Route path="/checkout/:buildId/confirm" element={
                <ProtectedRoute>
                  <Confirm />
                </ProtectedRoute>
              } />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/financing" element={<Financing />} />
              <Route path="/customize/:modelId" element={<Customize />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/sign-in" element={<SignIn />} />
              
              {/* Clerk-specific routes for email verification and other flows */}
              <Route path="/sign-up/verify-email-address" element={<SignUp />} />
              <Route path="/sign-up/verify-email-address/*" element={<SignUp />} />
              <Route path="/sign-in/verify-email-address" element={<SignIn />} />
              <Route path="/sign-in/verify-email-address/*" element={<SignIn />} />
              <Route path="/verify-email-address" element={<SignUp />} />
              <Route path="/verify-email-address/*" element={<SignUp />} />
              <Route path="/reset-password" element={<SignIn />} />
              <Route path="/reset-password/*" element={<SignIn />} />
              <Route path="/sign-up/continue" element={<SignUp />} />
              <Route path="/sign-up/continue/*" element={<SignUp />} />
              <Route path="/sign-in/continue" element={<SignIn />} />
              <Route path="/sign-in/continue/*" element={<SignIn />} />
              <Route path="/portal" element={
                <ProtectedRoute>
                  <PortalOrders />
                </ProtectedRoute>
              } />
              <Route path="/portal/dashboard" element={
                <ProtectedRoute>
                  <PortalDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminOverview />
                </ProtectedRoute>
              } />
              <Route path="/admin/orders" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminOrders />
                </ProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdvancedReporting />
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute requireAdmin={true}>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              } />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              <Route path="/other-policies" element={<OtherPolicies />} />
              <Route path="/admin/policies" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminPolicies />
                </ProtectedRoute>
              } />
                                </Routes>
                  </Suspense>
                </MobileSpacingWrapper>
              </div>
          <Footer />
                  </div>
        </Router>
      </NetworkErrorHandler>
    </ErrorBoundary>
  )
}

export default App
