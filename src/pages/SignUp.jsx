import React, { useState } from 'react'
import { SignUp } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuthErrorHandler } from '../components/AuthErrorHandler'

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'
  const { handleAuthError } = useAuthErrorHandler()

  return (
    <>
      <Helmet>
        <title>Create Account - Firefly Tiny Homes</title>
        <meta name="description" content="Create your account to save your custom home designs and continue your journey with Firefly Tiny Homes." />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
              <img 
                src="/app-icon.png" 
                alt="Firefly Tiny Homes" 
                className="w-full h-full object-contain p-1"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Create Your Firefly Account</h1>
            <p className="text-gray-300">To save your customizations and calculate delivery costs</p>
          </div>
          
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: 'btn-primary w-full',
                card: 'bg-white shadow-lg rounded-lg p-6 w-full',
                headerTitle: 'text-xl font-semibold text-gray-900',
                headerSubtitle: 'text-gray-600',
                socialButtonsBlockButton: 'btn-secondary w-full',
                formFieldInput: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900',
                formFieldLabel: 'block text-sm font-medium text-gray-700 mb-1',
                footerActionLink: 'text-yellow-600 hover:text-yellow-500',
                dividerLine: 'bg-gray-300',
                dividerText: 'text-gray-500 bg-white px-4'
              }
            }}
            signInUrl="/sign-in"
            fallbackRedirectUrl={redirectUrl}
            routing="hash"
            showOptionalFields={true}
            initialValues={{
              emailAddress: '',
              password: '',
              firstName: '',
              lastName: ''
            }}
            onError={(error) => {
              handleAuthError(error)
            }}
          />
          
          <div className="text-center">
            <p className="text-sm text-gray-300">
              Already have an account?{' '}
              <a href={`/sign-in?redirect=${encodeURIComponent(redirectUrl)}`} className="text-yellow-400 hover:text-yellow-300 font-medium">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
