// lib/cors.js
// Small helper to apply consistent CORS behavior across API routes

export function applyCors(req, res, methods = 'GET, POST, PATCH, DELETE, OPTIONS') {
  const debug = process.env.DEBUG_ADMIN === 'true'
  const csv = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const reqOrigin = req.headers?.origin || req.headers?.Origin || ''
  const isAllowed = csv.length ? csv.includes(reqOrigin) : false

  // In development, default to Vite dev server
  const devFallback = process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : ''

  const originToAllow = isAllowed ? reqOrigin : (csv[0] || devFallback)
  if (originToAllow) {
    res.setHeader('Access-Control-Allow-Origin', originToAllow)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (debug) {
    console.log('[DEBUG_ADMIN] CORS', { reqOrigin, csv, originToAllow })
  }
}


