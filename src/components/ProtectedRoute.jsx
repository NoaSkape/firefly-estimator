import React from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { isProtectedRoute, isAdminRoute, getAuthRedirectUrl } from '../lib/routeProtection'

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isSignedIn, user, isLoaded } = useUser()
  const { getToken, isLoaded: authLoaded } = useAuth()
  const location = useLocation()
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    const checkAdminStatus = async () => {
      // Baseline: client-side role check
      const baseline = user ? canEditModelsClient(user) : false
      if (!isSignedIn || !user) {
        if (!cancelled) setIsAdmin(false)
        return
      }

      // If Clerk hooks not loaded, set baseline
      if (!authLoaded) {
        if (!cancelled) setIsAdmin(baseline)
        return
      }

      try {
        const token = await getToken()
        if (!token) {
          if (!cancelled) setIsAdmin(baseline)
          return
        }
        const resp = await fetch('/api/admin/is-admin', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (resp.ok) {
          const data = await resp.json()
          if (!cancelled) setIsAdmin(!!data?.isAdmin)
        } else {
          if (!cancelled) setIsAdmin(baseline)
        }
      } catch {
        if (!cancelled) setIsAdmin(baseline)
      }
    }
    checkAdminStatus()
    return () => { cancelled = true }
  }, [user, isSignedIn, authLoaded, getToken])

  // Wait for Clerk to finish loading before making authentication decisions
  if (!isLoaded || !authLoaded) {
    console.log('[ProtectedRoute] Clerk still loading, showing loading state')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto mb-3"></div>
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // If route requires authentication and user is not signed in
  if (isProtectedRoute(location.pathname) && !isSignedIn) {
    console.log('[ProtectedRoute] Redirecting to sign-in:', { pathname: location.pathname, isSignedIn, isLoaded })
    const redirectUrl = getAuthRedirectUrl(location.pathname)
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(redirectUrl)}`} replace />
  }

  // If route requires admin access and user is not admin
  if (requireAdmin && (!isSignedIn || !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-8">
          <h1 className="text-2xl font-bold text-yellow-500 mb-4">Access Denied</h1>
          <p className="text-white mb-4">
            {!isSignedIn 
              ? 'Please sign in to access this page.' 
              : 'You do not have permission to access this page.'
            }
          </p>
          <button 
            onClick={() => window.history.back()}
            className="bg-yellow-500 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // If route requires admin access and user is admin, or no admin requirement
  return children
}

export default ProtectedRoute
