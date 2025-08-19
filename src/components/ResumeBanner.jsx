import { useState, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from './ToastProvider'

export default function ResumeBanner() {
  const { isSignedIn } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { addToast } = useToast()
  const [incompleteBuild, setIncompleteBuild] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return
    
    // Don't show on builds or checkout pages
    if (location.pathname.includes('/builds') || location.pathname.includes('/checkout')) {
      return
    }

    const checkIncompleteBuilds = async () => {
      try {
        const token = await getToken()
        const res = await fetch('/api/builds', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (res.ok) {
          const builds = await res.json()
          const incomplete = builds.find(b => 
            b.status === 'DRAFT' || b.status === 'CHECKOUT_IN_PROGRESS'
          )
          if (incomplete) {
            setIncompleteBuild(incomplete)
          }
        }
      } catch (error) {
        console.error('Failed to check incomplete builds:', error)
      }
    }

    checkIncompleteBuilds()
  }, [isSignedIn, location.pathname, getToken])

  const handleDismiss = () => {
    setDismissed(true)
    // Persist dismissal for this build
    if (incompleteBuild) {
      try {
        localStorage.setItem(`ff_banner_dismissed_${incompleteBuild._id}`, 'true')
      } catch {}
    }
  }

  const handleResume = () => {
    if (!incompleteBuild) return
    
    // Navigate to the appropriate step
    if (incompleteBuild.step === 1) {
      navigate(`/builds/${incompleteBuild._id}`)
    } else {
      navigate(`/checkout/${incompleteBuild._id}/payment`)
    }
    
    addToast({ type: 'success', message: 'Resuming your build...' })
  }

  // Check if this specific build was dismissed
  useEffect(() => {
    if (incompleteBuild) {
      const wasDismissed = localStorage.getItem(`ff_banner_dismissed_${incompleteBuild._id}`)
      if (wasDismissed) {
        setDismissed(true)
      }
    }
  }, [incompleteBuild])

  if (!isSignedIn || !incompleteBuild || dismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              You have an in‑progress build: <span className="font-semibold">{incompleteBuild.modelName || incompleteBuild.modelSlug}</span> (Step {incompleteBuild.step}/5)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResume}
            className="px-3 py-1 bg-black text-yellow-500 text-sm font-medium rounded hover:bg-gray-800 transition-colors"
          >
            Resume →
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-black/70 hover:text-black transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}


