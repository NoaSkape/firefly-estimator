/**
 * Contract Security Utilities
 * Implements enterprise-grade security measures for contract handling
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate contract data structure
 */
export function validateContractData(data) {
  const errors = []
  
  // Required fields validation
  const requiredFields = ['buildId', 'userId']
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`)
    }
  }
  
  // Data type validation
  if (data.buildId && typeof data.buildId !== 'string') {
    errors.push('buildId must be a string')
  }
  
  if (data.userId && typeof data.userId !== 'string') {
    errors.push('userId must be a string')
  }
  
  // Pack status validation
  const validStatuses = ['not_started', 'in_progress', 'completed', 'failed', 'voided']
  if (data.packs) {
    for (const [packId, packData] of Object.entries(data.packs)) {
      if (packData.status && !validStatuses.includes(packData.status)) {
        errors.push(`Invalid status for pack ${packId}: ${packData.status}`)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate secure download token
 */
export function generateSecureToken(data) {
  const timestamp = Date.now()
  const randomBytes = new Uint8Array(16)
  crypto.getRandomValues(randomBytes)
  const random = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')
  
  return btoa(`${data.userId}:${data.buildId}:${timestamp}:${random}`)
}

/**
 * Validate download token
 */
export function validateDownloadToken(token, expectedUserId, expectedBuildId, maxAge = 24 * 60 * 60 * 1000) {
  try {
    const decoded = atob(token)
    const [userId, buildId, timestamp, random] = decoded.split(':')
    
    // Check required components
    if (!userId || !buildId || !timestamp || !random) {
      return { valid: false, reason: 'Invalid token format' }
    }
    
    // Check user and build ID match
    if (userId !== expectedUserId || buildId !== expectedBuildId) {
      return { valid: false, reason: 'Token mismatch' }
    }
    
    // Check expiration
    const tokenTime = parseInt(timestamp, 10)
    if (Date.now() - tokenTime > maxAge) {
      return { valid: false, reason: 'Token expired' }
    }
    
    return { valid: true }
  } catch (error) {
    return { valid: false, reason: 'Invalid token' }
  }
}

/**
 * Rate limiting for contract operations
 */
class ContractRateLimiter {
  constructor() {
    this.attempts = new Map()
    this.cleanup()
  }
  
  /**
   * Check if operation is allowed for user
   */
  isAllowed(userId, operation = 'general', maxAttempts = 10, windowMs = 15 * 60 * 1000) {
    const key = `${userId}:${operation}`
    const now = Date.now()
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, [])
    }
    
    const userAttempts = this.attempts.get(key)
    
    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(time => now - time < windowMs)
    this.attempts.set(key, validAttempts)
    
    // Check if under limit
    if (validAttempts.length >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validAttempts) + windowMs
      }
    }
    
    // Record this attempt
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    
    return {
      allowed: true,
      remaining: maxAttempts - validAttempts.length,
      resetTime: now + windowMs
    }
  }
  
  /**
   * Clean up old entries periodically
   */
  cleanup() {
    setInterval(() => {
      const now = Date.now()
      const windowMs = 60 * 60 * 1000 // 1 hour
      
      for (const [key, attempts] of this.attempts.entries()) {
        const validAttempts = attempts.filter(time => now - time < windowMs)
        if (validAttempts.length === 0) {
          this.attempts.delete(key)
        } else {
          this.attempts.set(key, validAttempts)
        }
      }
    }, 5 * 60 * 1000) // Clean up every 5 minutes
  }
}

export const contractRateLimiter = new ContractRateLimiter()

/**
 * Audit logging for contract operations
 */
export function logContractEvent(event) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event: sanitizeInput(event.action),
    userId: sanitizeInput(event.userId),
    buildId: sanitizeInput(event.buildId),
    packId: sanitizeInput(event.packId),
    metadata: event.metadata || {},
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    ipAddress: event.ipAddress || 'unknown'
  }
  
  // In production, this would go to a secure logging service
  console.log('[CONTRACT_AUDIT]', JSON.stringify(logEntry))
  
  return logEntry
}

/**
 * Validate file upload security
 */
export function validateFileUpload(file) {
  const errors = []
  
  // File type validation
  const allowedTypes = ['application/pdf']
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only PDF files are allowed')
  }
  
  // File size validation (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB')
  }
  
  // File name validation
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    errors.push('File name contains invalid characters')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Content Security Policy headers
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.docuseal.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.docuseal.com https://res.cloudinary.com",
    "frame-src 'self' https://app.docuseal.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}

/**
 * Security headers for contract endpoints
 */
export const SECURITY_HEADERS = {
  ...CSP_HEADERS,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

/**
 * Encrypt sensitive data before storage
 */
export async function encryptSensitiveData(data, key) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for environments without Web Crypto API
    return btoa(JSON.stringify(data))
  }
  
  try {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(JSON.stringify(data))
    
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    
    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBuffer
    )
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Encryption failed:', error)
    // Fallback to base64 encoding
    return btoa(JSON.stringify(data))
  }
}

/**
 * Decrypt sensitive data
 */
export async function decryptSensitiveData(encryptedData, key) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for environments without Web Crypto API
    try {
      return JSON.parse(atob(encryptedData))
    } catch (error) {
      throw new Error('Failed to decrypt data')
    }
  }
  
  try {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    )
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    
    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    )
    
    return JSON.parse(decoder.decode(decrypted))
  } catch (error) {
    console.error('Decryption failed:', error)
    // Fallback to base64 decoding
    try {
      return JSON.parse(atob(encryptedData))
    } catch (fallbackError) {
      throw new Error('Failed to decrypt data')
    }
  }
}
