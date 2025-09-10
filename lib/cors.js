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
  const isAllowed = allowedOrigins.includes(reqOrigin)

  // In development, always allow localhost
  const isDev = process.env.NODE_ENV === 'development'
  const isLocalhost = reqOrigin.startsWith('http://localhost:')
  
  // If origin is empty or not allowed, use the first allowed origin
  // This handles cases where requests come from the same origin (no Origin header)
  const originToAllow = isAllowed ? reqOrigin : allowedOrigins[0]
  
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


