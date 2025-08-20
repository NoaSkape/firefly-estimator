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
      <ClerkProvider publishableKey={clerkPubKey}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ClerkProvider>
    </HelmetProvider>
  </StrictMode>,
)
