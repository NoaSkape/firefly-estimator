import React from 'react'
import { SignUp } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'

  return (
    <>
      <Helmet>
        <title>Create Account - Firefly Tiny Homes</title>
        <meta name="description" content="Create your account to save your custom home designs and continue your journey with Firefly Tiny Homes." />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        {/* Background with fireflies effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="absolute inset-0 opacity-20">
            {/* Fireflies effect */}
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse delay-500"></div>
            <div className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-1500"></div>
            <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse delay-2000"></div>
          </div>
        </div>
        
        <div className="max-w-md w-full space-y-6 relative z-10">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Create Your Account</h1>
            <p className="text-gray-300">Join Firefly Tiny Homes to save your customizations</p>
          </div>
          
          <SignUp
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
            signInUrl="/sign-in"
            redirectUrl={redirectUrl}
            afterSignUpUrl={redirectUrl}
            routing="path"
            path="/sign-up"
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
