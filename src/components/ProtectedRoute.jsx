import React from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { isProtectedRoute, isAdminRoute, getAuthRedirectUrl } from '../lib/routeProtection'

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isSignedIn, user, isLoaded } = useUser()
  const location = useLocation()
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    const checkAdminStatus = () => {
      if (user) {
        const adminStatus = canEditModelsClient(user)
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
    }
    checkAdminStatus()
  }, [user])

  // Wait for Clerk to finish loading before making authentication decisions
  if (!isLoaded) {
    console.log('[ProtectedRoute] Clerk still loading, showing loading state')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            {!isSignedIn 
              ? 'Please sign in to access this page.' 
              : 'You do not have permission to access this page.'
            }
          </p>
          <button 
            onClick={() => window.history.back()}
            className="btn-primary px-6 py-2"
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
