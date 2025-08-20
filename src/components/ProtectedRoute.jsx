import React from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { isProtectedRoute, isAdminRoute, getAuthRedirectUrl } from '../lib/routeProtection'

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isSignedIn, user } = useUser()
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

  // If route requires authentication and user is not signed in
  if (isProtectedRoute(location.pathname) && !isSignedIn) {
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
