import React from 'react'
import analytics from '../utils/analytics'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId
    })
    
    // Log error to analytics with more context
    analytics.trackError('react_error_boundary', error.message, null, {
      errorId,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error Boundary Caught Error:', error)
      console.error('Error Info:', errorInfo)
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const { error, errorId, retryCount } = this.state
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
          <div className="max-w-lg mx-auto text-center p-8 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-100 mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>
            
            {/* Error details for debugging */}
            {import.meta.env.DEV && error && (
              <details className="mb-6 text-left">
                <summary className="text-yellow-400 cursor-pointer mb-2">Error Details (Development)</summary>
                <div className="bg-gray-900 p-4 rounded text-xs text-gray-300 overflow-auto max-h-40">
                  <div className="mb-2">
                    <strong>Error ID:</strong> {errorId}
                  </div>
                  <div className="mb-2">
                    <strong>Message:</strong> {error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                  </div>
                </div>
              </details>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                disabled={retryCount >= 3}
                className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
              </button>
              
              <button
                onClick={this.handleRefresh}
                className="bg-gray-600 text-gray-100 px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
              >
                Refresh Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="bg-gray-700 text-gray-100 px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Go Home
              </button>
            </div>
            
            {errorId && (
              <p className="text-xs text-gray-500 mt-4">
                Error ID: {errorId}
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 