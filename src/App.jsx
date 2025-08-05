import { useState } from 'react'
import QuoteBuilder from './pages/QuoteBuilder'
import QuotePDFPreview from './pages/QuotePDFPreview'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('builder')
  const [quoteData, setQuoteData] = useState(null)

  const handleGenerateQuote = (data) => {
    setQuoteData(data)
    setCurrentPage('preview')
  }

  const handleBackToBuilder = () => {
    setCurrentPage('builder')
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            <nav className="flex space-x-4">
              <button
                onClick={() => setCurrentPage('builder')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'builder'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Quote Builder
              </button>
              {quoteData && (
                <button
                  onClick={() => setCurrentPage('preview')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 'preview'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  PDF Preview
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'builder' && (
          <QuoteBuilder onGenerateQuote={handleGenerateQuote} />
        )}
        {currentPage === 'preview' && quoteData && (
          <QuotePDFPreview 
            quoteData={quoteData} 
            onBack={handleBackToBuilder}
          />
        )}
      </main>
    </div>
  )
}

export default App
