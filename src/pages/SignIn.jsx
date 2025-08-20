import React from 'react'
import { SignIn, UserButton } from '@clerk/clerk-react'
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
        {/* Clerk UserButton in top right */}
        <div className="absolute top-4 right-4 z-50 bg-white rounded-full p-1 shadow-lg">
          <UserButton 
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-8 h-8',
                userButtonTrigger: 'focus:shadow-none hover:opacity-80'
              }
            }}
          />
        </div>
        
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
                card: 'bg-white shadow-lg rounded-lg p-6',
                headerTitle: 'text-xl font-semibold text-gray-900',
                headerSubtitle: 'text-gray-600',
                socialButtonsBlockButton: 'btn-secondary w-full',
                formFieldInput: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent',
                formFieldLabel: 'block text-sm font-medium text-gray-700 mb-1',
                footerActionLink: 'text-yellow-600 hover:text-yellow-500',
                dividerLine: 'bg-gray-300',
                dividerText: 'text-gray-500 bg-white px-4'
              }
            }}
            signUpUrl="/sign-up"
            redirectUrl={redirectUrl}
            afterSignInUrl={redirectUrl}
            routing="path"
            path="/sign-in"
            forceRedirectUrl={redirectUrl}
            showOptionalFields={true}
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
