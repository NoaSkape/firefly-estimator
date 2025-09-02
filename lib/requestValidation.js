// Request validation and sanitization utility
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Common validation schemas
export const commonSchemas = {
  // Email validation
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  
  // Phone validation (US format)
  phone: z.string()
    .regex(/^\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/, 'Invalid phone number format')
    .min(10, 'Phone number too short')
    .max(15, 'Phone number too long'),
  
  // Name validation
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
  
  // Address validation
  address: z.object({
    street: z.string().min(1, 'Street address is required').max(200, 'Street address too long'),
    city: z.string().min(1, 'City is required').max(100, 'City name too long'),
    state: z.string().length(2, 'State must be 2 characters').toUpperCase(),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    country: z.string().default('US')
  }),
  
  // URL validation
  url: z.string().url('Invalid URL format').optional(),
  
  // ID validation (MongoDB ObjectId or numeric)
  id: z.union([
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
    z.string().regex(/^[0-9]+$/, 'Invalid numeric ID'),
    z.number().int().positive()
  ]),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc')
  }),
  
  // Search query
  search: z.object({
    q: z.string().min(1, 'Search query is required').max(200, 'Search query too long'),
    filters: z.record(z.any()).optional(),
    ...commonSchemas.pagination.shape
  })
}

// Sanitization functions
export const sanitizers = {
  // Sanitize HTML content
  html: (content) => {
    if (typeof content !== 'string') return content
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false
    })
  },
  
  // Sanitize text content (remove HTML tags)
  text: (content) => {
    if (typeof content !== 'string') return content
    return DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })
  },
  
  // Sanitize email
  email: (email) => {
    if (typeof email !== 'string') return email
    return email.toLowerCase().trim()
  },
  
  // Sanitize phone number
  phone: (phone) => {
    if (typeof phone !== 'string') return phone
    return phone.replace(/[^\d+]/g, '')
  },
  
  // Sanitize name
  name: (name) => {
    if (typeof name !== 'string') return name
    return name.trim().replace(/\s+/g, ' ')
  },
  
  // Sanitize address
  address: (address) => {
    if (typeof address !== 'object') return address
    return {
      street: sanitizers.text(address.street || ''),
      city: sanitizers.text(address.city || ''),
      state: (address.state || '').toUpperCase().trim(),
      zip: (address.zip || '').replace(/[^\d-]/g, ''),
      country: (address.country || 'US').toUpperCase().trim()
    }
  }
}

// Main validation function
export function validateRequest(schema, options = {}) {
  return (req, res, next) => {
    try {
      // Validate request data based on method
      let dataToValidate = {}
      
      if (req.method === 'GET') {
        dataToValidate = req.query
      } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        dataToValidate = req.body
      }
      
      // Parse and validate data
      const validatedData = schema.parse(dataToValidate)
      
      // Apply sanitization if requested
      if (options.sanitize) {
        const sanitizedData = sanitizeData(validatedData, options.sanitizeFields)
        req.validatedData = sanitizedData
      } else {
        req.validatedData = validatedData
      }
      
      // Log validation success for monitoring
      if (process.env.NODE_ENV === 'development') {
        console.log(`Request validation passed for ${req.method} ${req.path}`)
      }
      
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
        
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Request data validation failed',
          details: formattedErrors,
          code: 'VALIDATION_ERROR'
        })
      }
      
      // Unexpected error
      console.error('Validation error:', error)
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Request validation failed',
        code: 'INTERNAL_ERROR'
      })
    }
  }
}

// Sanitize data based on field specifications
function sanitizeData(data, sanitizeFields = {}) {
  const sanitized = { ...data }
  
  for (const [field, sanitizer] of Object.entries(sanitizeFields)) {
    if (sanitized[field] !== undefined) {
      if (typeof sanitizer === 'string' && sanitizers[sanitizer]) {
        sanitized[field] = sanitizers[sanitizer](sanitized[field])
      } else if (typeof sanitizer === 'function') {
        sanitized[field] = sanitizer(sanitized[field])
      }
    }
  }
  
  return sanitized
}

// Security validation helpers
export const securityValidators = {
  // Check for SQL injection attempts
  checkSQLInjection: (value) => {
    if (typeof value !== 'string') return true
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script)\b)/i,
      /(--|\/\*|\*\/|;|xp_|sp_)/i,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/i
    ]
    
    return !sqlPatterns.some(pattern => pattern.test(value))
  },
  
  // Check for XSS attempts
  checkXSS: (value) => {
    if (typeof value !== 'string') return true
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
    ]
    
    return !xssPatterns.some(pattern => pattern.test(value))
  },
  
  // Check for path traversal attempts
  checkPathTraversal: (value) => {
    if (typeof value !== 'string') return true
    const pathPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /\/etc\/passwd/,
      /\/windows\/system32/
    ]
    
    return !pathPatterns.some(pattern => pattern.test(value))
  }
}

// Rate limiting validation
export function validateRateLimit(req, res, next) {
  // Check if user is rate limited
  if (req.rateLimited) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    })
  }
  
  next()
}

// Export validation middleware factory
export function createValidationMiddleware(schema, options = {}) {
  return validateRequest(schema, options)
}
