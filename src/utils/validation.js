// Comprehensive validation utilities
import analytics from './analytics'

class ValidationUtils {
  constructor() {
    this.errors = []
  }

  // Clear validation errors
  clearErrors() {
    this.errors = []
  }

  // Add validation error
  addError(field, message, code = null) {
    this.errors.push({ field, message, code })
  }

  // Get all validation errors
  getErrors() {
    return this.errors
  }

  // Check if there are any errors
  hasErrors() {
    return this.errors.length > 0
  }

  // Validate email format
  validateEmail(email) {
    if (!email) {
      this.addError('email', 'Email is required', 'REQUIRED')
      return false
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      this.addError('email', 'Please enter a valid email address', 'INVALID_FORMAT')
      return false
    }
    
    return true
  }

  // Validate phone number
  validatePhone(phone) {
    if (!phone) {
      this.addError('phone', 'Phone number is required', 'REQUIRED')
      return false
    }
    
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '')
    
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      this.addError('phone', 'Please enter a valid phone number', 'INVALID_FORMAT')
      return false
    }
    
    return true
  }

  // Validate required fields
  validateRequired(value, fieldName, displayName = null) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      this.addError(fieldName, `${displayName || fieldName} is required`, 'REQUIRED')
      return false
    }
    return true
  }

  // Validate string length
  validateLength(value, fieldName, minLength, maxLength, displayName = null) {
    if (!value) return true // Skip if empty (use validateRequired for required fields)
    
    if (minLength && value.length < minLength) {
      this.addError(fieldName, `${displayName || fieldName} must be at least ${minLength} characters`, 'TOO_SHORT')
      return false
    }
    
    if (maxLength && value.length > maxLength) {
      this.addError(fieldName, `${displayName || fieldName} must be no more than ${maxLength} characters`, 'TOO_LONG')
      return false
    }
    
    return true
  }

  // Validate numeric values
  validateNumber(value, fieldName, min = null, max = null, displayName = null) {
    if (!value) return true // Skip if empty
    
    const num = Number(value)
    if (isNaN(num)) {
      this.addError(fieldName, `${displayName || fieldName} must be a valid number`, 'INVALID_NUMBER')
      return false
    }
    
    if (min !== null && num < min) {
      this.addError(fieldName, `${displayName || fieldName} must be at least ${min}`, 'BELOW_MIN')
      return false
    }
    
    if (max !== null && num > max) {
      this.addError(fieldName, `${displayName || fieldName} must be no more than ${max}`, 'ABOVE_MAX')
      return false
    }
    
    return true
  }

  // Validate price values
  validatePrice(value, fieldName, displayName = null) {
    if (!value) return true
    
    const num = Number(value)
    if (isNaN(num) || num < 0) {
      this.addError(fieldName, `${displayName || fieldName} must be a valid positive number`, 'INVALID_PRICE')
      return false
    }
    
    // Check for reasonable price limits (adjust as needed)
    if (num > 1000000) {
      this.addError(fieldName, `${displayName || fieldName} seems unusually high`, 'PRICE_TOO_HIGH')
      return false
    }
    
    return true
  }

  // Validate build data
  validateBuild(buildData) {
    this.clearErrors()
    
    // Validate required build fields
    this.validateRequired(buildData.modelSlug, 'modelSlug', 'Model')
    this.validateRequired(buildData.modelName, 'modelName', 'Model Name')
    this.validateLength(buildData.modelName, 'modelName', 1, 200, 'Model Name')
    
    // Validate pricing
    if (buildData.pricing) {
      this.validatePrice(buildData.pricing.base, 'pricing.base', 'Base Price')
      this.validatePrice(buildData.pricing.options, 'pricing.options', 'Options Price')
      this.validatePrice(buildData.pricing.delivery, 'pricing.delivery', 'Delivery Cost')
      this.validatePrice(buildData.pricing.setup, 'pricing.setup', 'Setup Cost')
      this.validatePrice(buildData.pricing.tax, 'pricing.tax', 'Tax Amount')
      this.validatePrice(buildData.pricing.total, 'pricing.total', 'Total Price')
    }
    
    // Validate selections
    if (buildData.selections) {
      this.validatePrice(buildData.selections.basePrice, 'selections.basePrice', 'Base Price')
      
      if (buildData.selections.options && Array.isArray(buildData.selections.options)) {
        buildData.selections.options.forEach((option, index) => {
          this.validateRequired(option.id, `selections.options[${index}].id`, 'Option ID')
          this.validateRequired(option.name, `selections.options[${index}].name`, 'Option Name')
          this.validatePrice(option.price, `selections.options[${index}].price`, 'Option Price')
          this.validateNumber(option.quantity, `selections.options[${index}].quantity`, 1, 100, 'Option Quantity')
        })
      }
    }
    
    return !this.hasErrors()
  }

  // Validate buyer information
  validateBuyerInfo(buyerInfo) {
    this.clearErrors()
    
    this.validateRequired(buyerInfo.firstName, 'firstName', 'First Name')
    this.validateLength(buyerInfo.firstName, 'firstName', 1, 50, 'First Name')
    
    this.validateRequired(buyerInfo.lastName, 'lastName', 'Last Name')
    this.validateLength(buyerInfo.lastName, 'lastName', 1, 50, 'Last Name')
    
    this.validateEmail(buyerInfo.email)
    
    if (buyerInfo.phone) {
      this.validatePhone(buyerInfo.phone)
    }
    
    if (buyerInfo.address) {
      this.validateLength(buyerInfo.address, 'address', 5, 500, 'Address')
    }
    
    return !this.hasErrors()
  }

  // Validate financing information
  validateFinancing(financing) {
    this.clearErrors()
    
    this.validateRequired(financing.method, 'method', 'Payment Method')
    
    if (financing.method === 'finance') {
      if (financing.lender) {
        this.validateLength(financing.lender, 'lender', 1, 100, 'Lender Name')
      }
      
      if (financing.loanAmount) {
        this.validatePrice(financing.loanAmount, 'loanAmount', 'Loan Amount')
      }
      
      if (financing.interestRate) {
        this.validateNumber(financing.interestRate, 'interestRate', 0, 100, 'Interest Rate')
      }
    }
    
    return !this.hasErrors()
  }

  // Validate API response
  validateApiResponse(response, expectedFields = []) {
    this.clearErrors()
    
    if (!response) {
      this.addError('response', 'No response received', 'NO_RESPONSE')
      return false
    }
    
    if (!response.ok) {
      this.addError('response', `HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR')
      return false
    }
    
    // Check for expected fields in response data
    if (expectedFields.length > 0 && response.data) {
      expectedFields.forEach(field => {
        if (!(field in response.data)) {
          this.addError('response', `Missing required field: ${field}`, 'MISSING_FIELD')
        }
      })
    }
    
    return !this.hasErrors()
  }

  // Validate form data
  validateForm(formData, rules) {
    this.clearErrors()
    
    Object.keys(rules).forEach(fieldName => {
      const rule = rules[fieldName]
      const value = formData[fieldName]
      
      // Required validation
      if (rule.required && !this.validateRequired(value, fieldName, rule.displayName)) {
        return
      }
      
      // Skip other validations if field is empty and not required
      if (!value && !rule.required) {
        return
      }
      
      // Email validation
      if (rule.type === 'email') {
        this.validateEmail(value)
      }
      
      // Phone validation
      if (rule.type === 'phone') {
        this.validatePhone(value)
      }
      
      // Number validation
      if (rule.type === 'number') {
        this.validateNumber(value, fieldName, rule.min, rule.max, rule.displayName)
      }
      
      // Price validation
      if (rule.type === 'price') {
        this.validatePrice(value, fieldName, rule.displayName)
      }
      
      // Length validation
      if (rule.minLength || rule.maxLength) {
        this.validateLength(value, fieldName, rule.minLength, rule.maxLength, rule.displayName)
      }
      
      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value, formData)
        if (customResult !== true) {
          this.addError(fieldName, customResult, 'CUSTOM_VALIDATION')
        }
      }
    })
    
    return !this.hasErrors()
  }

  // Sanitize input data
  sanitizeInput(input, type = 'text') {
    if (!input) return input
    
    switch (type) {
      case 'email':
        return input.toLowerCase().trim()
      
      case 'phone':
        return input.replace(/[^\d+\-\(\)\s]/g, '').trim()
      
      case 'number':
        return input.toString().replace(/[^\d.]/g, '')
      
      case 'price':
        return input.toString().replace(/[^\d.]/g, '')
      
      case 'text':
      default:
        return input.toString().trim()
    }
  }

  // Validate and sanitize form data
  validateAndSanitize(formData, rules) {
    const sanitizedData = {}
    
    Object.keys(formData).forEach(fieldName => {
      const rule = rules[fieldName]
      if (rule && rule.type) {
        sanitizedData[fieldName] = this.sanitizeInput(formData[fieldName], rule.type)
      } else {
        sanitizedData[fieldName] = this.sanitizeInput(formData[fieldName])
      }
    })
    
    const isValid = this.validateForm(sanitizedData, rules)
    
    return {
      isValid,
      data: sanitizedData,
      errors: this.getErrors()
    }
  }

  // Track validation errors for analytics
  trackValidationErrors(context, errors) {
    errors.forEach(error => {
      analytics.trackError('validation_error', `${error.field}: ${error.message}`, null, {
        context,
        field: error.field,
        code: error.code
      })
    })
  }

  // Validate file upload
  validateFile(file, options = {}) {
    this.clearErrors()
    
    if (!file) {
      this.addError('file', 'No file selected', 'NO_FILE')
      return false
    }
    
    // File size validation
    const maxSize = options.maxSize || 10 * 1024 * 1024 // 10MB default
    if (file.size > maxSize) {
      this.addError('file', `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`, 'FILE_TOO_LARGE')
      return false
    }
    
    // File type validation
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const fileType = file.type
      const isValidType = options.allowedTypes.some(type => {
        if (type.includes('*')) {
          return fileType.startsWith(type.replace('*', ''))
        }
        return fileType === type
      })
      
      if (!isValidType) {
        this.addError('file', `File type must be: ${options.allowedTypes.join(', ')}`, 'INVALID_FILE_TYPE')
        return false
      }
    }
    
    return !this.hasErrors()
  }
}

// Create singleton instance
const validation = new ValidationUtils()

export default validation
