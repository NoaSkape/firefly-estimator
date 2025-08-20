import React from 'react'
import { SignIn } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function SignInPage() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'

  return (
    <>
      <Helmet>
        <title>Sign In - Firefly Tiny Homes</title>
        <meta name="description" content="Sign in to your Firefly Tiny Homes account to access your saved customizations and continue your home building journey." />
      </Helmet>
      
             <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300">Sign in to your Firefly Tiny Homes account</p>
          </div>
          
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: 'btn-primary w-full',
                card: 'bg-transparent shadow-none p-0',
                headerTitle: 'text-lg font-semibold text-gray-100',
                headerSubtitle: 'text-gray-400',
                formFieldInput: 'w-full px-3 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent',
                formFieldLabel: 'block text-sm font-medium text-gray-300 mb-1',
                footerActionLink: 'text-yellow-400 hover:text-yellow-300'
              }
            }}
            signUpUrl="/sign-up"
            redirectUrl={redirectUrl}
            routing="hash"
            showOptionalFields={true}
            initialValues={{
              emailAddress: '',
              password: ''
            }}
          />
          
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
