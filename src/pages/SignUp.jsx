import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import CustomSignUpForm from '../components/CustomSignUpForm'

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
        
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Create Your Firefly Account</h1>
            <p className="text-gray-300">To save your customizations and calculate delivery costs</p>
          </div>
          
          <div className="bg-white shadow-lg rounded-lg p-6">
            <CustomSignUpForm redirectUrl={redirectUrl} />
          </div>
          
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
