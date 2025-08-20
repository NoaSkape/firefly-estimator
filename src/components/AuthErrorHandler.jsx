import React from 'react'
import { useToast } from './ToastProvider'

// Professional error handling that works WITH Clerk, not against it
export function useAuthErrorHandler() {
  const { addToast } = useToast()

  const handleAuthError = (error) => {
    // Don't log every error - only log for debugging when needed
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth error received:', error)
    }
    
    // Extract error details from Clerk's error format
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorCode = error?.code || error?.status || error?.statusCode || ''
    
    // Handle specific Clerk error patterns
    if (errorMessage.includes('identifier_not_found') || errorMessage.includes('user not found')) {
      addToast({
        type: 'error',
        title: 'Account Not Found',
        message: 'No account found with this email address. Please check your email or create a new account.',
        duration: 6000
      })
      return
    }
    
    if (errorMessage.includes('form_identifier_not_found') || errorMessage.includes('identifier not found')) {
      addToast({
        type: 'error',
        title: 'Account Not Found',
        message: 'No account found with this email address. Please check your email or create a new account.',
        duration: 6000
      })
      return
    }
    
    if (errorMessage.includes('form_password_incorrect') || errorMessage.includes('password incorrect')) {
      addToast({
        type: 'error',
        title: 'Incorrect Password',
        message: 'The password you entered is incorrect. Please try again or use "Forgot Password" to reset it.',
        duration: 6000
      })
      return
    }
    
    if (errorMessage.includes('form_identifier_exists') || errorMessage.includes('already exists')) {
      addToast({
        type: 'error',
        title: 'Account Already Exists',
        message: 'An account with this email already exists. Please sign in instead or use a different email address.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('form_password_pwned') || errorMessage.includes('password compromised')) {
      addToast({
        type: 'error',
        title: 'Password Compromised',
        message: 'This password has been compromised in a data breach. Please choose a different password.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('form_password_validation_failed') || errorMessage.includes('password requirements')) {
      addToast({
        type: 'error',
        title: 'Password Too Weak',
        message: 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('form_identifier_invalid') || errorMessage.includes('invalid email')) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address (e.g., user@example.com).',
        duration: 5000
      })
      return
    }
    
    if (errorMessage.includes('verification_expired') || errorMessage.includes('verification failed')) {
      addToast({
        type: 'warning',
        title: 'Verification Expired',
        message: 'Your verification link has expired. Please request a new one.',
        duration: 8000
      })
      return
    }
    
    if (errorMessage.includes('user_locked') || errorMessage.includes('account locked')) {
      addToast({
        type: 'error',
        title: 'Account Locked',
        message: 'Your account has been locked due to too many failed attempts. Please contact support.',
        duration: 8000
      })
      return
    }
    
    // Handle HTTP status codes from Clerk API
    if (errorCode === 422) {
      // 422 usually means validation error - check the specific error
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
    
    if (errorCode === 429) {
      addToast({
        type: 'error',
        title: 'Too Many Attempts',
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
    
    // Default error message for unhandled cases
    addToast({
      type: 'error',
      title: 'Authentication Error',
      message: 'Unable to complete your request. Please try again or contact support if the problem persists.',
      duration: 6000
    })
  }

  return { handleAuthError }
}

// Component for displaying error messages inline
export function AuthErrorDisplay({ error, className = '' }) {
  if (!error) return null

  const getErrorMessage = (error) => {
    const message = error?.message || error?.toString() || 'Unknown error'
    
    if (message.includes('identifier_not_found') || message.includes('user not found')) {
      return 'No account found with this email address.'
    }
    
    if (message.includes('form_password_incorrect') || message.includes('password incorrect')) {
      return 'Incorrect password. Please try again.'
    }
    
    if (message.includes('form_identifier_exists') || message.includes('already exists')) {
      return 'An account with this email already exists.'
    }
    
    if (message.includes('form_password_validation_failed')) {
      return 'Password must meet security requirements.'
    }
    
    if (message.includes('form_identifier_invalid')) {
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
