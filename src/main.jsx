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



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ClerkProvider 
        publishableKey={clerkPubKey}
        appearance={{
          baseTheme: undefined,
          variables: {
            colorPrimary: '#EAB308',
            colorBackground: '#1F2937',
            colorText: '#F9FAFB',
            colorTextSecondary: '#9CA3AF',
            colorInputBackground: '#374151',
            colorInputText: '#F9FAFB',
            colorNeutral: '#6B7280',
            colorSuccess: '#10B981',
            colorWarning: '#F59E0B',
            colorDanger: '#EF4444',
            borderRadius: '0.5rem',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          elements: {
            formButtonPrimary: {
              backgroundColor: '#EAB308',
              color: '#000000',
              '&:hover': {
                backgroundColor: '#CA8A04',
              },
            },
            card: {
              backgroundColor: '#374151',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            headerTitle: {
              color: '#F9FAFB',
            },
            headerSubtitle: {
              color: '#9CA3AF',
            },
            formFieldInput: {
              backgroundColor: '#4B5563',
              borderColor: '#6B7280',
              color: '#F9FAFB',
              '&:focus': {
                borderColor: '#EAB308',
                boxShadow: '0 0 0 2px rgba(234, 179, 8, 0.2)',
              },
            },
            formFieldLabel: {
              color: '#D1D5DB',
            },
            footerActionLink: {
              color: '#EAB308',
              '&:hover': {
                color: '#CA8A04',
              },
            },
          },
        }}
      >
        <ToastProvider>
          <App />
        </ToastProvider>
      </ClerkProvider>
    </HelmetProvider>
  </StrictMode>,
)
