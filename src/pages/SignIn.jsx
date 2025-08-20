import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import AuthButton from '../components/AuthButton'
import CustomSignInForm from '../components/CustomSignInForm'

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
        {/* Auth Button in top right */}
        <div className="absolute top-4 right-4 z-50">
          <AuthButton />
        </div>
        
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300">Sign in to your Firefly Tiny Homes account</p>
          </div>
          
          <div className="bg-white shadow-lg rounded-lg p-6">
            <CustomSignInForm redirectUrl={redirectUrl} />
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
