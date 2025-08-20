import React, { useEffect } from 'react'
import { useToast } from './ToastProvider'

export function useAuthErrorHandler() {
  const { addToast } = useToast()

  const handleAuthError = (error) => {
    console.error('Auth error:', error)
    
    // Extract error details from various possible formats
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorCode = error?.code || error?.status || error?.statusCode || ''
    const errorType = error?.type || ''
    
    // Log the full error for debugging
    console.log('Full error object:', error)
    console.log('Error message:', errorMessage)
    console.log('Error code:', errorCode)
    
    // Handle specific error types
    if (errorMessage.includes('email already exists') || errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
      addToast({
        type: 'error',
        title: 'Account Already Exists',
        message: 'An account with this email already exists. Please sign in instead or use a different email address.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('password') && (errorMessage.includes('weak') || errorMessage.includes('requirements') || errorMessage.includes('minimum'))) {
      addToast({
        type: 'error',
        title: 'Password Too Weak',
        message: 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('email') && (errorMessage.includes('invalid') || errorMessage.includes('format') || errorMessage.includes('valid'))) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address (e.g., user@example.com).',
        duration: 5000
      })
      return
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('doesn\'t exist') || errorMessage.includes('no user')) {
      addToast({
        type: 'error',
        title: 'Account Not Found',
        message: 'No account found with this email address. Please check your email or create a new account.',
        duration: 6000
      })
      return
    }
    
    if (errorMessage.includes('incorrect password') || errorMessage.includes('wrong password') || errorMessage.includes('invalid credentials') || errorMessage.includes('password is incorrect')) {
      addToast({
        type: 'error',
        title: 'Incorrect Password',
        message: 'The password you entered is incorrect. Please try again or use "Forgot Password" to reset it.',
        duration: 6000
      })
      return
    }
    
    if (errorMessage.includes('not verified') || errorMessage.includes('verification') || errorMessage.includes('email verification')) {
      addToast({
        type: 'warning',
        title: 'Email Not Verified',
        message: 'Please check your email and click the verification link before signing in.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('disabled') || errorMessage.includes('suspended') || errorMessage.includes('account disabled')) {
      addToast({
        type: 'error',
        title: 'Account Disabled',
        message: 'This account has been disabled. Please contact support for assistance.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many attempts') || errorMessage.includes('rate limited')) {
      addToast({
        type: 'error',
        title: 'Too Many Attempts',
        message: 'Too many failed attempts. Please wait a few minutes before trying again.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Unable to connect to our servers. Please check your internet connection and try again.',
        duration: 6000
      })
      return
    }
    
    if (errorMessage.includes('required') || errorMessage.includes('missing') || errorMessage.includes('empty')) {
      addToast({
        type: 'error',
        title: 'Missing Information',
        message: 'Please fill in all required fields before continuing.',
        duration: 5000
      })
      return
    }
    
    if (errorMessage.includes('social') || errorMessage.includes('Google') || errorMessage.includes('Microsoft') || errorMessage.includes('OAuth')) {
      addToast({
        type: 'error',
        title: 'Social Login Error',
        message: 'There was an issue with social login. Please try again or use email/password instead.',
        duration: 6000
      })
      return
    }
    
    // Handle HTTP status codes
    if (errorCode === 422 || errorCode === '422') {
      addToast({
        type: 'error',
        title: 'Invalid Information',
        message: 'Please check your information and try again. Make sure all fields are filled correctly.',
        duration: 6000
      })
      return
    }
    
    if (errorCode === 429 || errorCode === '429') {
      addToast({
        type: 'error',
        title: 'Too Many Requests',
        message: 'You\'ve made too many requests. Please wait a moment before trying again.',
        duration: 8000
      })
      return
    }
    
    if (errorCode === 500 || errorCode === 502 || errorCode === 503 || errorCode === '500' || errorCode === '502' || errorCode === '503') {
      addToast({
        type: 'error',
        title: 'Server Error',
        message: 'We\'re experiencing technical difficulties. Please try again in a few minutes.',
        duration: 6000
      })
      return
    }
    
    // Handle generic Clerk errors
    if (errorMessage.includes('Request Failed') || errorMessage.includes('Unable to complete')) {
      addToast({
        type: 'error',
        title: 'Authentication Error',
        message: 'Unable to complete your request. Please check your information and try again.',
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

// Global error interceptor for Clerk errors
export function useGlobalAuthErrorInterceptor() {
  const { handleAuthError } = useAuthErrorHandler()

  useEffect(() => {
    // Intercept console errors that might be from Clerk
    const originalError = console.error
    console.error = (...args) => {
      originalError.apply(console, args)
      
      // Check if this is a Clerk-related error
      const errorString = args.join(' ')
      if (errorString.includes('clerk') || errorString.includes('Clerk') || errorString.includes('422') || errorString.includes('Request Failed')) {
        console.log('Intercepted Clerk error:', errorString)
        handleAuthError(new Error(errorString))
      }
    }

    // Intercept unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      console.log('Unhandled promise rejection:', event.reason)
      if (event.reason && (event.reason.toString().includes('clerk') || event.reason.toString().includes('422'))) {
        handleAuthError(event.reason)
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
          
          // For 422 errors, we need to determine the specific issue
          if (response.status === 422) {
            try {
              const errorData = await response.clone().json()
              console.log('Clerk 422 error data:', errorData)
              
              // Create a more specific error based on the response
              let specificError = new Error('Invalid information provided')
              
              if (errorData && errorData.errors && errorData.errors.length > 0) {
                const firstError = errorData.errors[0]
                if (firstError.message) {
                  specificError = new Error(firstError.message)
                }
              }
              
              handleAuthError(specificError)
            } catch (parseError) {
              handleAuthError(new Error('Invalid information provided'))
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
    
    if (message.includes('email already exists')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    
    if (message.includes('password') && message.includes('weak')) {
      return 'Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.'
    }
    
    if (message.includes('email') && message.includes('invalid')) {
      return 'Please enter a valid email address.'
    }
    
    if (message.includes('not found')) {
      return 'No account found with this email address.'
    }
    
    if (message.includes('incorrect password')) {
      return 'Incorrect password. Please try again.'
    }
    
    if (message.includes('not verified')) {
      return 'Please verify your email address before signing in.'
    }
    
    if (message.includes('required')) {
      return 'Please fill in all required fields.'
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
