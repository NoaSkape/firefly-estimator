import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import QuoteBuilder from './pages/QuoteBuilder'
import QuotePDFPreview from './pages/QuotePDFPreview'
import ModelDetail from './pages/ModelDetail'
import { getAllValidSlugs } from './utils/modelUrlMapping'
import { testModelUrls, generateModelSitemap } from './utils/testModelUrls'
import { verifyImplementation } from './utils/verifyImplementation'
import ErrorBoundary from './components/ErrorBoundary'
import FirefliesBackground from './components/FirefliesBackground'
import './App.css'

function App() {
  const [quoteData, setQuoteData] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const persisted = window.localStorage.getItem('theme')
    return persisted ? persisted === 'dark' : true
  })
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const userBtnRef = useRef(null)

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

  // Close custom menu on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!themeMenuOpen) return
      if (userBtnRef.current && !userBtnRef.current.contains(e.target)) {
        setThemeMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [themeMenuOpen])

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
                <div className="flex items-center relative" ref={userBtnRef} onClick={() => setThemeMenuOpen(true)}>
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
                        label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                        onClick={toggleTheme}
                      />
                    </UserButton.MenuItems>
                  </UserButton>
                  {themeMenuOpen && (
                    <div className="absolute right-0 mt-12 w-72 rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-xl z-50">
                      <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">{ /* header */ }
                        {dark ? 'Appearance: Dark' : 'Appearance: Light'}
                      </div>
                      <button
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
                        onClick={() => { toggleTheme(); setThemeMenuOpen(false) }}
                      >
                        {dark ? 'Switch to light mode' : 'Switch to dark mode'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route 
                path="/" 
                element={<QuoteBuilder />} 
              />
              
              {/* Single dynamic route supporting slug or code */}
              <Route 
                path="/models/:id" 
                element={<ModelDetail onModelSelect={handleModelSelect} />} 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
