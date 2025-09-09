// Distributed Rate Limiting with Upstash Redis (fallback to in-memory)

const rateLimitStore = new Map()

function redisAvailable() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

async function redisIncrWithTtl(key, ttlSeconds) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  // Use pipeline: INCR key, EXPIRE key ttl
  const body = JSON.stringify([
    ["INCR", key],
    ["EXPIRE", key, ttlSeconds]
  ])
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body
  })
  if (!resp.ok) throw new Error(`Upstash error: ${resp.status}`)
  const results = await resp.json()
  const incrResult = results?.[0]?.result
  return typeof incrResult === 'number' ? incrResult : Number(incrResult)
}

export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  maxRequests = 100,
  keyGenerator = (req) => req.ip,
  skipSuccessfulRequests = false, // kept for API compatibility
  skipFailedRequests = false,     // kept for API compatibility
  message = 'Too many requests, please try again later.',
  statusCode = 429
}) {
  const useRedis = redisAvailable()
  const windowSeconds = Math.ceil(windowMs / 1000)

  if (useRedis) {
    return async (req, res, next) => {
      try {
        const key = keyGenerator(req)
        const windowId = Math.floor(Date.now() / windowMs)
        const redisKey = `rl:${key}:${windowId}`
        const count = await redisIncrWithTtl(redisKey, windowSeconds)
        const resetTime = (windowId + 1) * windowMs
        const remaining = Math.max(0, maxRequests - count)

        res.setHeader('X-RateLimit-Limit', maxRequests)
        res.setHeader('X-RateLimit-Remaining', remaining)
        res.setHeader('X-RateLimit-Reset', resetTime)
        res.setHeader('X-RateLimit-Reset-Time', new Date(resetTime).toISOString())

        if (count > maxRequests) {
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
          res.setHeader('Retry-After', retryAfter)
          return res.status(statusCode).json({
            error: 'Rate limit exceeded',
            message,
            retryAfter,
            code: 'RATE_LIMIT_EXCEEDED'
          })
        }
        return next()
      } catch (err) {
        console.warn('Rate limiter Redis error, falling back to in-memory for this request:', err?.message)
        // Fallback inline
        return inMemoryLimiter({ windowMs, maxRequests, keyGenerator, message, statusCode })(req, res, next)
      }
    }
  }

  // In-memory default
  return inMemoryLimiter({ windowMs, maxRequests, keyGenerator, message, statusCode })
}

function inMemoryLimiter({ windowMs, maxRequests, keyGenerator, message, statusCode }) {
  return (req, res, next) => {
    const key = keyGenerator(req)
    const now = Date.now()
    const windowStart = now - windowMs

    const data = rateLimitStore.get(key) || {
      requests: [],
      resetTime: now + windowMs,
      blocked: false,
      blockUntil: 0,
      violationCount: 0
    }

    if (data.blocked && now < data.blockUntil) {
      const retryAfter = Math.ceil((data.blockUntil - now) / 1000)
      res.setHeader('Retry-After', retryAfter)
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', 0)
      res.setHeader('X-RateLimit-Reset', data.blockUntil)
      res.setHeader('X-RateLimit-Reset-Time', new Date(data.blockUntil).toISOString())
      return res.status(statusCode).json({ error: 'Rate limit exceeded', message, retryAfter, code: 'RATE_LIMIT_EXCEEDED' })
    }

    data.requests = data.requests.filter(t => t > windowStart)
    if (data.requests.length >= maxRequests) {
      const blockDuration = Math.min(1000 * Math.pow(2, data.violationCount || 0), 3600000)
      data.blocked = true
      data.blockUntil = now + blockDuration
      data.violationCount = (data.violationCount || 0) + 1

      const retryAfter = Math.ceil(blockDuration / 1000)
      res.setHeader('Retry-After', retryAfter)
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', 0)
      res.setHeader('X-RateLimit-Reset', data.blockUntil)
      res.setHeader('X-RateLimit-Reset-Time', new Date(data.blockUntil).toISOString())
      rateLimitStore.set(key, data)
      return res.status(statusCode).json({ error: 'Rate limit exceeded', message, retryAfter, code: 'RATE_LIMIT_EXCEEDED' })
    }

    data.requests.push(now)
    if (!data.resetTime || data.resetTime < now) data.resetTime = now + windowMs
    rateLimitStore.set(key, data)

    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', maxRequests - data.requests.length)
    res.setHeader('X-RateLimit-Reset', data.resetTime)
    res.setHeader('X-RateLimit-Reset-Time', new Date(data.resetTime).toISOString())
    return next()
  }
}

// Periodic cleanup for in-memory mode
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > 3600000) rateLimitStore.delete(key)
  }
}, 60000)

export function getRateLimitStats() {
  const stats = { totalKeys: rateLimitStore.size, blockedKeys: 0, totalRequests: 0, violations: 0 }
  for (const [, data] of rateLimitStore.entries()) {
    if (data.blocked) stats.blockedKeys++
    stats.totalRequests += data.requests.length
    stats.violations += data.violationCount || 0
  }
  return stats
}

export function resetRateLimit(key) {
  if (rateLimitStore.has(key)) {
    rateLimitStore.delete(key)
    return { success: true, message: `Rate limit reset for ${key}` }
  }
  return { success: false, message: `No rate limit data found for ${key}` }
}
