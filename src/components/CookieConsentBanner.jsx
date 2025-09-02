import React, { useState, useEffect } from 'react'
import { usePrivacyCompliance } from '../utils/privacy'

export default function CookieConsentBanner() {
  const {
    cookieConsent,
    cookiePreferences,
    showConsentBanner,
    handleConsentChange,
    handleConsentRevocation,
    showConsentBanner: showBanner
  } = usePrivacyCompliance()

  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  })

  // Initialize preferences from stored consent
  useEffect(() => {
    if (cookiePreferences) {
      setPreferences(cookiePreferences)
    }
  }, [cookiePreferences])

  // Handle preference change
  const handlePreferenceChange = (category, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: value
    }))
  }

  // Handle accept all
  const handleAcceptAll = () => {
    const allPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    }
    handleConsentChange(true, allPreferences)
  }

  // Handle accept selected
  const handleAcceptSelected = () => {
    handleConsentChange(true, preferences)
  }

  // Handle reject all
  const handleRejectAll = () => {
    const minimalPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    }
    handleConsentChange(false, minimalPreferences)
  }

  // Handle consent revocation
  const handleRevoke = () => {
    handleConsentRevocation()
  }

  // Don't show banner if consent already given
  if (cookieConsent && !showBanner) {
    return null
  }

  return (
    <>
      {/* Main consent banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                We value your privacy
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                We use cookies and similar technologies to provide, protect, and improve our services. 
                By clicking "Accept All", you consent to our use of cookies for analytics, marketing, 
                and preferences. You can customize your choices below.
              </p>
              
              {/* Quick action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Accept All
                </button>
                <button
                  onClick={handleAcceptSelected}
                  className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Accept Selected
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Reject All
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md border border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {showDetails ? 'Hide Details' : 'Customize'}
                </button>
              </div>
            </div>
          </div>

          {/* Detailed preferences */}
          {showDetails && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Cookie Preferences
              </h4>
              
              <div className="space-y-4">
                {/* Necessary cookies */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="necessary"
                        checked={preferences.necessary}
                        disabled
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="necessary" className="ml-3 text-sm font-medium text-gray-900">
                        Necessary Cookies
                      </label>
                    </div>
                    <p className="ml-7 text-sm text-gray-500">
                      Required for the website to function properly. Cannot be disabled.
                    </p>
                  </div>
                </div>

                {/* Analytics cookies */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="analytics"
                        checked={preferences.analytics}
                        onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="analytics" className="ml-3 text-sm font-medium text-gray-900">
                        Analytics Cookies
                      </label>
                    </div>
                    <p className="ml-7 text-sm text-gray-500">
                      Help us understand how visitors interact with our website by collecting and reporting information anonymously.
                    </p>
                  </div>
                </div>

                {/* Marketing cookies */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="marketing"
                        checked={preferences.marketing}
                        onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="marketing" className="ml-3 text-sm font-medium text-gray-900">
                        Marketing Cookies
                      </label>
                    </div>
                    <p className="ml-7 text-sm text-gray-500">
                      Used to track visitors across websites to display relevant and engaging advertisements.
                    </p>
                  </div>
                </div>

                {/* Preferences cookies */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="preferences"
                        checked={preferences.preferences}
                        onChange={(e) => handlePreferenceChange('preferences', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="preferences" className="ml-3 text-sm font-medium text-gray-900">
                        Preferences Cookies
                      </label>
                    </div>
                    <p className="ml-7 text-sm text-gray-500">
                      Allow the website to remember choices you make and provide enhanced, more personal features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy policy links */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  By using our website, you agree to our{' '}
                  <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800 underline">
                    Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a href="/terms-conditions" className="text-blue-600 hover:text-blue-800 underline">
                    Terms of Service
                  </a>
                  . You can change your cookie preferences at any time by clicking the "Cookie Settings" link in our footer.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cookie settings button (shown when consent is given) */}
      {cookieConsent && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-full shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label="Cookie Settings"
          >
            🍪
          </button>
        </div>
      )}

      {/* Consent management modal */}
      {showDetails && cookieConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Cookie Settings
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Current consent status */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Current Consent Status</h4>
                <p className="text-sm text-gray-600">
                  Consent given on {new Date(cookieConsent.timestamp).toLocaleDateString()}
                </p>
                <button
                  onClick={handleRevoke}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Revoke all consent
                </button>
              </div>

              {/* Preferences (same as above) */}
              <div className="space-y-4">
                {/* ... preferences checkboxes (same as above) ... */}
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleAcceptSelected}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save Preferences
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
