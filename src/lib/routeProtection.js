// Route protection utilities for different user access levels

// Public routes - no authentication required
export const PUBLIC_ROUTES = [
  '/',
  '/models',
  '/models/',
  '/faq',
  '/about',
  '/contact',
  '/financing',
  '/how',
  '/how/',
  '/public/',
  '/customize/'
]

// Protected routes - require authentication
export const PROTECTED_ROUTES = [
  '/builds',
  '/builds/',
  '/checkout/',
  '/portal',
  '/portal/'
]

// Admin routes - require admin status
export const ADMIN_ROUTES = [
  '/admin',
  '/admin/'
]

// Check if a route is public
export const isPublicRoute = (pathname) => {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

// Check if a route requires authentication
export const isProtectedRoute = (pathname) => {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

// Check if a route requires admin access
export const isAdminRoute = (pathname) => {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

// Get the appropriate redirect URL for authentication
export const getAuthRedirectUrl = (pathname) => {
  // For public routes, redirect to home
  if (isPublicRoute(pathname)) {
    return '/'
  }
  
  // For protected routes, redirect back to the intended page
  return pathname
}

// Check if user has access to a route
export const hasRouteAccess = (pathname, isSignedIn, isAdmin) => {
  // Public routes are always accessible
  if (isPublicRoute(pathname)) {
    return true
  }
  
  // Protected routes require authentication
  if (isProtectedRoute(pathname)) {
    return isSignedIn
  }
  
  // Admin routes require admin status
  if (isAdminRoute(pathname)) {
    return isSignedIn && isAdmin
  }
  
  // Default to public access
  return true
}
