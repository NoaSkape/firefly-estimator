import { useState, useEffect } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from './ToastProvider'

export default function CreditCardSteps({ 
  onContinue, 
  onBack, 
  formatCurrency, 
  currentAmountCents,
  buildId,
  getToken,
  paymentPlan,
  totalCents,
  depositCents,
  build
}) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [paymentMethodId, setPaymentMethodId] = useState(null)
  const [cardDetails, setCardDetails] = useState(null)
  const { addToast } = useToast()
  const stripe = useStripe()
  const elements = useElements()

  // Card verification state
  const [cardholderName, setCardholderName] = useState('')
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: ''
  })
  const [disclosures, setDisclosures] = useState({
    validation: false,
    noChargeYet: false,
    processingFees: false
  })

  // Auto-populate billing address from build data
  useEffect(() => {
    if (build?.buyerInfo) {
      setCardholderName(`${build.buyerInfo.firstName} ${build.buyerInfo.lastName}`)
      setBillingAddress({
        street: build.buyerInfo.address || '',
        city: build.buyerInfo.city || '',
        state: build.buyerInfo.state || '',
        zip: build.buyerInfo.zip || ''
      })
    }
  }, [build?.buyerInfo])

  // Validate Step 2 form
  const validateStep2 = () => {
    const errors = {}
    
    if (!cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required'
    }
    
    if (!billingAddress.street.trim()) {
      errors.street = 'Street address is required'
    }
    
    if (!billingAddress.city.trim()) {
      errors.city = 'City is required'
    }
    
    if (!billingAddress.state.trim()) {
      errors.state = 'State is required'
    }
    
    if (!billingAddress.zip.trim()) {
      errors.zip = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(billingAddress.zip.trim())) {
      errors.zip = 'Please enter a valid ZIP code'
    }
    
    if (!disclosures.validation) {
      errors.validation = 'This disclosure must be acknowledged'
    }
    
    if (!disclosures.noChargeYet) {
      errors.noChargeYet = 'This disclosure must be acknowledged'
    }
    
    if (!disclosures.processingFees) {
      errors.processingFees = 'This disclosure must be acknowledged'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Step 2: Verify card and create payment method
  async function verifyCard() {
    if (!validateStep2()) return
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)
    
    try {
      const cardElement = elements.getElement('card')
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      // Create payment method with Stripe
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName,
          address: {
            line1: billingAddress.street,
            city: billingAddress.city,
            state: billingAddress.state,
            postal_code: billingAddress.zip,
            country: 'US'
          }
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      // Verify the payment method with backend
      const token = await getToken()
      const res = await fetch('/api/payments/verify-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          buildId,
          paymentMethodId: paymentMethod.id,
          cardholderName,
          billingAddress
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Card verification failed')
      }

      const data = await res.json()
      
      // Store payment method details
      setPaymentMethodId(paymentMethod.id)
      setCardDetails({
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year
      })

      // Auto-save payment method since user already provided authorizations in Step 2
      console.log('🔄 Calling save-card-method API with data:', {
        buildId,
        paymentMethodId: paymentMethod.id,
        paymentPlan,
        cardholderName,
        billingAddress,
        cardDetails: {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year
        }
      })
      
      const saveRes = await fetch('/api/payments/save-card-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          buildId,
          paymentMethodId: paymentMethod.id,
          paymentPlan,
          cardholderName,
          billingAddress,
          cardDetails: {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year
          },
          authorizations: {
            chargeAuthorization: true,
            nonRefundable: true,
            highValueTransaction: true
          }
        })
      })

      // Check if response has content first
      const responseText = await saveRes.text()
      if (!responseText) {
        throw new Error('Empty response from server')
      }

      if (!saveRes.ok) {
        const errorData = JSON.parse(responseText)
        throw new Error(errorData.error || 'Failed to save payment method')
      }

      const saveData = JSON.parse(responseText)
      console.log('✅ Card payment saved successfully:', saveData)

      addToast({
        type: 'success',
        title: 'Card Verified & Saved',
        message: 'Your credit card has been successfully verified and saved. You can now proceed to review.'
      })

      // Proceed directly to review step (Step 3 of the payment wizard)
      onContinue()
      
    } catch (error) {
      console.error('Card verification error:', error)
      setError(error.message)
      addToast({
        type: 'error',
        title: 'Verification Failed',
        message: error.message || 'Unable to verify your card. Please check your details and try again.'
      })
    } finally {
      setProcessing(false)
    }
  }

  // Note: validateStep3 and confirmAuthorization functions removed since 
  // authorization is now handled automatically in verifyCard()

  // Reset and retry
  function resetAndRetry() {
    setError(null)
    setValidationErrors({})
    setPaymentMethodId(null)
    setCardDetails(null)
  }

  // Connect & Verify Credit Card
  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-white font-semibold text-xl mb-3">Connect Your Credit Card</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Securely connect and verify your credit card. We use Stripe's PCI-compliant processing to protect your information.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-red-400 text-xl mr-3">❌</span>
              <div className="flex-1">
                <div className="font-medium text-red-200">{error}</div>
                <button
                  type="button"
                  onClick={resetAndRetry}
                  className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Details Form */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Card Information</h3>
          
          <div className="space-y-4">
            {/* Cardholder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cardholder Name *
              </label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                  validationErrors.cardholderName ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Full name as it appears on card"
              />
              {validationErrors.cardholderName && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.cardholderName}</p>
              )}
            </div>

            {/* Stripe Card Element */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Card Details *
              </label>
              <div className="p-3 bg-gray-800 border border-gray-600 rounded-md">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#ffffff',
                        '::placeholder': {
                          color: '#9ca3af',
                        },
                      },
                      invalid: {
                        color: '#ef4444',
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Billing Address *
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  value={billingAddress.street}
                  onChange={(e) => setBillingAddress(prev => ({ ...prev, street: e.target.value }))}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                    validationErrors.street ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Street Address"
                />
                {validationErrors.street && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.street}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={billingAddress.city}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, city: e.target.value }))}
                    className={`px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                      validationErrors.city ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={billingAddress.state}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, state: e.target.value }))}
                    className={`px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                      validationErrors.state ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="State"
                  />
                  <input
                    type="text"
                    value={billingAddress.zip}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, zip: e.target.value }))}
                    className={`px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                      validationErrors.zip ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="ZIP"
                  />
                </div>
                {(validationErrors.city || validationErrors.state || validationErrors.zip) && (
                  <p className="mt-1 text-sm text-red-400">
                    {validationErrors.city || validationErrors.state || validationErrors.zip}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Disclosures */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Required Disclosures</h3>
          <div className="space-y-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={disclosures.validation}
                onChange={(e) => setDisclosures(prev => ({ ...prev, validation: e.target.checked }))}
                className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
              />
              <div className="flex-1">
                <span className="text-white text-sm">
                  I authorize Firefly Tiny Homes to securely validate my credit card through our payment processor (Stripe).
                </span>
                {validationErrors.validation && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.validation}</p>
                )}
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={disclosures.noChargeYet}
                onChange={(e) => setDisclosures(prev => ({ ...prev, noChargeYet: e.target.checked }))}
                className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
              />
              <div className="flex-1">
                <span className="text-white text-sm">
                  I understand this card will not be charged at this step; the actual payment occurs after I sign the contract.
                </span>
                {validationErrors.noChargeYet && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.noChargeYet}</p>
                )}
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={disclosures.processingFees}
                onChange={(e) => setDisclosures(prev => ({ ...prev, processingFees: e.target.checked }))}
                className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
              />
              <div className="flex-1">
                <span className="text-white text-sm">
                  I understand credit card payments may incur processing fees, and I am responsible for those fees.
                </span>
                {validationErrors.processingFees && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.processingFees}</p>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            className="btn-primary"
            onClick={verifyCard}
            disabled={processing || !stripe || !elements}
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Verifying Card...
              </span>
            ) : (
              'Verify Card'
            )}
          </button>
          <button 
            className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
            onClick={onBack}
          >
            ← Back
          </button>
        </div>
      </div>
    )
}
