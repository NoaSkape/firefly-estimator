import React, { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'
import analytics from '../utils/analytics'

export default function NetworkErrorHandler({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState(null)
  const { addToast } = useToast()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (retryCount > 0) {
        addToast({
          type: 'success',
          title: 'Connection Restored',
          message: 'You\'re back online. Your changes will be synced automatically.'
        })
        setRetryCount(0)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      addToast({
        type: 'warning',
        title: 'Connection Lost',
        message: 'You\'re offline. Changes will be saved locally and synced when you reconnect.'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [retryCount, addToast])

  // Global error handler for fetch requests
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        
        // Skip error handling for Clerk API calls - let Clerk handle its own errors
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
        if (url.includes('clerk.fireflyestimator.com') || url.includes('clerk.com')) {
          return response
        }
        
        // Handle specific error status codes for non-Clerk requests
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
          error.status = response.status
          error.response = response
          
          handleNetworkError(error, args[0])
          throw error
        }
        
        return response
      } catch (error) {
        // Skip error handling for Clerk API calls
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
        if (url.includes('clerk.fireflyestimator.com') || url.includes('clerk.com')) {
          throw error
        }
        
        // Handle network errors for non-Clerk requests
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          const networkError = new Error('Network connection failed')
          networkError.isNetworkError = true
          handleNetworkError(networkError, args[0])
          throw networkError
        }
        
        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const handleNetworkError = (error, requestInfo) => {
    const url = typeof requestInfo === 'string' ? requestInfo : requestInfo?.url || 'unknown'
    
    setLastError({
      error,
      url,
      timestamp: new Date().toISOString()
    })
    
    setRetryCount(prev => prev + 1)

    // Track error for analytics
    analytics.trackError('network_error', error.message, null, {
      url,
      status: error.status,
      isNetworkError: error.isNetworkError,
      retryCount: retryCount + 1
    })

    // Show appropriate error message
    if (error.isNetworkError) {
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.'
      })
    } else if (error.status === 401) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'Please sign in to continue.'
      })
    } else if (error.status === 403) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action.'
      })
    } else if (error.status === 404) {
      addToast({
        type: 'error',
        title: 'Not Found',
        message: 'The requested resource was not found.'
      })
    } else if (error.status >= 500) {
      addToast({
        type: 'error',
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.'
      })
    } else {
      addToast({
        type: 'error',
        title: 'Request Failed',
        message: 'Unable to complete your request. Please try again.'
      })
    }
  }

  // Retry mechanism for failed requests
  const retryRequest = async (requestFn, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        
        addToast({
          type: 'info',
          title: 'Retrying...',
          message: `Attempt ${attempt + 1} of ${maxRetries}`
        })
      }
    }
  }

  // Expose retry function globally
  useEffect(() => {
    window.retryRequest = retryRequest
    return () => {
      delete window.retryRequest
    }
  }, [])

  // Show network status indicator
  if (!isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="max-w-md mx-auto text-center p-8 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-yellow-500 text-6xl mb-4">📡</div>
          <h1 className="text-2xl font-bold text-gray-100 mb-4">You're Offline</h1>
          <p className="text-gray-400 mb-6">
            Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return children
}

// Hook for handling network errors in components
export function useNetworkError() {
  const [error, setError] = useState(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleError = (error, context = '') => {
    setError({ error, context, timestamp: new Date().toISOString() })
    
    analytics.trackError('component_network_error', error.message, null, {
      context,
      status: error.status,
      stack: error.stack
    })
  }

  const retry = async (requestFn, maxRetries = 3) => {
    setIsRetrying(true)
    setError(null)
    
    try {
      const result = await window.retryRequest(requestFn, maxRetries)
      setIsRetrying(false)
      return result
    } catch (error) {
      setIsRetrying(false)
      handleError(error, 'retry_failed')
      throw error
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    error,
    isRetrying,
    handleError,
    retry,
    clearError
  }
}
