import React, { useEffect } from 'react'
import { useToast } from './ToastProvider'

// Professional error handling that actually works with Clerk
export function useAuthErrorHandler() {
  const { addToast } = useToast()

  const handleAuthError = (error) => {
    console.log('Auth error received:', error)
    
    // Extract error details
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorCode = error?.code || error?.status || error?.statusCode || ''
    
    // Handle specific error patterns
    if (errorMessage.includes('identifier_not_found') || errorMessage.includes('user not found') || errorMessage.includes('not found')) {
      addToast({
        type: 'error',
        title: 'Account Not Found',
        message: 'No account found with this email address. Please check your email or create a new account.',
        duration: 6000
      })
      return
    }
    
    if (errorMessage.includes('password_incorrect') || errorMessage.includes('password incorrect') || errorMessage.includes('invalid password')) {
      addToast({
        type: 'error',
        title: 'Incorrect Password',
        message: 'The password you entered is incorrect. Please try again or use "Forgot Password" to reset it.',
        duration: 6000
      })
      return
    }
    
    if (errorMessage.includes('identifier_exists') || errorMessage.includes('already exists')) {
      addToast({
        type: 'error',
        title: 'Account Already Exists',
        message: 'An account with this email already exists. Please sign in instead or use a different email address.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('password_validation_failed') || errorMessage.includes('password requirements')) {
      addToast({
        type: 'error',
        title: 'Password Too Weak',
        message: 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('identifier_invalid') || errorMessage.includes('invalid email')) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address (e.g., user@example.com).',
        duration: 5000
      })
      return
    }
    
    // Handle HTTP status codes
    if (errorCode === 422 || errorCode === '422') {
      if (errorMessage.includes('password') || errorMessage.includes('credentials')) {
        addToast({
          type: 'error',
          title: 'Incorrect Password',
          message: 'The password you entered is incorrect. Please try again or use "Forgot Password" to reset it.',
          duration: 6000
        })
      } else if (errorMessage.includes('email') || errorMessage.includes('identifier')) {
        addToast({
          type: 'error',
          title: 'Account Not Found',
          message: 'No account found with this email address. Please check your email or create a new account.',
          duration: 6000
        })
      } else {
        addToast({
          type: 'error',
          title: 'Invalid Information',
          message: 'Please check your information and try again.',
          duration: 6000
        })
      }
      return
    }
    
    if (errorCode === 429 || errorCode === '429' || errorMessage.includes('429')) {
      addToast({
        type: 'error',
        title: 'Too Many Requests',
        message: 'Too many failed attempts. Please wait a few minutes before trying again.',
        duration: 8000
      })
      return
    }
    
    // Handle network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Unable to connect to our servers. Please check your internet connection and try again.',
        duration: 6000
      })
      return
    }
    
    // Default error message
    addToast({
      type: 'error',
      title: 'Authentication Error',
      message: 'Unable to complete your request. Please try again or contact support if the problem persists.',
      duration: 6000
    })
  }

  return { handleAuthError }
}

// Global error interceptor that actually works
export function useGlobalAuthErrorInterceptor() {
  const { handleAuthError } = useAuthErrorHandler()

  useEffect(() => {
    // Intercept unhandled promise rejections (this is where Clerk errors often end up)
    const handleUnhandledRejection = (event) => {
      const error = event.reason
      if (!error) return
      
      const errorString = error.toString()
      
      // Check if this is a Clerk-related error
      if (errorString.includes('clerk') || errorString.includes('Clerk') || 
          errorString.includes('422') || errorString.includes('429') ||
          errorString.includes('Request Failed') || errorString.includes('Network error')) {
        
        console.log('Intercepted Clerk error:', errorString)
        
        // Prevent the default browser error handling
        event.preventDefault()
        
        // Handle the error
        handleAuthError(error)
      }
    }

    // Intercept console errors that might be from Clerk
    const originalError = console.error
    console.error = (...args) => {
      originalError.apply(console, args)
      
      const errorString = args.join(' ')
      
      // Check if this is a Clerk-related error
      if (errorString.includes('clerk') || errorString.includes('Clerk') || 
          errorString.includes('422') || errorString.includes('429') ||
          errorString.includes('Request Failed') || errorString.includes('Network error')) {
        
        // Don't process our own error messages
        if (errorString.includes('Auth error received:')) return
        
        console.log('Intercepted console error:', errorString)
        handleAuthError(new Error(errorString))
      }
    }

    // Intercept fetch errors specifically for Clerk API calls
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        
        // Check if this is a Clerk API call that failed
        const url = args[0]
        if (typeof url === 'string' && url.includes('clerk.fireflyestimator.com') && !response.ok) {
          console.log('Clerk API error detected:', response.status, response.statusText)
          
          // For 422 and 429 errors, handle them specifically
          if (response.status === 422 || response.status === 429) {
            try {
              const errorData = await response.clone().json()
              console.log('Clerk error data:', errorData)
              
              // Create a more specific error based on the response
              let specificError = new Error('Authentication failed')
              
              if (errorData && errorData.errors && errorData.errors.length > 0) {
                const firstError = errorData.errors[0]
                if (firstError.message) {
                  specificError = new Error(firstError.message)
                }
              }
              
              handleAuthError(specificError)
            } catch (parseError) {
              handleAuthError(new Error('Authentication failed'))
            }
          }
        }
        
        return response
      } catch (error) {
        // Handle network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          handleAuthError(new Error('Network error - please check your connection'))
        }
        throw error
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      console.error = originalError
      window.fetch = originalFetch
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [handleAuthError])
}

// Component for displaying error messages inline
export function AuthErrorDisplay({ error, className = '' }) {
  if (!error) return null

  const getErrorMessage = (error) => {
    const message = error?.message || error?.toString() || 'Unknown error'
    
    if (message.includes('identifier_not_found') || message.includes('user not found')) {
      return 'No account found with this email address.'
    }
    
    if (message.includes('password_incorrect') || message.includes('password incorrect')) {
      return 'Incorrect password. Please try again.'
    }
    
    if (message.includes('identifier_exists') || message.includes('already exists')) {
      return 'An account with this email already exists.'
    }
    
    if (message.includes('password_validation_failed')) {
      return 'Password must meet security requirements.'
    }
    
    if (message.includes('identifier_invalid')) {
      return 'Please enter a valid email address.'
    }
    
    return 'Please check your information and try again.'
  }

  return (
    <div className={`text-red-600 text-sm mt-2 p-3 bg-red-50 border border-red-200 rounded-md ${className}`}>
      <div className="flex items-start">
        <svg className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>{getErrorMessage(error)}</span>
      </div>
    </div>
  )
}
