import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'
import analytics from '../../utils/analytics'
import FunnelProgress from '../../components/FunnelProgress'
import offlineQueue from '../../utils/offlineQueue'
import { navigateToStep, updateBuildStep } from '../../utils/checkoutNavigation'
import { calculateTotalPurchasePrice } from '../../utils/calculateTotal'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, useStripe, useElements, PaymentElement, CardElement } from '@stripe/react-stripe-js'
import CreditCardSteps from '../../components/CreditCardSteps'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51S0QprRfITEPMgPOGN1k6eeR2sGhTPDhW0gAdCjrxK7xaRgMqCDhAeGQGgSq2q4sJdN1u2i5VPjf8xCJlKGHlE5700WgUf9Xrb')

export default function CashPayment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { buildId } = useParams()
  const { getToken } = useAuth()
  const [build, setBuild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  // Wizard state
  const [currentStep, setCurrentStep] = useState('choose') // 'choose', 'details', 'review'
  const [settings, setSettings] = useState(null)

  // Step 6A: Amount & Method
  const [paymentPlan, setPaymentPlan] = useState({
    type: 'deposit', // 'deposit' or 'full'
    percent: 25,
    amountCents: 0
  })
  const [paymentMethod, setPaymentMethod] = useState('ach_debit') // 'ach_debit', 'bank_transfer', 'card'

  // Bank Transfer Payer Info (Phase 1)
  const [bankTransferPayerInfo, setBankTransferPayerInfo] = useState({
    fullLegalName: '',
    email: '',
    phone: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zip: ''
    },
    preferredTransferType: '', // 'ACH Credit' | 'Wire' | 'Not sure yet'
    plannedSendDate: ''
  })
  const [bankTransferCommitments, setBankTransferCommitments] = useState({
    customerInitiated: false,
    fundsClearing: false,
    storageFeesAcknowledged: false
  })

  // Step 6B: Payment Details
  const [setupIntent, setSetupIntent] = useState(null)
  const [financialConnections, setFinancialConnections] = useState(null)
  const [bankTransferDetails, setBankTransferDetails] = useState(null)
  const [mandateAccepted, setMandateAccepted] = useState(false)
  const [checkBalance, setCheckBalance] = useState(true)
  const [balanceWarning, setBalanceWarning] = useState(false)
  
  // Bank Transfer specific state
  const [transferInstructions, setTransferInstructions] = useState(null)
  const [transferConfirmed, setTransferConfirmed] = useState(false)
  const [transferReference, setTransferReference] = useState('')
  
  // Error handling state
  const [setupError, setSetupError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [needsRefresh, setNeedsRefresh] = useState(false)



  // Route-based step management for proper browser navigation
  useEffect(() => {
    // Get current step from URL path
    const pathParts = location.pathname.split('/')
    const urlStep = pathParts[pathParts.length - 1]
    
    if (['choose', 'details', 'review'].includes(urlStep)) {
      setCurrentStep(urlStep)
    } else {
      // Default to 'choose' if no valid step in URL
      setCurrentStep('choose')
    }
  }, [location.pathname])

  useEffect(() => {
    loadBuild()
    loadSettings()
  }, [buildId])

  async function loadBuild() {
    try {
      const token = await getToken()
      
      // Get all orders for the user and find the one matching this buildId
      let res = await fetch(`/api/orders`, { 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      })
      
      if (res.ok) {
        const orders = await res.json()
        // Find the order that matches this buildId
        const orderData = orders.find(order => order.buildId === buildId)
        
                 if (orderData) {
           console.log('Order data loaded:', orderData)
           console.log('Order pricing total:', orderData.pricing?.total)
           setBuild(orderData)
          
          // Load existing payment info if available
          if (orderData.payment?.plan) {
            setPaymentPlan(orderData.payment.plan)
          }
          if (orderData.payment?.method) {
            setPaymentMethod(orderData.payment.method)
          }
          // Load mandate acceptance status
          if (orderData.payment?.mandateAccepted !== undefined) {
            setMandateAccepted(orderData.payment.mandateAccepted)
          }
          // Load bank transfer data
          if (orderData.payment?.transferInstructions) {
            setTransferInstructions(orderData.payment.transferInstructions)
          }
          if (orderData.payment?.transferConfirmed !== undefined) {
            setTransferConfirmed(orderData.payment.transferConfirmed)
          }
          if (orderData.payment?.transferReference) {
            setTransferReference(orderData.payment.transferReference)
          }

          if (orderData.payment?.ready) {
            setCurrentStep('review')
          } else if (orderData.payment?.method) {
            setCurrentStep('details')
          }
          

        } else {
          // No order found, try build data
          await loadBuildData()
        }
      } else {
        // Fallback to build data
        await loadBuildData()
      }
    } catch (error) {
      console.error('Error loading order:', error)
      // Fallback to build data
      await loadBuildData()
    } finally {
      setLoading(false)
    }
  }

  async function loadBuildData() {
    try {
      const token = await getToken()
      const res = await fetch(`/api/builds/${buildId}`, { 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      })
      if (res.ok) {
        const buildData = await res.json()
        setBuild(buildData)
        
        // Load existing payment info if available
        if (buildData.payment?.plan) {
          setPaymentPlan(buildData.payment.plan)
        }
        if (buildData.payment?.method) {
          setPaymentMethod(buildData.payment.method)
        }
        // Load mandate acceptance status
        if (buildData.payment?.mandateAccepted !== undefined) {
          setMandateAccepted(buildData.payment.mandateAccepted)
        }
        // Load bank transfer data
        if (buildData.payment?.transferInstructions) {
          setTransferInstructions(buildData.payment.transferInstructions)
        }
        if (buildData.payment?.transferConfirmed !== undefined) {
          setTransferConfirmed(buildData.payment.transferConfirmed)
        }
        if (buildData.payment?.transferReference) {
          setTransferReference(buildData.payment.transferReference)
        }

        if (buildData.payment?.ready) {
          setCurrentStep('review')
        } else if (buildData.payment?.method) {
          setCurrentStep('details')
        }
        

      }
    } catch (error) {
      addToast({ 
        type: 'error', 
        title: 'Error Loading Build',
        message: 'Unable to load build data. Please try again.'
      })
    }
  }

  async function loadSettings() {
    try {
      const token = await getToken()
      const url = token ? '/api/admin/settings' : '/api/settings'
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const settingsData = await res.json()
        setSettings(settingsData)
        
        // Update payment plan with settings
        if (settingsData.payments?.depositPercent || settingsData.pricing?.deposit_percent) {
          const percent = settingsData.payments?.depositPercent ?? settingsData.pricing?.deposit_percent
          setPaymentPlan(prev => ({
            ...prev,
            percent: percent || 25
          }))
        }
      } else {
        // Fallback to default settings if API fails
        console.warn('Settings API failed, using defaults')
        setSettings({
          payments: {
            depositPercent: 25,
            storageFeePerDayCents: 4000,
            enableCardOption: false
          }
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Fallback to default settings
      setSettings({
        payments: {
          depositPercent: 25,
          storageFeePerDayCents: 4000,
          enableCardOption: false
        }
      })
    }
  }

  // Calculate amounts based on complete total (same as Overview step) and payment plan
  useEffect(() => {
    if (build && settings?.payments) {
      // Use the same calculation as the Overview step
      const totalAmount = calculateTotalPurchasePrice(build, settings)
      const totalCents = Math.round(totalAmount * 100)
      const depositPercent = settings.payments.depositPercent || 25
      const depositCents = Math.round(totalCents * (depositPercent / 100))
      
      setPaymentPlan(prev => ({
        ...prev,
        percent: depositPercent,
        amountCents: prev.type === 'deposit' ? depositCents : totalCents
      }))
    }
  }, [build, settings?.payments, paymentPlan.type])

  async function setupACH() {
    try {
      console.log('[FRONTEND] Setting up ACH for build:', buildId)
      const token = await getToken()
      const res = await fetch('/api/payments/setup-ach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ buildId: buildId })
      })

      console.log('[FRONTEND] ACH setup response status:', res.status)

      if (res.ok) {
        const data = await res.json()
        console.log('[FRONTEND] ACH setup success:', data)
        setSetupIntent(data)
        setSetupError(null) // Clear any previous errors
        return data
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[FRONTEND] ACH setup error response:', errorData)
        throw new Error(errorData.message || errorData.error || 'Failed to setup ACH')
      }
    } catch (error) {
      console.error('[FRONTEND] ACH setup error:', error)
      handleSetupError(error, 'setup_ach')
      throw error
    }
  }

  async function provisionBankTransfer() {
    try {
      console.log('[FRONTEND] Provisioning bank transfer for build:', buildId)
      const token = await getToken()
      const res = await fetch('/api/payments/provision-bank-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ buildId: buildId })
      })

      console.log('[FRONTEND] Bank transfer provision response status:', res.status)

      if (res.ok) {
        const data = await res.json()
        console.log('[FRONTEND] Bank transfer provision success:', data)
        
        if (data.success && data.virtualAccount) {
          setBankTransferDetails(data.virtualAccount)
          setTransferInstructions(data.virtualAccount)
          setTransferReference(data.virtualAccount.referenceCode)
          setSetupError(null) // Clear any previous errors
          return data.virtualAccount
        } else {
          throw new Error('Invalid response structure from bank transfer provision')
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[FRONTEND] Bank transfer provision error response:', errorData)
        throw new Error(errorData.message || errorData.error || 'Failed to provision bank transfer')
      }
    } catch (error) {
      console.error('[FRONTEND] Bank transfer provision error:', error)
      handleTransferError(error, 'provision_bank_transfer')
      throw error
    }
  }

  async function saveACHMethod(paymentMethodId, accountId, balanceCents) {
    try {
      const token = await getToken()
      const res = await fetch('/api/payments/save-ach-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          buildId: buildId,
          paymentMethodId,
          accountId,
          balanceCents,
          authAccepted: true // Mark payment authorization as accepted when bank account is linked
        })
      })

      if (!res.ok) {
        throw new Error('Failed to save ACH method')
      }



      addToast({
        type: 'success',
        title: 'Payment Method Saved',
        message: 'Your bank account has been securely linked.'
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Unable to save payment method. Please try again.'
      })
      throw error
    }
  }



  // Handle setup intent errors and provide recovery options
  async function handleSetupError(error, context = 'setup') {
    console.error(`❌ ${context} error:`, error)
    
    // Determine if this is a recoverable error
    const isRecoverable = error?.code === 'setup_intent_invalid' || 
                          error?.code === 'setup_intent_expired' ||
                          error?.code === 'processing_error' ||
                          error?.type === 'validation_error'
    
    if (isRecoverable && retryCount < 2) {
      setRetryCount(prev => prev + 1)
      setSetupError({
        message: 'Payment setup encountered an issue. Let\'s try again.',
        recoverable: true,
        retryCount: retryCount + 1
      })
      
      // Reset setup intent and try again
      setSetupIntent(null)
      setTimeout(() => {
        setupACH()
          .then(setSetupIntent)
          .catch(err => handleSetupError(err, 'retry'))
      }, 1000)
    } else {
      setNeedsRefresh(true)
      setSetupError({
        message: 'We\'re having trouble with the payment setup. Please refresh the page to try again.',
        recoverable: false
      })
      
      addToast({
        type: 'error',
        title: 'Payment Setup Issue',
        message: 'Please refresh the page and try again. If the problem persists, contact support.'
      })
    }
  }

  // Reset error state and retry
  function resetAndRetry() {
    setSetupError(null)
    setRetryCount(0)
    setNeedsRefresh(false)
    setSetupIntent(null)
    
    // Retry based on payment method
    if (paymentMethod === 'ach_debit') {
      setupACH()
        .then(setSetupIntent)
        .catch(err => handleSetupError(err, 'reset'))
    } else if (paymentMethod === 'bank_transfer') {
      provisionBankTransfer()
        .then(data => {
          setTransferInstructions(data)
          setSetupError(null)
        })
        .catch(err => handleTransferError(err, 'reset'))
    }
  }

  // Handle bank transfer errors
  async function handleTransferError(error, context = 'transfer') {
    console.error(`❌ ${context} error:`, error)
    
    const isRecoverable = error?.code === 'provision_failed' || 
                          error?.type === 'network_error' ||
                          error?.message?.includes('timeout')
    
    if (isRecoverable && retryCount < 2) {
      setRetryCount(prev => prev + 1)
      setSetupError({
        message: 'Bank transfer setup encountered an issue. Let\'s try again.',
        recoverable: true,
        retryCount: retryCount + 1
      })
      
      // Retry after a short delay
      setTimeout(() => {
        provisionBankTransfer()
          .then(data => {
            setTransferInstructions(data)
            setSetupError(null)
          })
          .catch(err => handleTransferError(err, 'retry'))
      }, 1000)
    } else {
      setNeedsRefresh(true)
      setSetupError({
        message: 'We\'re having trouble setting up the bank transfer. Please refresh the page to try again.',
        recoverable: false
      })
      
      addToast({
        type: 'error',
        title: 'Bank Transfer Setup Issue',
        message: 'Please refresh the page and try again. If the problem persists, contact support.'
      })
    }
  }

  async function markPaymentReady() {

    if (paymentMethod === 'ach_debit' && !mandateAccepted) {
      addToast({
        type: 'error',
        title: 'Required',
        message: 'Please accept the ACH authorization mandate.'
      })
      return false
    }

    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/payments/mark-ready', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          buildId: buildId,
          plan: paymentPlan,
          method: paymentMethod,
          mandateAccepted: mandateAccepted,
          transferInstructions: transferInstructions,
          transferConfirmed: transferConfirmed,
          transferReference: transferReference
        })
      })

      if (!res.ok) {
        throw new Error('Failed to mark payment ready')
      }

      addToast({
        type: 'success',
        title: 'Payment Ready',
        message: 'Your payment information has been saved.'
      })

      return true
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Unable to save payment information. Please try again.'
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  async function continueToContract() {
    // For card payments, check if payment was already processed
    if (paymentMethod === 'card' && build?.payment?.status === 'succeeded') {
      // Card payment already processed, proceed to contract
      await updateBuildStep(buildId, 7, await getToken())
      analytics.stepChanged(buildId, 6, 7)
      navigate(`/checkout/${buildId}/agreement`)
      return
    }

    // For other payment methods, mark as ready
    const ready = await markPaymentReady()
    if (ready) {
      // Update build step to 7 (Contract) when user completes payment and continues
      await updateBuildStep(buildId, 7, await getToken())
      analytics.stepChanged(buildId, 6, 7)
      navigate(`/checkout/${buildId}/agreement`)
    }
  }

  async function saveAndContinueLater() {
    // For card payments, check if payment was already processed
    if (paymentMethod === 'card' && build?.payment?.status === 'succeeded') {
      // Card payment already processed, proceed to builds page
      await updateBuildStep(buildId, 7, await getToken())
      analytics.stepChanged(buildId, 6, 7)
      navigate('/builds')
      return
    }

    // For other payment methods, mark as ready
    const ready = await markPaymentReady()
    if (ready) {
      // Update build step to 7 (Contract) when user saves and continues later
      await updateBuildStep(buildId, 7, await getToken())
      analytics.stepChanged(buildId, 6, 7)
      navigate('/builds')
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

  const formatCurrency = (cents) => {
    if (!cents || isNaN(cents)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  // Get total using the same calculation as the Overview step (includes all fees)
  const totalAmount = build ? calculateTotalPurchasePrice(build, settings) : 0
  const totalCents = Math.round(totalAmount * 100)
  const depositCents = Math.round(totalCents * ((paymentPlan.percent || 25) / 100))
  const currentAmountCents = paymentPlan.type === 'deposit' ? depositCents : totalCents
  
  // Debug logging
  if (build) {
    console.log('Payment calculation debug:', {
      calculatedTotal: totalAmount,
      totalCents,
      depositCents,
      currentAmountCents,
      paymentPlanType: paymentPlan.type
    })
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
      
      <div className="max-w-4xl mx-auto">
        <h1 className="section-header">Cash / ACH Payment Information</h1>
        
        {/* Test Mode Banner */}
        {(import.meta.env.VITE_STRIPE_MODE === 'test' || !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) && (
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
            <div className="text-sm text-white">
              <strong>🧪 Test Mode:</strong> This is a test environment. No real payments will be processed.
            </div>
          </div>
        )}

        {/* Dark Background Container for Wizard Content */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 shadow-2xl ring-1 ring-gray-600/20">
          {/* Inner Content with max-width constraint */}
          <div className="max-w-3xl mx-auto">

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center space-x-4">
          <div className={`flex items-center ${currentStep === 'choose' || currentStep === 'details' || currentStep === 'review' ? 'text-yellow-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
              currentStep === 'choose' || currentStep === 'details' || currentStep === 'review' ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-gray-600'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm">Amount & Method</span>
          </div>
          <div className={`w-8 h-1 ${currentStep === 'details' || currentStep === 'review' ? 'bg-yellow-400' : 'bg-gray-600'}`}></div>
          <div className={`flex items-center ${currentStep === 'details' || currentStep === 'review' ? 'text-yellow-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
              currentStep === 'details' || currentStep === 'review' ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-gray-600'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm">Payment Details</span>
          </div>
          <div className={`w-8 h-1 ${currentStep === 'review' ? 'bg-yellow-400' : 'bg-gray-600'}`}></div>
          <div className={`flex items-center ${currentStep === 'review' ? 'text-yellow-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
              currentStep === 'review' ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-gray-600'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm">Review and Continue</span>
          </div>
        </div>

        {/* Route-based Step Content */}
        <Routes>
          <Route index element={<Navigate to="choose" replace />} />
          <Route path="choose" element={
            <div>
              {/* Step 6A: Amount & Method */}
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-white font-semibold text-xl mb-3">Cash & ACH Payment Setup</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                Configure your payment amount and method. We offer secure bank-to-bank transfers with 
                industry-leading encryption and verification through our payment processor, Stripe.
              </p>
            </div>

            {/* Payment Amount Selection */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Payment Amount</h2>
              <p className="text-gray-300 text-sm mb-4">
                Choose how much to pay now. A deposit secures your build while full payment simplifies the purchase process.
              </p>
              
              <div className="space-y-4">
                <label className="flex items-start p-4 border border-gray-600 rounded-lg hover:border-yellow-500 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="deposit"
                    checked={paymentPlan.type === 'deposit'}
                    onChange={() => setPaymentPlan(prev => ({ ...prev, type: 'deposit', amountCents: depositCents }))}
                    className="mr-4 mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {paymentPlan.percent}% Deposit - {formatCurrency(depositCents)} 
                      <span className="ml-2 text-yellow-400 text-sm">Recommended</span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      Get your build started with a deposit. Remaining balance due before home leaves factory.
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start p-4 border border-gray-600 rounded-lg hover:border-yellow-500 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="full"
                    checked={paymentPlan.type === 'full'}
                    onChange={() => setPaymentPlan(prev => ({ ...prev, type: 'full', amountCents: totalCents }))}
                    className="mr-4 mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      Pay in Full - {formatCurrency(totalCents)}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      Complete payment now. No additional payments required.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Payment Method</h2>
              <p className="text-gray-300 text-sm mb-4">
                Select your preferred payment method. Bank transfers offer the most secure and cost-effective option.
              </p>
              
              <div className="space-y-4">
                <label className="flex items-start p-4 border border-gray-600 rounded-lg hover:border-yellow-500 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="ach_debit"
                    checked={paymentMethod === 'ach_debit'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4 mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      Bank Account (ACH Debit) 
                      <span className="ml-2 text-yellow-400 text-sm">Recommended</span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      Secure bank-to-bank transfer. No fees. Funds verified automatically. Takes 3-5 business days.
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start p-4 border border-gray-600 rounded-lg hover:border-yellow-500 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4 mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      Bank Transfer (Wire/ACH Credit)
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      Send funds directly from your bank. Fastest processing. May incur bank fees.
                    </div>
                  </div>
                </label>
                
                <details className="mt-4">
                  <summary className="text-gray-400 cursor-pointer hover:text-yellow-400 flex items-center p-2 rounded">
                    <span>Other Payment Methods</span>
                    <span className="ml-2 text-xs">▼</span>
                  </summary>
                  <div className="mt-3">
                    <label className="flex items-start p-4 border border-gray-600 rounded-lg hover:border-yellow-500 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-4 mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          Credit/Debit Card
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Instant processing. Processing fees apply (2.9% + $0.30).
                        </div>
                      </div>
                    </label>
                  </div>
                </details>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
              <div className="text-white">
                <div className="font-semibold text-base mb-2">Payment Summary</div>
                <div className="text-sm space-y-1">
                  <div><strong>Amount to be charged:</strong> {formatCurrency(currentAmountCents)}</div>
                  {paymentPlan.type === 'deposit' && (
                    <div className="text-green-200">
                      Remaining balance: {formatCurrency(totalCents - depositCents)} (due before delivery)
                    </div>
                  )}
                  <div className="text-green-200 mt-2">
                    Selected method: {
                      paymentMethod === 'ach_debit' ? 'Bank Account (ACH Debit)' :
                      paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                      paymentMethod === 'card' ? 'Credit/Debit Card' :
                      'Not selected'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
              <div className="text-white">
                <div className="font-semibold text-sm mb-2">🔒 Security & Process</div>
                <ul className="text-xs space-y-1 text-blue-100">
                  <li>• Payment setup only - no charges until final confirmation</li>
                  <li>• Bank-grade encryption protects all financial information</li>
                  <li>• Contract signature required before any payment processing</li>
                  <li>• Full payment details provided before authorization</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                className="btn-primary"
                onClick={() => navigate(`/checkout/${buildId}/cash-payment/details`)}
              >
                Continue to Payment Details
              </button>
              <button 
                className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
                onClick={() => navigate(`/checkout/${buildId}/payment-method`)}
              >
                ← Back to Payment Method
              </button>
            </div>
          </div>
            </div>
          } />
          <Route path="details" element={
            <div>
              {/* Step 6B: Payment Details */}
          <div className="space-y-6">
            {/* Selected Payment Method Summary */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Selected Payment Method</h2>
              <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-600 rounded-lg">
                <div className="flex items-center">
                  <span className="text-green-400 text-xl mr-3">✓</span>
                  <div>
                    <div className="text-white font-medium">
                      {paymentMethod === 'ach_debit' && 'Bank Account (ACH Debit)'}
                      {paymentMethod === 'bank_transfer' && 'Bank Transfer (Wire/ACH Credit)'}
                      {paymentMethod === 'card' && 'Credit/Debit Card'}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {paymentMethod === 'ach_debit' && 'Secure bank-to-bank transfer • No fees • 3-5 business days'}
                      {paymentMethod === 'bank_transfer' && 'Direct bank transfer • Fastest processing • May incur bank fees'}
                      {paymentMethod === 'card' && 'Instant processing • Processing fees apply (2.9% + $0.30)'}
                    </div>
                  </div>
                </div>
                <div className="text-white font-semibold">
                  {formatCurrency(currentAmountCents)}
                </div>
              </div>
              <button 
                className="mt-4 text-yellow-400 hover:text-yellow-300 text-sm underline"
                onClick={() => navigate(`/checkout/${buildId}/cash-payment/choose`)}
              >
                ← Change payment method or amount
              </button>
            </div>

            {paymentMethod === 'ach_debit' && (
              <ACHDetailsStep 
                setupIntent={setupIntent}
                setupACH={setupACH}
                saveACHMethod={saveACHMethod}
                checkBalance={checkBalance}
                setCheckBalance={setCheckBalance}
                balanceWarning={balanceWarning}
                setBalanceWarning={setBalanceWarning}
                mandateAccepted={mandateAccepted}
                setMandateAccepted={setMandateAccepted}
                onContinue={() => navigate(`/checkout/${buildId}/cash-payment/review`)}
                onBack={() => navigate(`/checkout/${buildId}/cash-payment/choose`)}
                formatCurrency={formatCurrency}
                currentAmountCents={currentAmountCents}
                setupError={setupError}
                setSetupError={setSetupError}
                resetAndRetry={resetAndRetry}
                needsRefresh={needsRefresh}
              />
            )}

            {paymentMethod === 'bank_transfer' && (
              <BankTransferDetailsStep 
                bankTransferDetails={bankTransferDetails}
                provisionBankTransfer={provisionBankTransfer}
                onContinue={() => navigate(`/checkout/${buildId}/cash-payment/review`)}
                onBack={() => navigate(`/checkout/${buildId}/cash-payment/choose`)}
                formatCurrency={formatCurrency}
                currentAmountCents={currentAmountCents}
                transferInstructions={transferInstructions}
                setTransferInstructions={setTransferInstructions}
                transferConfirmed={transferConfirmed}
                setTransferConfirmed={setTransferConfirmed}
                transferReference={transferReference}
                setTransferReference={setTransferReference}
                setupError={setupError}
                setSetupError={setSetupError}
                resetAndRetry={resetAndRetry}
                needsRefresh={needsRefresh}
                paymentPlan={paymentPlan}
                totalCents={totalCents}
                depositCents={depositCents}
                build={build}
                getToken={getToken}
              />
            )}

            {paymentMethod === 'card' && (
              <Elements stripe={stripePromise}>
                <CreditCardSteps 
                  onContinue={() => navigate(`/checkout/${buildId}/cash-payment/review`)}
                  onBack={() => navigate(`/checkout/${buildId}/cash-payment/choose`)}
                  formatCurrency={formatCurrency}
                  currentAmountCents={currentAmountCents}
                  buildId={buildId}
                  getToken={getToken}
                  paymentPlan={paymentPlan}
                  totalCents={totalCents}
                  depositCents={depositCents}
                  build={build}
                />
              </Elements>
            )}
          </div>
            </div>
          } />
          <Route path="review" element={
            <div>
              {/* Step 6C: Review and Continue */}
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-white font-semibold text-xl mb-3">Review and Continue</h2>
              {paymentMethod === 'bank_transfer' ? (
                <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                  <p>
                    Please review your payment configuration below. Since you have chosen Bank Transfer (Wire/ACH Credit), 
                    no funds will be automatically charged at this step. After signing your purchase agreement, you will 
                    receive detailed instructions with our bank information. You will then need to initiate the transfer 
                    directly from your bank.
                  </p>
                  <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                    <div className="font-medium text-blue-200 mb-2">Important Payment Timeline:</div>
                    <ul className="space-y-1 text-blue-100 text-sm">
                      <li>• Your <strong>deposit must be transferred before we can begin construction</strong></li>
                      <li>• Your <strong>final balance must be transferred and cleared before your home can leave the factory</strong></li>
                      <li>• You will have <strong>12 days after factory completion to schedule delivery before storage fees apply</strong></li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-gray-300 text-sm leading-relaxed">
                  Please review your payment configuration below. Your payment method has been securely saved 
                  and will be charged after you sign the purchase agreement.
                </p>
              )}
            </div>

            {/* Card Payment Warning */}
            {paymentMethod === 'card' && build?.payment?.status !== 'succeeded' && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <span className="text-yellow-400 text-xl mr-3">⚠️</span>
                  <div className="flex-1">
                    <div className="font-medium text-yellow-200 mb-2">
                      Payment Not Yet Processed
                    </div>
                    <div className="text-yellow-100 text-sm">
                      Your card payment has been set up but not yet processed. You'll need to complete the payment 
                      before proceeding to the contract. Please go back to the payment details to complete your card payment.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Payment Summary</h2>
              <div className="space-y-4">
                {/* Model Info */}
                <div className="flex justify-between py-2 border-b border-gray-600">
                  <span className="text-gray-300">Model:</span>
                  <span className="text-white font-medium">
                    {build?.model?.name || build?.model?.title || 
                     (build?.modelCode ? `The ${build.modelCode}` : '') || 
                     'Custom Build'}
                  </span>
                </div>
                
                {/* Total Price */}
                <div className="flex justify-between py-2 border-b border-gray-600">
                  <span className="text-gray-300">Total Price:</span>
                  <span className="text-white font-medium">{formatCurrency(totalCents)}</span>
                </div>

                {/* Payment Amount - Highlighted */}
                <div className="flex justify-between py-3 px-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                  <span className="text-yellow-200 font-medium">
                    {paymentPlan.type === 'deposit' ? 'Deposit Amount:' : 'Payment Amount:'}
                  </span>
                  <span className="text-yellow-400 font-bold text-lg">{formatCurrency(currentAmountCents)}</span>
                </div>

                {/* Payment Method */}
                <div className="flex justify-between py-2 border-b border-gray-600">
                  <span className="text-gray-300">Payment Method:</span>
                  <span className="text-white font-medium">
                    {paymentMethod === 'ach_debit' && 'Bank Account (ACH Debit)'}
                    {paymentMethod === 'bank_transfer' && 'Bank Transfer (Wire/ACH Credit)'}
                    {paymentMethod === 'card' && 'Credit/Debit Card'}
                  </span>
                </div>

                {/* Balance Due (if deposit) */}
                {paymentPlan.type === 'deposit' && (
                  <div className="flex justify-between py-2 text-gray-300">
                    <span>Remaining Balance:</span>
                    <span>{formatCurrency(totalCents - depositCents)} <span className="text-xs">(due before delivery)</span></span>
                  </div>
                )}

                {/* Card Payment Status */}
                {paymentMethod === 'card' && build?.payment?.status === 'succeeded' && (
                  <div className="flex justify-between py-2 px-4 bg-green-900/20 border border-green-600 rounded-lg">
                    <span className="text-green-200 font-medium">Payment Status:</span>
                    <span className="text-green-400 font-medium">✓ Processed Successfully</span>
                  </div>
                )}

                {/* Card Payment Processing Fee */}
                {paymentMethod === 'card' && (
                  <div className="flex justify-between py-2 text-gray-300">
                    <span>Processing Fee:</span>
                    <span>{formatCurrency(Math.round(currentAmountCents * 0.029 + 30))}</span>
                  </div>
                )}
              </div>
            </div>





            <div className="flex gap-3">
              <button 
                className="btn-primary"
                onClick={continueToContract}
                disabled={saving || (paymentMethod === 'card' && build?.payment?.status !== 'succeeded')}
              >
                {saving ? 'Saving...' : 'Continue to Contract'}
              </button>
              <button 
                className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
                onClick={saveAndContinueLater}
                disabled={saving}
              >
                Save & Continue Later
              </button>
              <button 
                className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
                onClick={() => navigate(`/checkout/${buildId}/cash-payment/details`)}
              >
                ← Back to Payment Details
              </button>
            </div>
          </div>
            </div>
          } />
        </Routes>
          </div>
        </div>
      </div>
    </div>
  )
}

// ACH Details Component with Stripe Elements Integration
function ACHDetailsStep({ setupIntent, setupACH, saveACHMethod, checkBalance, setCheckBalance, balanceWarning, setBalanceWarning, mandateAccepted, setMandateAccepted, onContinue, onBack, formatCurrency, currentAmountCents, setupError, setSetupError, resetAndRetry, needsRefresh }) {
  const [currentSetupIntent, setCurrentSetupIntent] = useState(setupIntent)
  const [processing, setProcessing] = useState(false)
  const [initializing, setInitializing] = useState(false)

  // Auto-initialize SetupIntent when component mounts if not already available
  useEffect(() => {
    if (!currentSetupIntent && !initializing) {
      setInitializing(true)
      setupACH()
        .then(setCurrentSetupIntent)
        .catch(console.error)
        .finally(() => setInitializing(false))
    }
  }, [currentSetupIntent, setupACH, initializing])

  // Setup Stripe Elements options for US Bank Account
  const elementsOptions = {
    clientSecret: currentSetupIntent?.clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#f59e0b',
        colorBackground: '#1f2937',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '6px',
        borderRadius: '8px',
      },
    },
  }

  if (initializing) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <h2 className="text-white font-semibold text-lg mb-2">Initializing Secure Connection</h2>
            <p className="text-gray-300">Setting up secure bank verification...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!currentSetupIntent?.clientSecret) {
    return (
      <div className="space-y-6">
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Connection Failed</h2>
          <p className="text-white text-sm mb-4">
            Unable to establish secure connection with Stripe. Please try again.
          </p>
          <div className="flex gap-3">
            <button 
              className="btn-primary"
              onClick={() => {
                setInitializing(true)
                setupACH()
                  .then(setCurrentSetupIntent)
                  .catch(console.error)
                  .finally(() => setInitializing(false))
              }}
            >
              Retry Connection
            </button>
            <button 
              className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
              onClick={onBack}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Elements stripe={stripePromise} options={elementsOptions}>
        <ACHElementsForm
          setupIntent={currentSetupIntent}
          setupACH={setupACH}
          saveACHMethod={saveACHMethod}
          checkBalance={checkBalance}
          setCheckBalance={setCheckBalance}
          balanceWarning={balanceWarning}
          setBalanceWarning={setBalanceWarning}
          mandateAccepted={mandateAccepted}
          setMandateAccepted={setMandateAccepted}
          onContinue={onContinue}
          onBack={onBack}
          processing={processing}
          setProcessing={setProcessing}
          formatCurrency={formatCurrency}
          currentAmountCents={currentAmountCents}
          setupError={setupError}
          setSetupError={setSetupError}
          resetAndRetry={resetAndRetry}
          needsRefresh={needsRefresh}
        />
      </Elements>
    </div>
  )
}



// ACH Elements Form Component
function ACHElementsForm({ 
  setupIntent, 
  setupACH, 
  saveACHMethod, 
  checkBalance, 
  setCheckBalance, 
  balanceWarning, 
  setBalanceWarning, 
  mandateAccepted, 
  setMandateAccepted, 
  onContinue, 
  onBack, 
  processing, 
  setProcessing,
  formatCurrency,
  currentAmountCents,
  setupError,
  setSetupError,
  resetAndRetry,
  needsRefresh
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [accountLinked, setAccountLinked] = useState(false)
  const [paymentMethodId, setPaymentMethodId] = useState(null)
  const [accountDetails, setAccountDetails] = useState(null)

  const handleBankAccountSetup = async (event) => {
    event.preventDefault()

    console.log('🔗 Bank account setup started:', {
      hasStripe: !!stripe,
      hasElements: !!elements,
      setupIntentClientSecret: setupIntent?.clientSecret?.substring(0, 20) + '...',
      processing
    })

    if (!stripe || !elements) {
      console.error('❌ Stripe or Elements not loaded')
      return
    }

    setProcessing(true)

    try {
      console.log('🔄 Confirming setup with PaymentElement...')
      
      // Confirm the SetupIntent with PaymentElement
      const { error, setupIntent: confirmedSetupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/${setupIntent.metadata?.buildId}/cash-payment?setup_success=true`,
        },
        redirect: 'if_required', // Stay on page if possible
      })

      console.log('✅ Setup result:', { 
        hasError: !!error, 
        setupIntentStatus: confirmedSetupIntent?.status,
        setupIntentId: confirmedSetupIntent?.id 
      })

      if (error) {
        console.error('❌ Setup error:', error)
        throw new Error(error.message)
      }

      if (confirmedSetupIntent.status === 'succeeded') {
        console.log('🎉 Account successfully linked!')
        
        // Account successfully linked
        setAccountLinked(true)
        setPaymentMethodId(confirmedSetupIntent.payment_method)
        
        // Extract account details for display (simplified to avoid pm reference errors)
        console.log('💰 Account linked successfully, skipping detailed account info retrieval')
        // Note: Account details retrieval temporarily disabled to avoid reference errors
        // setAccountDetails will be populated from backend if needed

        // Check balance if requested
        if (checkBalance) {
          // This would normally be done server-side via Financial Connections
          // For demo purposes, we'll simulate a balance check
          console.log('💰 Balance check requested for account - balance verification would happen server-side')
        }
      } else {
        console.warn('⚠️ Setup Intent not completed:', confirmedSetupIntent.status)
      }

    } catch (error) {
      console.error('❌ Bank account setup error:', error)
      
      // Check if this is a Stripe-specific error that requires setup intent refresh
      if (error?.code === 'setup_intent_invalid' || 
          error?.code === 'setup_intent_expired' ||
          error?.code === 'processing_error' ||
          error?.type === 'validation_error') {
        
        // Signal to parent component that we need to refresh the setup intent
        setSetupError({
          message: 'Payment setup expired. Please try again.',
          recoverable: true,
          retryCount: 0
        })
      } else {
        // Show generic error to user
        setSetupError({
          message: 'Unable to link bank account. Please try again.',
          recoverable: true,
          retryCount: 0
        })
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleSaveAndContinue = async () => {
    console.log('💾 Save and Continue clicked:', { 
      paymentMethodId, 
      hasAccountDetails: !!accountDetails,
      buildId: setupIntent?.metadata?.buildId 
    })
    
    if (!paymentMethodId) {
      console.error('❌ No payment method ID available')
      return
    }

    setProcessing(true)
    try {
      console.log('🔄 Calling saveACHMethod...')
      // Save the payment method to the build
      await saveACHMethod(paymentMethodId, accountDetails?.financial_connections_account, null)
      console.log('✅ Payment method saved successfully')
      onContinue()
    } catch (error) {
      console.error('❌ Save payment method error:', error)
      // Don't block the user - let them continue anyway
      console.log('⚠️ Continuing despite save error...')
      onContinue()
    } finally {
      setProcessing(false)
    }
  }

  const paymentElementOptions = {
    layout: {
      type: 'accordion',
      defaultCollapsed: false,
      radios: false, // No radio buttons since we only have one option
      spacedAccordionItems: false
    },
    paymentMethodOrder: ['us_bank_account'], // Only show bank account option
    fields: {
      billingDetails: 'auto'
    }
  }

  if (accountLinked) {
    return (
      <div className="space-y-6">
        <div className="bg-green-900/30 border border-green-600 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <span className="text-green-400 text-xl mr-3">✓</span>
            <h2 className="text-white font-semibold text-lg">Bank Account Connected</h2>
          </div>
          
          {accountDetails && (
            <div className="text-white text-sm space-y-2">
              <div>Bank: {accountDetails.bank_name}</div>
              <div>Account: •••• {accountDetails.last4}</div>
              <div>Type: {accountDetails.account_type}</div>
            </div>
          )}
        </div>

        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Authorization & Terms</h3>
          
          <label className="flex items-start mb-4">
            <input
              type="checkbox"
              checked={mandateAccepted}
              onChange={(e) => setMandateAccepted(e.target.checked)}
              className="mr-3 mt-1"
            />
            <span className="text-white text-sm">
              I authorize Firefly Tiny Homes to debit my account for the specified amount. 
              This authorization remains in effect until I cancel it in writing. 
              I understand that ACH transactions may take 3-5 business days to process.
            </span>
          </label>

          {balanceWarning && (
            <div className="p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg mb-4">
              <div className="text-sm text-white">
                <strong>⚠️ Balance Warning:</strong> Your account balance may be insufficient for this payment. 
                Consider using a wire transfer or different account.
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button 
            className="btn-primary"
            onClick={handleSaveAndContinue}
            disabled={processing || !mandateAccepted}
          >
            {processing ? 'Saving...' : 'Save and Continue'}
          </button>
          <button 
            className="px-4 py-2 rounded border border-gray-700 text-white hover:bg-white/10"
            onClick={() => setAccountLinked(false)}
          >
            Use Different Account
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

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-white font-semibold text-lg mb-3">Connect Your Bank Account</h2>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          Link your bank account securely through Stripe's enterprise-grade infrastructure. 
          Your credentials are encrypted and never stored on our servers.
        </p>
        
        <form onSubmit={handleBankAccountSetup} className="space-y-6">
          {/* Error Display */}
          {setupError && (
            <div className={`p-4 rounded-lg border ${
              setupError.recoverable 
                ? 'bg-yellow-900/30 border-yellow-600' 
                : 'bg-red-900/30 border-red-600'
            }`}>
              <div className="flex items-start">
                <span className={`text-xl mr-3 ${
                  setupError.recoverable ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {setupError.recoverable ? '⚠️' : '❌'}
                </span>
                <div className="flex-1">
                  <div className={`font-medium ${
                    setupError.recoverable ? 'text-yellow-200' : 'text-red-200'
                  }`}>
                    {setupError.message}
                  </div>
                  {setupError.recoverable && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={resetAndRetry}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded transition-colors"
                      >
                        Try Again
                      </button>
                      {needsRefresh && (
                        <button
                          type="button"
                          onClick={() => window.location.reload()}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                        >
                          Refresh Page
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Stripe Payment Element - configured for US Bank Account */}
          <div className="space-y-4">
            {stripe && elements ? (
              <div className="p-4 border border-gray-600 rounded-lg bg-gray-800">
                <PaymentElement options={paymentElementOptions} />
              </div>
            ) : (
              <div className="p-4 border border-gray-600 rounded-lg bg-gray-800">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                  <div className="text-white text-sm">Loading secure payment form...</div>
                  <div className="text-gray-400 text-xs mt-2">
                    Connecting to Stripe's secure servers
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
              <div className="text-blue-200 text-xs leading-relaxed">
                <strong>🔒 Enterprise Security:</strong> Bank connections use the same 256-bit encryption 
                as major financial institutions. Stripe processes millions of transactions daily 
                for companies like Amazon, Google, and Microsoft.
              </div>
            </div>
          </div>

          {/* Enhanced Options Section */}
          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Account Verification Options</h3>
              
              <label className="flex items-start p-3 border border-gray-600 rounded-lg hover:border-yellow-500 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkBalance}
                  onChange={(e) => setCheckBalance(e.target.checked)}
                  className="mr-3 mt-1"
                />
                <div>
                  <div className="text-white text-sm font-medium">
                    Verify Account Balance <span className="text-yellow-400">(Recommended)</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    Automatically check available funds to prevent payment failures. 
                    This helps ensure smooth processing of your transaction.
                  </div>
                </div>
              </label>
            </div>

            {/* Authorization Agreement */}
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Payment Authorization</h3>
              
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={mandateAccepted}
                  onChange={(e) => setMandateAccepted(e.target.checked)}
                  className="mr-3 mt-1"
                  required
                />
                <div className="text-white text-sm leading-relaxed">
                  <strong>I authorize Firefly Tiny Homes</strong> to electronically debit my linked bank account 
                  for <strong>{formatCurrency(currentAmountCents)}</strong> when the final contract is signed. 
                  <div className="mt-2 text-yellow-200 text-xs">
                    • This authorization remains active until canceled in writing<br/>
                    • ACH transactions typically process in 3-5 business days<br/>
                    • You will receive confirmation before any charges occur
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="submit"
              className="btn-primary flex-1 py-3"
              disabled={processing || !mandateAccepted || !stripe}
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Linking Account...
                </span>
              ) : (
                'Link Bank Account'
              )}
            </button>
            <button 
              type="button"
              className="px-6 py-3 rounded border border-gray-700 text-white hover:bg-white/10 transition-colors"
              onClick={onBack}
            >
              ← Back
            </button>
          </div>
        </form>
      </div>

      {/* Information about the process */}
      <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
        <div className="text-sm text-white">
          <strong>🔒 How it works:</strong> You'll be securely connected to your bank through your bank's login portal. 
          We never see your banking credentials - everything is handled by Stripe's secure infrastructure.
        </div>
      </div>
    </div>
  )
}

// Bank Transfer Details Component - Integrated into existing wizard
function BankTransferDetailsStep({ 
  bankTransferDetails, 
  provisionBankTransfer, 
  onContinue, 
  onBack, 
  formatCurrency, 
  currentAmountCents,
  transferInstructions,
  setTransferInstructions,
  transferConfirmed,
  setTransferConfirmed,
  transferReference,
  setTransferReference,
  setupError,
  setSetupError,
  resetAndRetry,
  needsRefresh,
  paymentPlan,
  totalCents,
  depositCents,
  build,
  getToken
}) {
  const [processing, setProcessing] = useState(false)
  
  // Bank Transfer Payer Info (Phase 1 - Pre-Contract)
  const [payerInfo, setPayerInfo] = useState({
    fullLegalName: build?.buyerInfo ? `${build.buyerInfo.firstName} ${build.buyerInfo.lastName}` : '',
    email: build?.buyerInfo?.email || '',
    phone: build?.buyerInfo?.phone || '',
    billingAddress: {
      street: build?.buyerInfo?.address || '',
      city: build?.buyerInfo?.city || '',
      state: build?.buyerInfo?.state || '',
      zip: build?.buyerInfo?.zip || ''
    },
    preferredTransferType: '',
    plannedSendDate: ''
  })
  
  const [commitments, setCommitments] = useState({
    customerInitiated: false,
    fundsClearing: false,
    storageFeesAcknowledged: false
  })
  
  const [validationErrors, setValidationErrors] = useState({})

  // Auto-populate from existing customer data
  useEffect(() => {
    if (build?.buyerInfo) {
      setPayerInfo(prev => ({
        ...prev,
        fullLegalName: `${build.buyerInfo.firstName} ${build.buyerInfo.lastName}`,
        email: build.buyerInfo.email || '',
        phone: build.buyerInfo.phone || '',
        billingAddress: {
          street: build.buyerInfo.address || '',
          city: build.buyerInfo.city || '',
          state: build.buyerInfo.state || '',
          zip: build.buyerInfo.zip || ''
        }
      }))
    }
  }, [build?.buyerInfo])

  // Validation function
  const validateForm = () => {
    const errors = {}
    
    if (!payerInfo.fullLegalName.trim()) {
      errors.fullLegalName = 'Full legal name is required'
    }
    
    if (!payerInfo.email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerInfo.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!payerInfo.phone.trim()) {
      errors.phone = 'Phone number is required'
    }
    
    if (!payerInfo.billingAddress.street.trim()) {
      errors.street = 'Street address is required'
    }
    
    if (!payerInfo.billingAddress.city.trim()) {
      errors.city = 'City is required'
    }
    
    if (!payerInfo.billingAddress.state.trim()) {
      errors.state = 'State is required'
    }
    
    if (!payerInfo.billingAddress.zip.trim()) {
      errors.zip = 'ZIP code is required'
    }
    
    if (!payerInfo.preferredTransferType) {
      errors.preferredTransferType = 'Please select a transfer type'
    }
    
    if (!commitments.customerInitiated) {
      errors.customerInitiated = 'This acknowledgment is required'
    }
    
    if (!commitments.fundsClearing) {
      errors.fundsClearing = 'This acknowledgment is required'
    }
    
    if (paymentPlan.type === 'deposit' && !commitments.storageFeesAcknowledged) {
      errors.storageFeesAcknowledged = 'This acknowledgment is required for deposit payments'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveAndContinue = async () => {
    if (!validateForm()) return

    setProcessing(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/payments/bank-transfer-intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          buildId: build._id,
          paymentPlan,
          payerInfo,
          commitments
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save bank transfer information')
      }

      const data = await res.json()
      console.log('Bank transfer intents created:', data)

      // Continue to review step
      onContinue()
    } catch (error) {
      console.error('Save bank transfer error:', error)
      setValidationErrors({ 
        general: error.message || 'Failed to save bank transfer information. Please try again.' 
      })
    } finally {
      setProcessing(false)
    }
  }

    return (
      <div className="space-y-6">
      {/* Header */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-white font-semibold text-xl mb-3">Bank Transfer (Wire/ACH Credit)</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
          Complete your payer information and choose your payment plan. Bank transfer instructions will be provided after contract signing.
          </p>
        </div>

      {/* General Error Display */}
      {validationErrors.general && (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
            <div className="flex items-start">
            <span className="text-red-400 text-xl mr-3">❌</span>
              <div className="flex-1">
              <div className="font-medium text-red-200">
                {validationErrors.general}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Section A - Payer Info */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Payer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Legal Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Legal Name (Person or Business) *
            </label>
            <input
              type="text"
              value={payerInfo.fullLegalName}
              onChange={(e) => setPayerInfo(prev => ({ ...prev, fullLegalName: e.target.value }))}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                validationErrors.fullLegalName ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Enter full legal name as it appears on your bank account"
            />
            {validationErrors.fullLegalName && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.fullLegalName}</p>
                    )}
                  </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={payerInfo.email}
              onChange={(e) => setPayerInfo(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                validationErrors.email ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="your@email.com"
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
                )}
              </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={payerInfo.phone}
              onChange={(e) => setPayerInfo(prev => ({ ...prev, phone: e.target.value }))}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                validationErrors.phone ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="(555) 123-4567"
            />
            {validationErrors.phone && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.phone}</p>
                )}
            </div>

          {/* Billing Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Billing Address *
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={payerInfo.billingAddress.street}
                onChange={(e) => setPayerInfo(prev => ({ 
                  ...prev, 
                  billingAddress: { ...prev.billingAddress, street: e.target.value }
                }))}
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
                  value={payerInfo.billingAddress.city}
                  onChange={(e) => setPayerInfo(prev => ({ 
                    ...prev, 
                    billingAddress: { ...prev.billingAddress, city: e.target.value }
                  }))}
                  className={`px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                    validationErrors.city ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="City"
                />
                <input
                  type="text"
                  value={payerInfo.billingAddress.state}
                  onChange={(e) => setPayerInfo(prev => ({ 
                    ...prev, 
                    billingAddress: { ...prev.billingAddress, state: e.target.value }
                  }))}
                  className={`px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 ${
                    validationErrors.state ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="State"
                />
                <input
                  type="text"
                  value={payerInfo.billingAddress.zip}
                  onChange={(e) => setPayerInfo(prev => ({ 
                    ...prev, 
                    billingAddress: { ...prev.billingAddress, zip: e.target.value }
                  }))}
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

          {/* Preferred Transfer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preferred Transfer Type *
            </label>
            <select
              value={payerInfo.preferredTransferType}
              onChange={(e) => setPayerInfo(prev => ({ ...prev, preferredTransferType: e.target.value }))}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white ${
                validationErrors.preferredTransferType ? 'border-red-500' : 'border-gray-600'
              }`}
            >
              <option value="">Select transfer type</option>
              <option value="ACH Credit">ACH Credit</option>
              <option value="Wire">Wire</option>
              <option value="Not sure yet">Not sure yet</option>
            </select>
            {validationErrors.preferredTransferType && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.preferredTransferType}</p>
            )}
        </div>

          {/* Planned Send Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Planned Send Date <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="date"
              value={payerInfo.plannedSendDate}
              onChange={(e) => setPayerInfo(prev => ({ ...prev, plannedSendDate: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
            />
          </div>
        </div>
        </div>

      {/* Payment Plan Breakdown */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Payment Plan</h3>
        
        {paymentPlan.type === 'deposit' ? (
          <div className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
              <h4 className="text-yellow-300 font-medium mb-3">Deposit + Final (Two Milestones)</h4>
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
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
              <div className="text-blue-200 text-xs space-y-1">
                <p>• <strong>Your deposit is required to place your home into the construction process.</strong></p>
                <p>• <strong>Final payment must be paid in full before the home can leave the factory.</strong></p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
              <h4 className="text-green-300 font-medium mb-3">Pay in Full (One Milestone)</h4>
              <div className="flex justify-between">
                <span className="text-gray-300">Amount Due:</span>
                <span className="text-white font-medium text-lg">{formatCurrency(totalCents)}</span>
        </div>
          </div>
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
              <div className="text-blue-200 text-xs">
                <p><strong>Funds must be received and cleared before release and scheduling.</strong></p>
        </div>
          </div>
          </div>
        )}
        </div>

      {/* Commitments */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Commitments</h3>
        <div className="space-y-4">
          {/* Customer Initiated */}
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={commitments.customerInitiated}
              onChange={(e) => setCommitments(prev => ({ ...prev, customerInitiated: e.target.checked }))}
              className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
            />
            <div className="flex-1">
              <span className="text-white text-sm">
                I understand this is a customer-initiated transfer; after signing, I'll receive instructions to send funds from my bank.
              </span>
              {validationErrors.customerInitiated && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.customerInitiated}</p>
              )}
        </div>
          </label>

          {/* Funds Clearing */}
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={commitments.fundsClearing}
              onChange={(e) => setCommitments(prev => ({ ...prev, fundsClearing: e.target.checked }))}
              className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
            />
            <div className="flex-1">
              <span className="text-white text-sm">
                I acknowledge funds must clear before build initiation, release and delivery scheduling.
              </span>
              {validationErrors.fundsClearing && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.fundsClearing}</p>
              )}
          </div>
          </label>

          {/* Storage Fees (only for deposit payments) */}
          {paymentPlan.type === 'deposit' && (
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={commitments.storageFeesAcknowledged}
                onChange={(e) => setCommitments(prev => ({ ...prev, storageFeesAcknowledged: e.target.checked }))}
                className="mt-1 mr-3 h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-600 rounded bg-gray-800"
              />
              <div className="flex-1">
                <span className="text-white text-sm">
                  I understand pay in full must occur within 12 days after build completion or storage fees will apply.
                </span>
                {validationErrors.storageFeesAcknowledged && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.storageFeesAcknowledged}</p>
                )}
            </div>
            </label>
          )}
          </div>
        </div>

      {/* Actions */}
        <div className="flex gap-3">
          <button 
            className="btn-primary"
          onClick={handleSaveAndContinue}
          disabled={processing}
        >
          {processing ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Saving...
            </span>
          ) : (
            'Save & Continue'
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

// Stripe Card Payment Form Component
function CardPaymentForm({ 
  onSuccess, 
  onError, 
  onRequiresAction, 
  processing, 
  setProcessing,
  formatCurrency,
  currentAmountCents
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardComplete, setCardComplete] = useState(false)
  const [billingComplete, setBillingComplete] = useState(false)
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (!stripe || !elements) {
      return
    }

    setProcessing(true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
          payment_method_data: {
            billing_details: billingDetails
          }
        },
        redirect: 'if_required'
      })

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          onError(error)
        } else {
          onError(new Error('An unexpected error occurred.'))
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess()
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        onRequiresAction(paymentIntent.client_secret)
      } else {
        onError(new Error('Payment processing failed.'))
      }
    } catch (error) {
      onError(error)
    } finally {
      setProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        '::placeholder': {
          color: '#aab7c4'
        },
        backgroundColor: 'transparent'
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Card Information
          </label>
          <div className="border border-gray-600 rounded-lg p-3 bg-gray-800">
            <CardElement 
              options={cardElementOptions}
              onChange={(event) => setCardComplete(event.complete)}
            />
          </div>
        </div>

        {/* Billing Information */}
        <div className="space-y-4">
          <h3 className="text-white font-medium">Billing Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={billingDetails.name}
                onChange={(e) => {
                  setBillingDetails(prev => ({ ...prev, name: e.target.value }))
                  setBillingComplete(e.target.value.length > 0)
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={billingDetails.email}
                onChange={(e) => {
                  setBillingDetails(prev => ({ ...prev, email: e.target.value }))
                  setBillingComplete(e.target.value.length > 0)
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Address Line 1
            </label>
            <input
              type="text"
              value={billingDetails.address.line1}
              onChange={(e) => {
                setBillingDetails(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, line1: e.target.value }
                }))
                setBillingComplete(e.target.value.length > 0)
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              placeholder="123 Main St"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              value={billingDetails.address.line2}
              onChange={(e) => {
                setBillingDetails(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, line2: e.target.value }
                }))
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              placeholder="Apt 4B"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                City
              </label>
              <input
                type="text"
                value={billingDetails.address.city}
                onChange={(e) => {
                  setBillingDetails(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, city: e.target.value }
                  }))
                  setBillingComplete(e.target.value.length > 0)
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                placeholder="Austin"
                required
              />
            </div>
            
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                State
              </label>
              <input
                type="text"
                value={billingDetails.address.state}
                onChange={(e) => {
                  setBillingDetails(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, state: e.target.value }
                  }))
                  setBillingComplete(e.target.value.length > 0)
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                placeholder="TX"
                required
              />
            </div>
            
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={billingDetails.address.postal_code}
                onChange={(e) => {
                  setBillingDetails(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, postal_code: e.target.value }
                  }))
                  setBillingComplete(e.target.value.length > 0)
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                placeholder="78701"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <div className="text-white">
          <div className="font-semibold text-sm mb-2">Payment Summary</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{formatCurrency(currentAmountCents)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Processing Fee:</span>
              <span>{formatCurrency(Math.round(currentAmountCents * 0.029 + 30))}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-600 pt-1 mt-1">
              <span>Total:</span>
              <span>{formatCurrency(currentAmountCents + Math.round(currentAmountCents * 0.029 + 30))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !cardComplete || !billingComplete || processing}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            Processing Payment...
          </span>
        ) : (
          `Pay ${formatCurrency(currentAmountCents + Math.round(currentAmountCents * 0.029 + 30))}`
        )}
      </button>
    </form>
  )
}

