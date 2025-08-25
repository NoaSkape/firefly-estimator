import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'
import analytics from '../../utils/analytics'
import FunnelProgress from '../../components/FunnelProgress'
import offlineQueue from '../../utils/offlineQueue'
import { navigateToStep, updateBuildStep } from '../../utils/checkoutNavigation'

export default function CashPayment() {
  const navigate = useNavigate()
  const { buildId } = useParams()
  const { getToken } = useAuth()
  const [build, setBuild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  // Payment form state
  const [paymentInfo, setPaymentInfo] = useState({
    paymentMethod: 'ach', // 'ach' or 'wire'
    accountType: 'checking', // 'checking' or 'savings'
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    bankName: '',
    billingAddress: {
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    termsAccepted: false,
    privacyAccepted: false
  })

  useEffect(() => {
    loadBuild()
  }, [buildId])

  async function loadBuild() {
    try {
      const token = await getToken()
      const res = await fetch(`/api/builds/${buildId}`, { 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      })
      if (res.ok) {
        const buildData = await res.json()
        setBuild(buildData)
        
        // Load existing payment info if available
        if (buildData.paymentInfo) {
          setPaymentInfo(prev => ({ ...prev, ...buildData.paymentInfo }))
        }
      }
    } catch (error) {
      addToast({ 
        type: 'error', 
        title: 'Error Loading Build',
        message: 'Unable to load build data. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(field, value) {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setPaymentInfo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setPaymentInfo(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  function validateForm() {
    const errors = []

    if (!paymentInfo.accountHolderName.trim()) {
      errors.push('Account holder name is required')
    }

    if (!paymentInfo.routingNumber.trim()) {
      errors.push('Routing number is required')
    } else if (paymentInfo.routingNumber.length !== 9) {
      errors.push('Routing number must be 9 digits')
    }

    if (!paymentInfo.accountNumber.trim()) {
      errors.push('Account number is required')
    }

    if (paymentInfo.accountNumber !== paymentInfo.confirmAccountNumber) {
      errors.push('Account numbers do not match')
    }

    if (!paymentInfo.bankName.trim()) {
      errors.push('Bank name is required')
    }

    if (!paymentInfo.billingAddress.address.trim()) {
      errors.push('Billing address is required')
    }

    if (!paymentInfo.billingAddress.city.trim()) {
      errors.push('City is required')
    }

    if (!paymentInfo.billingAddress.state.trim()) {
      errors.push('State is required')
    }

    if (!paymentInfo.billingAddress.zip.trim()) {
      errors.push('ZIP code is required')
    }

    if (!paymentInfo.termsAccepted) {
      errors.push('You must accept the terms and conditions')
    }

    if (!paymentInfo.privacyAccepted) {
      errors.push('You must accept the privacy policy')
    }

    return errors
  }

  async function savePaymentInfo() {
    const errors = validateForm()
    if (errors.length > 0) {
      addToast({
        type: 'error',
        title: 'Validation Errors',
        message: errors.join(', ')
      })
      return false
    }

    setSaving(true)
    try {
      const token = await getToken()
      
      const res = await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          paymentInfo: paymentInfo,
          step: 6 // Stay on step 6 since payment is not complete yet
        })
      })
      
      if (!res.ok) {
        addToast({ 
          type: 'error', 
          title: 'Save Failed',
          message: 'Could not save payment information. Please try again.'
        })
        return false
      }
      
      addToast({ 
        type: 'success', 
        title: 'Payment Information Saved',
        message: 'Your payment information has been saved securely.'
      })
      
      analytics.paymentInfoSaved(buildId, paymentInfo.paymentMethod)
      return true
      
    } catch (error) {
      if (!navigator.onLine) {
        offlineQueue.queueBuildUpdate(buildId, {
          paymentInfo: paymentInfo,
          step: 6
        }, await getToken())
        
        addToast({
          type: 'warning',
          title: 'Offline Mode',
          message: 'Payment information will be saved when you reconnect.'
        })
        return true
      } else {
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to save payment information. Please check your connection.'
        })
        return false
      }
    } finally {
      setSaving(false)
    }
  }

  async function continueToContract() {
    const saved = await savePaymentInfo()
    if (saved) {
      // Navigate to contract step (step 7)
      await updateBuildStep(buildId, 7, await getToken())
      analytics.stepChanged(buildId, 6, 7)
      navigate(`/checkout/${buildId}/agreement`)
    }
  }

  const handleFunnelNavigation = (stepName, stepIndex) => {
    navigateToStep(stepName, 'Payment Method', buildId, true, build, navigate, addToast)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading payment form...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <FunnelProgress 
        current="Payment Method" 
        isSignedIn={true} 
        onNavigate={handleFunnelNavigation}
        build={build}
        buildId={buildId}
      />
      <div className="max-w-3xl mx-auto">
        <h1 className="section-header">Cash / ACH Payment Information</h1>
        
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
          <div className="text-sm text-white">
            <strong>Important:</strong> Your payment information is collected securely and will not be charged until you complete the final confirmation step. You can review and modify your information at any time before finalizing your purchase.
          </div>
        </div>

        <div className="space-y-6">
          {/* Payment Method Selection */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Payment Method</h2>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ach"
                  checked={paymentInfo.paymentMethod === 'ach'}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className="mr-3"
                />
                <span className="text-white">ACH Transfer (Recommended)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="wire"
                  checked={paymentInfo.paymentMethod === 'wire'}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className="mr-3"
                />
                <span className="text-white">Wire Transfer</span>
              </label>
            </div>
          </div>

          {/* Bank Account Information */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Bank Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={paymentInfo.accountHolderName}
                  onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={paymentInfo.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="Bank of America"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Account Type
                </label>
                <select
                  value={paymentInfo.accountType}
                  onChange={(e) => handleInputChange('accountType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={paymentInfo.routingNumber}
                  onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="123456789"
                  maxLength="9"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Account Number
                </label>
                <input
                  type="password"
                  value={paymentInfo.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="••••••••••"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Confirm Account Number
                </label>
                <input
                  type="password"
                  value={paymentInfo.confirmAccountNumber}
                  onChange={(e) => handleInputChange('confirmAccountNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="••••••••••"
                />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Billing Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-white text-sm font-medium mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={paymentInfo.billingAddress.address}
                  onChange={(e) => handleInputChange('billingAddress.address', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={paymentInfo.billingAddress.city}
                  onChange={(e) => handleInputChange('billingAddress.city', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="New York"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={paymentInfo.billingAddress.state}
                  onChange={(e) => handleInputChange('billingAddress.state', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="NY"
                  maxLength="2"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={paymentInfo.billingAddress.zip}
                  onChange={(e) => handleInputChange('billingAddress.zip', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  placeholder="10001"
                />
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Terms & Conditions</h2>
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={paymentInfo.termsAccepted}
                  onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                  className="mr-3 mt-1"
                />
                <span className="text-white text-sm">
                  I agree to the <a href="/terms" className="text-yellow-400 hover:text-yellow-300 underline">Terms and Conditions</a> and authorize Firefly Tiny Homes to process my payment according to the terms of my purchase agreement.
                </span>
              </label>
              
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={paymentInfo.privacyAccepted}
                  onChange={(e) => handleInputChange('privacyAccepted', e.target.checked)}
                  className="mr-3 mt-1"
                />
                <span className="text-white text-sm">
                  I agree to the <a href="/privacy" className="text-yellow-400 hover:text-yellow-300 underline">Privacy Policy</a> and consent to the collection and processing of my personal information for payment processing purposes.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3">
          <button 
            className="btn-primary" 
            onClick={continueToContract}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Continue to Contract'}
          </button>
          <button 
            className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
            onClick={savePaymentInfo}
            disabled={saving}
          >
            Save & Continue Later
          </button>
          <button 
            className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
            onClick={() => navigate(`/checkout/${buildId}/payment-method`)}
          >
            ← Back to Payment Method
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-green-900/30 border border-green-600 rounded-lg">
          <div className="text-sm text-white">
            <strong>🔒 Secure Payment Processing:</strong> Your payment information is encrypted and stored securely. We use industry-standard security measures to protect your data. No charges will be made until you complete the final confirmation step.
          </div>
        </div>
      </div>
    </div>
  )
}
