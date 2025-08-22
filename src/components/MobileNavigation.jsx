import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import analytics from '../utils/analytics'

export default function MobileNavigation() {
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const menuRef = useRef(null)
  const hamburgerRef = useRef(null)

  useEffect(() => {
    checkAdminStatus()
    setupScrollListener()
    setupInstallListener()
  }, [user])

  useEffect(() => {
    // Close menu when route changes
    setIsMenuOpen(false)
  }, [location])

  const setupInstallListener = () => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        setIsInstallable(false)
        return
      }
      
      if (window.navigator.standalone === true) {
        setIsInstalled(true)
        setIsInstallable(false)
        return
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    checkIfInstalled()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (navigator.userAgent.includes('Chrome')) {
        alert('To install the Firefly app:\n\n1. Click the menu (⋮) in your browser\n2. Select "Install Firefly Tiny Homes"\n3. Click "Install"')
      } else {
        alert('To install the Firefly app, look for the install option in your browser menu.')
      }
      return
    }

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Error during installation:', error)
    }
  }

  const checkAdminStatus = () => {
    if (!user) return
    try {
      const adminStatus = canEditModelsClient(user)
      setIsAdmin(adminStatus)
    } catch (error) {
      console.error('Admin status check failed:', error)
    }
  }

  const setupScrollListener = () => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }

  const toggleMenu = () => {
    const newState = !isMenuOpen
    setIsMenuOpen(newState)
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = newState ? 'hidden' : ''
    
    // Track menu interaction
    analytics.trackEvent('mobile_menu_toggle', {
      action: newState ? 'open' : 'close',
      location: location.pathname
    })
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    document.body.style.overflow = ''
  }

  const handleMenuLinkClick = (linkName) => {
    closeMenu()
    analytics.trackEvent('mobile_menu_navigation', {
      link: linkName,
      from: location.pathname
    })
  }

  return (
    <>
      {/* Mobile Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-transparent'
      } safe-area-top`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2"
            onClick={() => handleMenuLinkClick('logo')}
          >
            <img 
              src="/logo/firefly-logo.png" 
              alt="Firefly Tiny Homes" 
              className="h-8 w-auto"
            />
            <span className={`text-lg font-bold hidden sm:block ${isScrolled ? 'text-gray-900' : 'text-gray-100'}`}>
              Firefly Tiny Homes
            </span>
          </Link>

          {/* Try the App Link - Center */}
          {!isInstalled && (isInstallable || navigator.userAgent.includes('Chrome')) && (
            <button
              onClick={handleInstallClick}
              className={`text-sm font-medium underline hover:no-underline transition-all ${
                isScrolled ? 'text-gray-700' : 'text-gray-100'
              }`}
            >
              Try the app!
            </button>
          )}

          {/* Hamburger Menu */}
          <button
            ref={hamburgerRef}
            data-mobile-menu
            onClick={toggleMenu}
            className={`mobile-button hamburger p-2 ${isScrolled ? 'text-gray-900' : 'text-gray-100'}`}
            aria-label="Toggle mobile menu"
            aria-expanded={isMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <div 
          ref={menuRef}
          data-mobile-menu-content
          data-swipe="left"
          className="mobile-menu-content safe-area-top safe-area-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <img 
                src="/logo/firefly-logo.png" 
                alt="Firefly Tiny Homes" 
                className="h-8 w-auto"
              />
              <span className="text-lg font-bold text-gray-900">
                Firefly Tiny Homes
              </span>
            </div>
            <button
              onClick={closeMenu}
              className="mobile-button p-2"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu Content */}
          <nav className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {/* Main Navigation */}
              <div className="space-y-1">
                <Link
                  to="/"
                  className="mobile-menu-link"
                  onClick={() => handleMenuLinkClick('home')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Home</span>
                </Link>

                <Link
                  to="/models"
                  className="mobile-menu-link"
                  onClick={() => handleMenuLinkClick('models')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Explore Models</span>
                </Link>
              </div>

              {/* User Section */}
              <div className="pt-4 border-t border-gray-200">
                {isSignedIn ? (
                  <div className="space-y-1">
                    <Link
                      to="/builds"
                      className="mobile-menu-link"
                      onClick={() => handleMenuLinkClick('my-home')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                      </svg>
                      <span>My Home</span>
                    </Link>

                    <Link
                      to="/portal"
                      className="mobile-menu-link"
                      onClick={() => handleMenuLinkClick('orders')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span>My Orders</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="mobile-menu-link"
                        onClick={() => handleMenuLinkClick('admin')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Admin</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Link
                      to="/sign-in"
                      className="mobile-menu-link"
                      onClick={() => handleMenuLinkClick('sign-in')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign In</span>
                    </Link>

                    <Link
                      to="/sign-up"
                      className="mobile-menu-link"
                      onClick={() => handleMenuLinkClick('sign-up')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Create Account</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* About Section */}
              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-1">
                  <Link
                    to="/faq"
                    className="mobile-menu-link"
                    onClick={() => handleMenuLinkClick('faq')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>FAQ</span>
                  </Link>

                  <Link
                    to="/about"
                    className="mobile-menu-link"
                    onClick={() => handleMenuLinkClick('about')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>About Us</span>
                  </Link>
                </div>
              </div>

              {/* Contact Section */}
              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-1">
                  <a
                    href="tel:+18302412410"
                    className="mobile-menu-link"
                    title="Call Firefly Tiny Homes"
                    onClick={() => handleMenuLinkClick('phone')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Call Us</span>
                  </a>

                  <a
                    href="mailto:office@fireflytinyhomes.com"
                    className="mobile-menu-link"
                    title="Email Firefly Tiny Homes"
                    onClick={() => handleMenuLinkClick('email')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Email Us</span>
                  </a>
                </div>
              </div>
            </div>
          </nav>

          {/* Sign Out at Bottom */}
          {isSignedIn && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  handleMenuLinkClick('sign-out')
                  signOut()
                }}
                className="mobile-menu-link text-red-600 w-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Menu Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-sm text-gray-500 text-center">
              <p>© 2024 Firefly Tiny Homes</p>
              <p className="mt-1">Champion Park Model Homes</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
