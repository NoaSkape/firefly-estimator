// Privacy compliance utilities for GDPR/CPRA compliance
import { useState, useEffect, useCallback } from 'react'

// Cookie consent management
export class CookieConsentManager {
  constructor() {
    this.consentKey = 'firefly_cookie_consent'
    this.preferencesKey = 'firefly_cookie_preferences'
    this.defaultPreferences = {
      necessary: true, // Always required
      analytics: false,
      marketing: false,
      preferences: false
    }
  }

  // Get current consent status
  getConsent() {
    try {
      const stored = localStorage.getItem(this.consentKey)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.warn('Failed to read cookie consent:', error)
      return null
    }
  }

  // Get cookie preferences
  getPreferences() {
    try {
      const stored = localStorage.getItem(this.preferencesKey)
      return stored ? JSON.parse(stored) : this.defaultPreferences
    } catch (error) {
      console.warn('Failed to read cookie preferences:', error)
      return this.defaultPreferences
    }
  }

  // Set consent
  setConsent(consent, preferences = null) {
    try {
      const consentData = {
        timestamp: Date.now(),
        consent: consent,
        preferences: preferences || this.defaultPreferences,
        version: '1.0'
      }
      
      localStorage.setItem(this.consentKey, JSON.stringify(consentData))
      
      if (preferences) {
        localStorage.setItem(this.preferencesKey, JSON.stringify(preferences))
      }
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', { 
        detail: consentData 
      }))
      
      return true
    } catch (error) {
      console.error('Failed to set cookie consent:', error)
      return false
    }
  }

  // Check if consent is given for specific category
  hasConsent(category) {
    const consent = this.getConsent()
    if (!consent) return false
    
    if (category === 'necessary') return true
    return consent.preferences[category] === true
  }

  // Revoke consent
  revokeConsent() {
    try {
      localStorage.removeItem(this.consentKey)
      localStorage.removeItem(this.preferencesKey)
      
      window.dispatchEvent(new CustomEvent('cookieConsentRevoked'))
      return true
    } catch (error) {
      console.error('Failed to revoke cookie consent:', error)
      return false
    }
  }

  // Get consent age in days
  getConsentAge() {
    const consent = this.getConsent()
    if (!consent) return null
    
    const ageMs = Date.now() - consent.timestamp
    return Math.floor(ageMs / (1000 * 60 * 60 * 24))
  }
}

// Data subject rights management
export class DataSubjectRights {
  constructor() {
    this.requestsKey = 'firefly_dsr_requests'
  }

  // Submit data subject request
  async submitRequest(type, details) {
    const request = {
      id: this.generateRequestId(),
      type: type, // 'access', 'rectification', 'erasure', 'portability', 'restriction'
      status: 'pending',
      timestamp: Date.now(),
      details: details,
      estimatedCompletion: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    }

    try {
      // Store request locally
      this.storeRequest(request)
      
      // Send to server
      const response = await fetch('/api/privacy/dsr-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (response.ok) {
        request.status = 'submitted'
        this.updateRequest(request)
        return { success: true, requestId: request.id }
      } else {
        throw new Error('Failed to submit request')
      }
    } catch (error) {
      console.error('Failed to submit DSR request:', error)
      return { success: false, error: error.message }
    }
  }

  // Get request status
  getRequestStatus(requestId) {
    try {
      const requests = this.getStoredRequests()
      return requests.find(r => r.id === requestId) || null
    } catch (error) {
      console.warn('Failed to get request status:', error)
      return null
    }
  }

  // Store request locally
  storeRequest(request) {
    try {
      const requests = this.getStoredRequests()
      requests.push(request)
      localStorage.setItem(this.requestsKey, JSON.stringify(requests))
    } catch (error) {
      console.error('Failed to store request:', error)
    }
  }

  // Update stored request
  updateRequest(request) {
    try {
      const requests = this.getStoredRequests()
      const index = requests.findIndex(r => r.id === request.id)
      if (index !== -1) {
        requests[index] = request
        localStorage.setItem(this.requestsKey, JSON.stringify(requests))
      }
    } catch (error) {
      console.error('Failed to update request:', error)
    }
  }

  // Get stored requests
  getStoredRequests() {
    try {
      const stored = localStorage.getItem(this.requestsKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.warn('Failed to read stored requests:', error)
      return []
    }
  }

  // Generate unique request ID
  generateRequestId() {
    return `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Privacy policy compliance checker
export class PrivacyComplianceChecker {
  constructor() {
    this.requirements = {
      gdpr: {
        consent: true,
        dataProcessing: true,
        dataRetention: true,
        dataSubjectRights: true,
        dataBreachNotification: true,
        internationalTransfers: true
      },
      cpra: {
        notice: true,
        optOut: true,
        access: true,
        deletion: true,
        portability: true,
        nonDiscrimination: true
      }
    }
  }

  // Check GDPR compliance
  checkGDPRCompliance() {
    const results = {}
    
    for (const [requirement, required] of Object.entries(this.requirements.gdpr)) {
      results[requirement] = this.checkGDPRRequirement(requirement, required)
    }
    
    return {
      compliant: Object.values(results).every(r => r.compliant),
      requirements: results,
      score: this.calculateComplianceScore(results)
    }
  }

  // Check CPRA compliance
  checkCPRACompliance() {
    const results = {}
    
    for (const [requirement, required] of Object.entries(this.requirements.cpra)) {
      results[requirement] = this.checkCPRARequirement(requirement, required)
    }
    
    return {
      compliant: Object.values(results).every(r => r.compliant),
      requirements: results,
      score: this.calculateComplianceScore(results)
    }
  }

  // Check specific GDPR requirement
  checkGDPRRequirement(requirement, required) {
    // This would integrate with your actual implementation
    // For now, returning mock results
    const mockResults = {
      consent: { compliant: true, details: 'Cookie consent banner implemented' },
      dataProcessing: { compliant: true, details: 'Data processing agreements in place' },
      dataRetention: { compliant: true, details: 'Data retention policies defined' },
      dataSubjectRights: { compliant: true, details: 'DSR request system implemented' },
      dataBreachNotification: { compliant: true, details: 'Breach notification procedures established' },
      internationalTransfers: { compliant: true, details: 'SCCs and adequacy decisions in place' }
    }
    
    return mockResults[requirement] || { compliant: false, details: 'Requirement not implemented' }
  }

  // Check specific CPRA requirement
  checkCPRARequirement(requirement, required) {
    // This would integrate with your actual implementation
    const mockResults = {
      notice: { compliant: true, details: 'Privacy notice at collection implemented' },
      optOut: { compliant: true, details: 'Opt-out mechanism available' },
      access: { compliant: true, details: 'Data access requests handled' },
      deletion: { compliant: true, details: 'Data deletion requests handled' },
      portability: { compliant: true, details: 'Data portability available' },
      nonDiscrimination: { compliant: true, details: 'Non-discrimination policy enforced' }
    }
    
    return mockResults[requirement] || { compliant: false, details: 'Requirement not implemented' }
  }

  // Calculate compliance score
  calculateComplianceScore(results) {
    const total = Object.keys(results).length
    const compliant = Object.values(results).filter(r => r.compliant).length
    return Math.round((compliant / total) * 100)
  }
}

// React hooks for privacy compliance
export const usePrivacyCompliance = () => {
  const [cookieConsent, setCookieConsent] = useState(null)
  const [cookiePreferences, setCookiePreferences] = useState(null)
  const [showConsentBanner, setShowConsentBanner] = useState(false)

  const cookieManager = new CookieConsentManager()
  const dsrManager = new DataSubjectRights()
  const complianceChecker = new PrivacyComplianceChecker()

  // Initialize consent state
  useEffect(() => {
    const consent = cookieManager.getConsent()
    const preferences = cookieManager.getPreferences()
    
    setCookieConsent(consent)
    setCookiePreferences(preferences)
    
    // Show banner if no consent given
    if (!consent) {
      setShowConsentBanner(true)
    }
  }, [])

  // Handle consent change
  const handleConsentChange = useCallback((consent, preferences) => {
    const success = cookieManager.setConsent(consent, preferences)
    if (success) {
      setCookieConsent({ consent, preferences, timestamp: Date.now() })
      setCookiePreferences(preferences)
      setShowConsentBanner(false)
    }
  }, [])

  // Handle consent revocation
  const handleConsentRevocation = useCallback(() => {
    const success = cookieManager.revokeConsent()
    if (success) {
      setCookieConsent(null)
      setCookiePreferences(null)
      setShowConsentBanner(true)
    }
  }, [])

  // Submit DSR request
  const submitDSRRequest = useCallback(async (type, details) => {
    return await dsrManager.submitRequest(type, details)
  }, [])

  // Check compliance
  const checkCompliance = useCallback(() => {
    return {
      gdpr: complianceChecker.checkGDPRCompliance(),
      cpra: complianceChecker.checkCPRACompliance()
    }
  }, [])

  return {
    cookieConsent,
    cookiePreferences,
    showConsentBanner,
    handleConsentChange,
    handleConsentRevocation,
    submitDSRRequest,
    checkCompliance,
    cookieManager,
    dsrManager,
    complianceChecker
  }
}

// Privacy notice generator
export const generatePrivacyNotice = (dataPractices) => {
  return {
    collection: {
      categories: dataPractices.categories || [],
      purposes: dataPractices.purposes || [],
      sources: dataPractices.sources || []
    },
    sharing: {
      categories: dataPractices.sharingCategories || [],
      thirdParties: dataPractices.thirdParties || []
    },
    retention: {
      period: dataPractices.retentionPeriod || 'As long as necessary',
      criteria: dataPractices.retentionCriteria || []
    },
    rights: {
      access: true,
      deletion: true,
      portability: true,
      optOut: true,
      nonDiscrimination: true
    }
  }
}

// Export all utilities
export default {
  CookieConsentManager,
  DataSubjectRights,
  PrivacyComplianceChecker,
  usePrivacyCompliance,
  generatePrivacyNotice
}
