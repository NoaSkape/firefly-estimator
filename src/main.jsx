import './lib/clerkGuard.ts'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/clerk-react'
import { HelmetProvider } from 'react-helmet-async'
import { ToastProvider } from './components/ToastProvider'

// Read publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!clerkPubKey) {
  console.error('Missing VITE_CLERK_PUBLISHABLE_KEY in env')
}

// Clerk appearance configuration
const clerkAppearance = {
  elements: {
    logoImage: '/app-icon.png',
    logoBox: 'w-12 h-12',
    logoImageBox: 'w-12 h-12',
    logoImageContainer: 'w-12 h-12',
    logoImageElement: 'w-12 h-12 object-contain'
  },
  variables: {
    colorPrimary: '#F59E0B', // Yellow color to match Firefly branding
    colorText: '#111827',
    colorTextSecondary: '#6B7280',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#F9FAFB',
    colorInputText: '#111827',
    borderRadius: '0.5rem'
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ClerkProvider 
        publishableKey={clerkPubKey}
        appearance={clerkAppearance}
      >
        <ToastProvider>
          <App />
        </ToastProvider>
      </ClerkProvider>
    </HelmetProvider>
  </StrictMode>,
)
