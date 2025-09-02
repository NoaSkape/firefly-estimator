// Rate limiting utility for API protection
// Note: This is a client-side implementation for browser environments

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map()

export function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes
  maxRequests = 100, // max requests per window
  keyGenerator = (req) => req.ip, // default key generator
  skipSuccessfulRequests = false, // count successful requests
  skipFailedRequests = false, // count failed requests
  message = 'Too many requests, please try again later.',
  statusCode = 429
}) {
  return (req, res, next) => {
    const key = keyGenerator(req)
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Get current rate limit data
    const rateLimitData = rateLimitStore.get(key) || { 
      requests: [], 
      resetTime: now + windowMs,
      blocked: false,
      blockUntil: 0
    }
    
    // Check if key is currently blocked
    if (rateLimitData.blocked && now < rateLimitData.blockUntil) {
      const retryAfter = Math.ceil((rateLimitData.blockUntil - now) / 1000)
      
      res.setHeader('Retry-After', retryAfter)
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', 0)
      res.setHeader('X-RateLimit-Reset', rateLimitData.blockUntil)
      res.setHeader('X-RateLimit-Reset-Time', new Date(rateLimitData.blockUntil).toISOString())
      
      return res.status(statusCode).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter,
        code: 'RATE_LIMIT_EXCEEDED'
      })
    }
    
    // Clean old requests outside current window
    rateLimitData.requests = rateLimitData.requests.filter(time => time > windowStart)
    
    // Check if limit exceeded
    if (rateLimitData.requests.length >= maxRequests) {
      // Implement exponential backoff for repeated violations
      const violationCount = rateLimitData.violationCount || 0
      const blockDuration = Math.min(1000 * Math.pow(2, violationCount), 3600000) // Max 1 hour
      
      rateLimitData.blocked = true
      rateLimitData.blockUntil = now + blockDuration
      rateLimitData.violationCount = violationCount + 1
      
      const retryAfter = Math.ceil(blockDuration / 1000)
      
      res.setHeader('Retry-After', retryAfter)
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', 0)
      res.setHeader('X-RateLimit-Reset', rateLimitData.blockUntil)
      res.setHeader('X-RateLimit-Reset-Time', new Date(rateLimitData.blockUntil).toISOString())
      
      return res.status(statusCode).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter,
        code: 'RATE_LIMIT_EXCEEDED'
      })
    }
    
    // Add current request
    rateLimitData.requests.push(now)
    rateLimitStore.set(key, rateLimitData)
    
    // Set response headers
    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', maxRequests - rateLimitData.requests.length)
    res.setHeader('X-RateLimit-Reset', rateLimitData.resetTime)
    res.setHeader('X-RateLimit-Reset-Time', new Date(rateLimitData.resetTime).toISOString())
    
    // Log rate limit events for monitoring
    if (rateLimitData.requests.length > maxRequests * 0.8) {
      console.warn(`Rate limit warning: ${key} has made ${rateLimitData.requests.length}/${maxRequests} requests`)
    }
    
    next()
  }
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    if (now - data.resetTime > 3600000) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

// Export rate limit store for monitoring
export function getRateLimitStats() {
  const stats = {
    totalKeys: rateLimitStore.size,
    blockedKeys: 0,
    totalRequests: 0,
    violations: 0
  }
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.blocked) stats.blockedKeys++
    stats.totalRequests += data.requests.length
    stats.violations += data.violationCount || 0
  }
  
  return stats
}

// Reset rate limit for a specific key (admin function)
export function resetRateLimit(key) {
  if (rateLimitStore.has(key)) {
    rateLimitStore.delete(key)
    return { success: true, message: `Rate limit reset for ${key}` }
  }
  return { success: false, message: `No rate limit data found for ${key}` }
}
