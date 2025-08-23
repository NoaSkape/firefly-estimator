import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth, SignUp, SignIn } from '@clerk/clerk-react'
import CheckoutProgress from '../../components/CheckoutProgress'
import RenameModal from '../../components/RenameModal'
import { useToast } from '../../components/ToastProvider'
import { calculateTotalPurchasePrice } from '../../utils/calculateTotal'

// Function to get the correct route based on build step
const getBuildStepRoute = (build) => {
  const step = build.step || 1
  
  // Map step numbers to routes
  switch (step) {
    case 1: // Choose Your Home
      return `/models`
    case 2: // Customize!
      return `/customize/${build.modelSlug}`
    case 3: // Sign In
      return `/sign-in?redirect=${encodeURIComponent(`/checkout/${build._id}/buyer`)}`
    case 4: // Delivery Address
      return `/checkout/${build._id}/buyer`
    case 5: // Overview
      return `/checkout/${build._id}/review`
    case 6: // Payment Method
      return `/checkout/${build._id}/payment-method`
    case 7: // Contract
      return `/checkout/${build._id}/agreement`
    case 8: // Confirmation
      return `/checkout/${build._id}/confirm`
    default:
      return `/checkout/${build._id}/review` // Default to overview
  }
}

export default function BuildsDashboard() {
  const { isSignedIn, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [builds, setBuilds] = useState([])
  const [settings, setSettings] = useState(null)
  const [renameModal, setRenameModal] = useState({ isOpen: false, build: null })
  const navigate = useNavigate()
  const { addToast } = useToast()

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        
        const settingsRes = await fetch('/api/admin/settings', { headers })
        if (settingsRes.ok) {
          setSettings(await settingsRes.json())
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    
    if (isSignedIn) {
      loadSettings()
    }
  }, [isSignedIn, getToken])

  useEffect(() => {
    console.log('[BuildsDashboard] useEffect triggered:', { isSignedIn, loading })
    
    // If not signed in, stop loading immediately
    if (!isSignedIn) { 
      console.log('[BuildsDashboard] Not signed in, setting loading to false')
      setLoading(false); 
      return 
    }

    // Start fetching builds immediately when signed in
    let isMounted = true;
    (async () => {
      try {
        console.log('[BuildsDashboard] Fetching builds...')
        const token = await getToken()
        const res = await fetch('/api/builds', { 
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          // Add cache control to ensure fresh data
          cache: 'no-cache'
        })
        
        if (!isMounted) return; // Component unmounted
        
        if (res.ok) {
          const buildsData = await res.json()
          console.log('[BuildsDashboard] Builds fetched successfully:', buildsData.length)
          setBuilds(buildsData)
        } else {
          console.error('[BuildsDashboard] Failed to fetch builds:', res.status, res.statusText)
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('[BuildsDashboard] Error fetching builds:', error)
      } finally { 
        if (isMounted) {
          console.log('[BuildsDashboard] Setting loading to false')
          setLoading(false) 
        }
      }
    })()

    return () => {
      isMounted = false;
    }
  }, [isSignedIn])

  // Wait for Clerk to finish loading before making authentication decisions
  if (!isLoaded) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center">
          <h1 className="section-header">My Home</h1>
          <p className="text-lg text-gray-300 mb-6">Create an account to save and customize your home</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="rounded border border-gray-800 bg-gray-900/50 p-4">
              <h2 className="text-lg font-semibold text-gray-100 mb-2">New to Firefly</h2>
              <SignUp 
                fallbackRedirectUrl="/builds" 
                afterSignInUrl="/builds"
                signInUrl="/sign-in?redirect=/builds"
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
                onError={(error) => {
                  console.error('Builds SignUp error:', error)
                  // Use toast for error handling
                  const { addToast } = require('../../components/ToastProvider').useToast()
                  addToast({
                    type: 'error',
                    title: 'Sign Up Error',
                    message: 'Unable to create account. Please try again.',
                    duration: 6000
                  })
                }}
              />
            </div>
            <div className="rounded border border-gray-800 bg-gray-900/50 p-4">
              <h2 className="text-lg font-semibold text-gray-100 mb-2">Already have an account?</h2>
              <SignIn 
                fallbackRedirectUrl="/builds" 
                afterSignUpUrl="/builds"
                signUpUrl="/sign-up?redirect=/builds"
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
                onError={(error) => {
                  console.error('Builds SignIn error:', error)
                  // Use toast for error handling
                  const { addToast } = require('../../components/ToastProvider').useToast()
                  addToast({
                    type: 'error',
                    title: 'Sign In Error',
                    message: 'Unable to sign in. Please check your credentials and try again.',
                    duration: 6000
                  })
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="section-header">My Home</h1>
      {loading ? (
        <div className="space-y-3">
          {/* Loading skeleton */}
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 bg-gray-700 rounded w-16"></div>
                  <div className="h-8 bg-gray-700 rounded w-20"></div>
                  <div className="h-8 bg-gray-700 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : builds.length === 0 ? (
        <div className="card">No builds yet. <button className="btn-primary ml-2" onClick={()=>navigate('/models')}>Start from Explore Models</button></div>
      ) : (
        <div className="space-y-3">
          {builds.map(b => (
            <div key={b._id} className="card flex items-center justify-between">
              <div>
                <div className="font-semibold">{b.modelName || b.modelSlug} {b.primary && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-400 text-black">Primary</span>}</div>
                <div className="text-xs text-gray-400">Step {b.step}/8 · {b.status} · Total ${calculateTotalPurchasePrice(b, settings).toLocaleString()} · Updated {(new Date(b.updatedAt)).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-primary" onClick={()=>navigate(getBuildStepRoute(b))}>Resume</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={()=>navigate(`/checkout/${b._id}/payment`)}>Checkout</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={async()=>{ const token = await getToken(); const r = await fetch(`/api/builds/${b._id}/duplicate`, { method:'POST', headers: token?{Authorization:`Bearer ${token}`}:{}}); const j=await r.json(); if(j?.buildId) navigate(`/builds/${j.buildId}`) }}>Duplicate</button>
                <button className="px-3 py-2 rounded border border-red-800 text-red-300 hover:bg-red-900/30" onClick={async()=>{ 
                  const token = await getToken(); 
                  await fetch(`/api/builds/${b._id}`, { method:'DELETE', headers: token?{Authorization:`Bearer ${token}`}:{}}); 
                  setBuilds(list=>list.filter(x=>x._id!==b._id)); 
                  
                  // Check if we're currently on this build's pages and redirect
                  const currentPath = window.location.pathname;
                  if (currentPath.includes(`/builds/${b._id}`) || currentPath.includes(`/checkout/${b._id}`)) { 
                    addToast({ 
                      type: 'warning', 
                      title: 'Build Deleted',
                      message: 'The build you were viewing has been deleted. Redirected to My Builds.'
                    });
                    navigate('/builds') 
                  } else {
                    addToast({ 
                      type: 'success', 
                      title: 'Build Deleted',
                      message: 'Build has been successfully deleted.'
                    });
                  }
                }}>Delete</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={async()=>{ const token = await getToken(); await fetch(`/api/builds/${b._id}`, { method:'PATCH', headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ primary: true }) }); setBuilds(list=>list.map(x=>({ ...x, primary: x._id===b._id }))) }}>Set Primary</button>
                <button className="px-3 py-2 rounded border border-gray-700 text-white" onClick={() => setRenameModal({ isOpen: true, build: b })}>Rename</button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <RenameModal
        build={renameModal.build}
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, build: null })}
        onRenamed={(updatedBuild) => {
          setBuilds(list => list.map(b => b._id === updatedBuild._id ? updatedBuild : b))
        }}
      />
    </div>
  )
}


