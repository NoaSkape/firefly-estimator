import React from 'react'
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
      
      <main className="min-h-screen grid place-items-center px-4 pt-24 md:pt-8 overflow-x-hidden">
        <section className="w-full max-w-md mx-auto">
          <header className="text-center mb-6 transform -translate-x-4">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/app-icon.png" alt="Firefly Tiny Homes" className="w-full h-full object-contain p-1" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
            <p className="text-gray-300">Sign in to your Firefly Tiny Homes account</p>
          </header>

          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full -translate-x-4',
                card: 'bg-white shadow-lg rounded-lg overflow-hidden p-6 w-full max-w-full',
                footer: 'md:w-[calc(100%-1px)] mx-auto',
                formButtonPrimary: 'btn-primary w-full',
                headerTitle: 'text-xl font-semibold text-gray-900 text-center',
                headerSubtitle: 'text-gray-600 text-center',
                socialButtonsBlockButton: 'btn-secondary w-full',
                formFieldInput: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900',
                formFieldLabel: 'block text-sm font-medium text-gray-700 mb-1',
                footerActionLink: 'text-yellow-500 hover:text-yellow-400',
                dividerLine: 'bg-gray-300',
                dividerText: 'text-gray-500 bg-white px-2 text-center'
              }
            }}
            signUpUrl={`/sign-up?redirect=${encodeURIComponent(redirectUrl)}`}
            fallbackRedirectUrl={redirectUrl}
            showOptionalFields
            onError={(error) => {
              handleAuthError(error)
            }}
          />

          <p className="mt-6 text-center text-sm text-gray-300 transform md:-translate-x-4">
            Don't have an account?{' '}
            <a href={`/sign-up?redirect=${encodeURIComponent(redirectUrl)}`} className="text-yellow-500 hover:text-yellow-400 font-medium">
              Create one here
            </a>
          </p>
        </section>
      </main>
    </>
  )
}
