import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from './ToastProvider'

export default function CreditCardPayment({ 
  buildId, 
  milestone, 
  onComplete,
  className = "",
  showTitle = true 
}) {
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [error, setError] = useState(null)

  const formatCurrency = (cents) => {
    if (!cents || isNaN(cents)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const loadPaymentDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await getToken()
      const res = await fetch(`/api/builds/${buildId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      if (!res.ok) {
        throw new Error('Failed to load payment details')
      }

      const build = await res.json()
      
      if (build.payment?.method !== 'card') {
        throw new Error('Credit card payment method not configured')
      }

      setPaymentDetails(build.payment)
    } catch (error) {
      console.error('Load payment details error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const processPayment = async () => {
    setProcessing(true)
    setError(null)
    
    try {
      const token = await getToken()
      const res = await fetch('/api/payments/process-card-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          buildId,
          milestone
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Payment processing failed')
      }

      const data = await res.json()

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Payment Successful',
          message: `Your ${milestone} payment has been processed successfully.`
        })
        
        if (onComplete) {
          onComplete(data)
        }
      } else if (data.status === 'requires_action') {
        // Handle 3D Secure authentication
        addToast({
          type: 'info',
          title: 'Authentication Required',
          message: 'Your bank requires additional verification. Please complete the authentication.'
        })
        // In a real implementation, you would handle the 3D Secure flow here
      } else {
        throw new Error(data.message || 'Payment processing failed')
      }
      
    } catch (error) {
      console.error('Process payment error:', error)
      setError(error.message)
      addToast({
        type: 'error',
        title: 'Payment Failed',
        message: error.message || 'Unable to process payment. Please try again.'
      })
    } finally {
      setProcessing(false)
    }
  }

  // Load payment details on mount
  useState(() => {
    if (buildId && milestone) {
      loadPaymentDetails()
    }
  }, [buildId, milestone])

  if (!buildId || !milestone) {
    return (
      <div className={`bg-red-900/30 border border-red-600 rounded-lg p-4 ${className}`}>
        <p className="text-red-200">Invalid payment configuration</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-white font-semibold text-xl mb-3">
            Credit Card Payment
          </h2>
          <p className="text-gray-300 text-sm">
            {milestone === 'deposit' && 'Complete your deposit payment to start the build process.'}
            {milestone === 'final' && 'Complete your final payment to release your home for delivery.'}
            {milestone === 'full' && 'Complete your full payment to start the build and delivery process.'}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-red-400 text-xl mr-3">❌</span>
            <div className="flex-1">
              <div className="font-medium text-red-200">{error}</div>
              <button
                type="button"
                onClick={loadPaymentDetails}
                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-3"></div>
          <p className="text-gray-300">Loading payment details...</p>
        </div>
      )}

      {paymentDetails && !loading && (
        <div className="space-y-6">
          {/* Payment Amount */}
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
            <h3 className="text-yellow-300 font-semibold text-lg mb-4">Payment Amount</h3>
            <div className="flex justify-between items-center py-3 px-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <span className="text-yellow-200 font-medium">
                {milestone === 'deposit' ? 'Deposit Amount:' : 
                 milestone === 'final' ? 'Final Payment:' : 
                 'Total Amount:'}
              </span>
              <span className="text-yellow-400 font-bold text-xl">
                {milestone === 'deposit' && formatCurrency(paymentDetails.amounts?.deposit)}
                {milestone === 'final' && formatCurrency(paymentDetails.amounts?.final)}
                {milestone === 'full' && formatCurrency(paymentDetails.amounts?.total)}
              </span>
            </div>
          </div>

          {/* Card Details */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Payment Method</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-gray-300 text-sm">Card ending in</span>
                  <span className="text-white font-mono ml-2">****{paymentDetails.card?.cardDetails?.last4}</span>
                  <span className="text-gray-400 ml-2 text-sm">
                    ({paymentDetails.card?.cardDetails?.brand?.toUpperCase()} • {paymentDetails.card?.cardDetails?.exp_month}/{paymentDetails.card?.cardDetails?.exp_year})
                  </span>
                </div>
                <span className="text-green-400 text-sm">✓ Verified</span>
              </div>
              <div className="mt-2 text-gray-400 text-sm">
                {paymentDetails.card?.cardholderName}
              </div>
            </div>
          </div>

          {/* Processing Information */}
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
            <div className="text-blue-200">
              <div className="font-semibold text-sm mb-2">💳 Payment Processing</div>
              <ul className="text-xs space-y-1">
                <li>• Your payment will be processed immediately upon confirmation</li>
                <li>• You'll receive an email confirmation once payment is complete</li>
                <li>• Processing fees may apply as disclosed during setup</li>
                <li>• Funds must successfully settle before build/release authorization</li>
                {milestone === 'final' && (
                  <li className="text-yellow-200 font-medium">• Delivery must occur within 12 days after completion; storage charges apply thereafter</li>
                )}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button 
              className="btn-primary w-full"
              onClick={processPayment}
              disabled={processing}
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Processing Payment...
                </span>
              ) : (
                `Confirm & Pay ${
                  milestone === 'deposit' ? formatCurrency(paymentDetails.amounts?.deposit) :
                  milestone === 'final' ? formatCurrency(paymentDetails.amounts?.final) :
                  formatCurrency(paymentDetails.amounts?.total)
                }`
              )}
            </button>

            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-300 text-sm text-center">
                By clicking "Confirm & Pay", you authorize the charge to your saved credit card and agree to the terms established in your signed contract.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
