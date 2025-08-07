import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

const ProtectedApp = () => {
  return (
    <>
      <SignedIn>
        <App />
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Firefly Estimator</h1>
              <p className="text-gray-600">Please sign in to continue</p>
            </div>
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'btn-primary',
                  card: 'bg-white shadow-lg rounded-lg p-6',
                  headerTitle: 'text-xl font-semibold text-gray-900',
                  headerSubtitle: 'text-gray-600',
                  socialButtonsBlockButton: 'btn-secondary',
                  formFieldInput: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                  formFieldLabel: 'block text-sm font-medium text-gray-700 mb-1',
                  footerActionLink: 'text-primary-600 hover:text-primary-500',
                  dividerLine: 'bg-gray-300',
                  dividerText: 'text-gray-500 bg-white px-4'
                }
              }}
              signUpUrl={null}
              redirectUrl="/"
            />
          </div>
        </div>
      </SignedOut>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ProtectedApp />
    </ClerkProvider>
  </StrictMode>,
)
