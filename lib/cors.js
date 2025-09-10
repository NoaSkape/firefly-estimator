// lib/cors.js
// Small helper to apply consistent CORS behavior across API routes

export function applyCors(req, res, methods = 'GET, POST, PATCH, DELETE, OPTIONS') {
  const debug = process.env.DEBUG_ADMIN === 'true'
  
  // Default allowed origins if not configured
  const defaultOrigins = [
    'https://fireflyestimator.com',
    'https://www.fireflyestimator.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
  
  const csv = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  
  // Use default origins if none configured
  const allowedOrigins = csv.length > 0 ? csv : defaultOrigins

  const reqOrigin = req.headers?.origin || req.headers?.Origin || ''
  
  // Handle same-origin requests (no Origin header) and allowed origins
  const isAllowed = reqOrigin === '' || allowedOrigins.includes(reqOrigin)
  
  // In development, always allow localhost
  const isDev = process.env.NODE_ENV === 'development'
  const isLocalhost = reqOrigin.startsWith('http://localhost:')
  
  // Determine the origin to allow
  let originToAllow
  if (isAllowed) {
    // Use the actual origin if it's allowed, or first allowed origin for same-origin requests
    originToAllow = reqOrigin || allowedOrigins[0]
  } else if (isDev && isLocalhost) {
    // Development localhost override
    originToAllow = reqOrigin
  } else {
    // Fallback to first allowed origin
    originToAllow = allowedOrigins[0]
  }
  
  // Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', originToAllow)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (debug) {
    console.log('[DEBUG_ADMIN] CORS', { reqOrigin, allowedOrigins, originToAllow, isAllowed })
  }
}


