import React, { useState } from 'react'
import { SignIn } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuthErrorHandler } from '../components/AuthErrorHandler'

export default function SignInPage() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'
  const { handleAuthError } = useAuthErrorHandler()

  return (
    <>
      <Helmet>
        <title>Sign In - Firefly Tiny Homes</title>
        <meta name="description" content="Sign in to your Firefly Tiny Homes account to access your saved customizations and continue your home building journey." />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center p-4 pt-20 md:pt-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 relative">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <img 
                src="/app-icon.png" 
                alt="Firefly Tiny Homes" 
                className="w-full h-full object-contain p-1"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Welcome Back</h1>
            <p className="text-gray-300">Sign in to your Firefly Tiny Homes account</p>
          </div>
          
          <div className="w-full mb-8">
            <SignIn
              appearance={{
                elements: {
                  formButtonPrimary: 'btn-primary w-full',
                  card: 'bg-white shadow-lg rounded-lg p-6 w-full max-w-full overflow-hidden',
                  headerTitle: 'text-xl font-semibold text-gray-900 text-center',
                  headerSubtitle: 'text-gray-600 text-center',
                  socialButtonsBlockButton: 'btn-secondary w-full',
                  formFieldInput: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900',
                  formFieldLabel: 'block text-sm font-medium text-gray-700 mb-1',
                  footerActionLink: 'text-yellow-600 hover:text-yellow-500',
                  dividerLine: 'bg-gray-300',
                  dividerText: 'text-gray-500 bg-white px-2 text-center'
                }
              }}
              signUpUrl="/sign-up"
              fallbackRedirectUrl={redirectUrl}
              routing="hash"
              showOptionalFields={true}
              initialValues={{
                emailAddress: '',
                password: ''
              }}
              onError={(error) => {
                handleAuthError(error)
              }}
            />
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-300">
              Don't have an account?{' '}
              <a href={`/sign-up?redirect=${encodeURIComponent(redirectUrl)}`} className="text-yellow-400 hover:text-yellow-300 font-medium">
                Create one here
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
