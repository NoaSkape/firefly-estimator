import { useState, useEffect } from 'react'
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

  const handleModelSelect = (modelCode) => {
    setSelectedModel(modelCode)
  }

  // Dynamic routing handles all slugs/codes; no need to enumerate

  // Test URLs in development
  useEffect(() => {
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
  }, [])

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Animated background (behind all content) */}
          <FirefliesBackground density={0.14} color="#FFD86B" parallax={0.25} />
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">F</span>
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Firefly Estimator
                  </h1>
                </div>
                <div className="flex items-center">
                  <UserButton 
                    appearance={{
                      elements: {
                        userButtonAvatarBox: 'w-8 h-8',
                        userButtonTrigger: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                      }
                    }}
                  />
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
