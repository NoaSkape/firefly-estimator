import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserButton, SignedIn, SignIn, ClerkProvider } from '@clerk/clerk-react'
import QuoteBuilder from './pages/QuoteBuilder'
import QuotePDFPreview from './pages/QuotePDFPreview'
import ModelDetail from './pages/ModelDetail'
import './App.css'

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}

function App() {
  const [quoteData, setQuoteData] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)

  const handleModelSelect = (modelCode) => {
    setSelectedModel(modelCode)
  }

  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <SignedIn>
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
                <Route 
                  path="/models/:modelCode" 
                  element={
                    <ModelDetail onModelSelect={handleModelSelect} />
                  } 
                />
              </Routes>
            </main>
          </SignedIn>
          
          {/* Show sign-in page for unauthenticated users */}
          <div className="flex items-center justify-center min-h-screen">
            <SignIn routing="path" path="/sign-in" />
          </div>
        </div>
      </Router>
    </ClerkProvider>
  )
}

export default App
