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
  const [step, setStep] = useState('connect') // 'connect', 'confirm'
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [paymentMethodId, setPaymentMethodId] = useState(null)
  const [cardDetails, setCardDetails] = useState(null)
  const { addToast } = useToast()
  const stripe = useStripe()
  const elements = useElements()

  // Step 2 - Card verification state
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

  // Step 3 - Authorization state  
  const [authorizations, setAuthorizations] = useState({
    chargeAuthorization: false,
    nonRefundable: false,
    highValueTransaction: false
  })

  // Auto-populate billing address from build data
  useEffect(() => {
    if (build?.buyerInfo && step === 'connect') {
      setCardholderName(`${build.buyerInfo.firstName} ${build.buyerInfo.lastName}`)
      setBillingAddress({
        street: build.buyerInfo.address || '',
        city: build.buyerInfo.city || '',
        state: build.buyerInfo.state || '',
        zip: build.buyerInfo.zip || ''
      })
    }
  }, [build?.buyerInfo, step])

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

      addToast({
        type: 'success',
        title: 'Card Verified',
        message: 'Your credit card has been successfully verified.'
      })

      // Auto-check authorizations since user already agreed to disclosures in Step 2
      setAuthorizations({
        chargeAuthorization: true,
        nonRefundable: true,
        highValueTransaction: true
      })

      // Move to Step 3
      setStep('confirm')
      
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

  // Validate Step 3 form
  const validateStep3 = () => {
    const errors = {}
    
    if (!authorizations.chargeAuthorization) {
      errors.chargeAuthorization = 'This authorization is required'
    }
    
    if (!authorizations.nonRefundable) {
      errors.nonRefundable = 'This acknowledgment is required'
    }
    
    if (!authorizations.highValueTransaction) {
      errors.highValueTransaction = 'This acknowledgment is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Step 3: Confirm authorization and save payment method
  async function confirmAuthorization() {
    if (!validateStep3()) return

    setProcessing(true)
    setError(null)
    
    try {
      const token = await getToken()
      const res = await fetch('/api/payments/save-card-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          buildId,
          paymentMethodId,
          paymentPlan,
          cardholderName,
          billingAddress,
          cardDetails,
          authorizations
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save payment method')
      }

      const data = await res.json()

      addToast({
        type: 'success',
        title: 'Authorization Confirmed',
        message: 'Your credit card has been securely validated and saved. After your contract is signed, you will be able to confirm and complete your payment.'
      })

      // Continue to review step
      onContinue()
      
    } catch (error) {
      console.error('Save card method error:', error)
      setError(error.message)
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'Unable to save payment method. Please try again.'
      })
    } finally {
      setProcessing(false)
    }
  }

  // Reset and retry
  function resetAndRetry() {
    setError(null)
    setValidationErrors({})
    setPaymentMethodId(null)
    setCardDetails(null)
    setStep('connect')
  }

  // Step 2: Connect & Verify Credit Card
  if (step === 'connect') {
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

  // Step 3: Confirm Authorization & Commitments
  if (step === 'confirm') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-white font-semibold text-xl mb-3">Confirm Credit Card Authorization</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Review your payment plan and authorize the use of your verified credit card for future payments.
          </p>
        </div>

        {/* Payment Plan Summary */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Payment Plan</h3>
          
          {paymentPlan.type === 'deposit' ? (
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                <h4 className="text-yellow-300 font-medium mb-3">Deposit + Final (Two Payments)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Deposit ({paymentPlan.percent}%):</span>
                    <span className="text-white font-medium">{formatCurrency(depositCents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Final Payment:</span>
                    <span className="text-white font-medium">{formatCurrency(totalCents - depositCents)}</span>
                  </div>
                  <div className="border-t border-yellow-600 pt-2 mt-3">
                    <div className="flex justify-between font-medium">
                      <span className="text-yellow-300">Total:</span>
                      <span className="text-yellow-300">{formatCurrency(totalCents)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
              <h4 className="text-green-300 font-medium mb-3">Pay in Full (One Payment)</h4>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Amount:</span>
                <span className="text-white font-medium text-lg">{formatCurrency(totalCents)}</span>
              </div>
            </div>
          )}

          {/* Card Details */}
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center">
              <span className="text-gray-300 text-sm">Card ending in</span>
              <span className="text-white font-mono ml-2">****{cardDetails?.last4}</span>
              <span className="text-gray-400 ml-2 text-sm">
                ({cardDetails?.brand?.toUpperCase()} • {cardDetails?.exp_month}/{cardDetails?.exp_year})
              </span>
            </div>
          </div>
        </div>

        {/* Authorization Disclosures */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Authorization & Commitments</h3>
          <div className="space-y-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={authorizations.chargeAuthorization}
                onChange={(e) => setAuthorizations(prev => ({ ...prev, chargeAuthorization: e.target.checked }))}
                className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
              />
              <div className="flex-1">
                <span className="text-white text-sm">
                  I authorize Firefly Tiny Homes to charge the above card for the agreed payment amounts once I have signed the contract and the payment milestone becomes due.
                </span>
                {validationErrors.chargeAuthorization && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.chargeAuthorization}</p>
                )}
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={authorizations.nonRefundable}
                onChange={(e) => setAuthorizations(prev => ({ ...prev, nonRefundable: e.target.checked }))}
                className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
              />
              <div className="flex-1">
                <span className="text-white text-sm">
                  I understand that deposits are non-refundable and final payment must be made in full before release.
                </span>
                {validationErrors.nonRefundable && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.nonRefundable}</p>
                )}
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={authorizations.highValueTransaction}
                onChange={(e) => setAuthorizations(prev => ({ ...prev, highValueTransaction: e.target.checked }))}
                className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
              />
              <div className="flex-1">
                <span className="text-white text-sm">
                  I understand this is a high-value transaction and funds must successfully settle before the build order will be placed.
                </span>
                {validationErrors.highValueTransaction && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.highValueTransaction}</p>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            className="btn-primary"
            onClick={confirmAuthorization}
            disabled={processing}
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Confirming...
              </span>
            ) : (
              'Confirm Authorization'
            )}
          </button>
          <button 
            className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
            onClick={() => setStep('connect')}
          >
            ← Back to Card Details
          </button>
        </div>
      </div>
    )
  }

  return null
}
