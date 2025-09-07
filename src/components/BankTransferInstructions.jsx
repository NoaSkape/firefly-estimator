import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from './ToastProvider'

export default function BankTransferInstructions({ 
  buildId, 
  milestone, 
  onComplete,
  className = "",
  showTitle = true 
}) {
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [instructions, setInstructions] = useState(null)
  const [error, setError] = useState(null)
  const [transferInitiated, setTransferInitiated] = useState(false)

  const formatCurrency = (cents) => {
    if (!cents || isNaN(cents)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const generateInstructions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await getToken()
      const res = await fetch('/api/payments/bank-transfer-instructions', {
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
        throw new Error(errorData.error || 'Failed to generate instructions')
      }

      const data = await res.json()
      setInstructions(data.instructions)
    } catch (error) {
      console.error('Generate instructions error:', error)
      setError(error.message)
      addToast({
        type: 'error',
        title: 'Instructions Error',
        message: error.message || 'Failed to generate bank transfer instructions'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTransferInitiated = () => {
    setTransferInitiated(true)
    addToast({
      type: 'success',
      title: 'Transfer Confirmed',
      message: 'We\'ll notify you when your payment is received and processed.'
    })
    if (onComplete) {
      onComplete()
    }
  }

  const downloadInstructions = () => {
    if (!instructions) return

    const content = `
FIREFLY TINY HOMES - BANK TRANSFER INSTRUCTIONS
${milestone === 'deposit' ? 'Deposit Payment' : 
  milestone === 'final' ? 'Final Payment' : 
  'Full Payment'} Instructions

═══════════════════════════════════════════════════════════════

PAYMENT DETAILS:
Amount Due: ${formatCurrency(instructions.amount)}
Reference Code: ${instructions.bankDetails.referenceCode}
Payment Type: ${milestone === 'deposit' ? 'Deposit (Required to Start Build)' : 
               milestone === 'final' ? 'Final Payment (Required for Delivery)' : 
               'Full Payment (Required to Start Build)'}

BANK TRANSFER DETAILS:
Recipient Name: ${instructions.bankDetails.recipientName}
Bank Name: ${instructions.bankDetails.bankName}
Routing Number: ${instructions.bankDetails.routingNumber}
Account Number: ${instructions.bankDetails.accountNumber}

CRITICAL INSTRUCTIONS:
✓ MUST include reference code "${instructions.bankDetails.referenceCode}" in transfer memo/description
✓ Send exact amount: ${formatCurrency(instructions.amount)}
✓ Ensure transfer originates from account matching your payer information

PROCESSING TIMES:
• ${instructions.instructions.achCredit}
• ${instructions.instructions.wire}
• ${instructions.instructions.clearing}
${instructions.instructions.storageReminder ? `
IMPORTANT DEADLINE:
• ${instructions.instructions.storageReminder}` : ''}

NEXT STEPS:
1. Initiate transfer from your bank using the details above
2. Ensure the reference code is included in the transfer description
3. We'll automatically match and confirm your payment when received
4. You'll receive email confirmation once payment is processed

Questions? Contact us at support@fireflytinyhomes.com

Generated: ${new Date().toLocaleString()}
Build ID: ${buildId}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `firefly-bank-transfer-${milestone}-${buildId.slice(-8)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const emailInstructions = () => {
    if (!instructions) return

    const subject = `Firefly Tiny Homes - Bank Transfer Instructions (${milestone === 'deposit' ? 'Deposit' : 
                     milestone === 'final' ? 'Final' : 'Full'} Payment)`
    const body = `Dear ${instructions.payerInfo.fullLegalName},

Please find your bank transfer instructions below for your Firefly Tiny Home:

PAYMENT DETAILS:
Amount Due: ${formatCurrency(instructions.amount)}
Reference Code: ${instructions.bankDetails.referenceCode}
Payment Type: ${milestone === 'deposit' ? 'Deposit Payment (Required to Start Build)' : 
               milestone === 'final' ? 'Final Payment (Required for Delivery)' : 
               'Full Payment (Required to Start Build)'}

BANK TRANSFER DETAILS:
Recipient: ${instructions.bankDetails.recipientName}
Bank Name: ${instructions.bankDetails.bankName}
Routing Number: ${instructions.bankDetails.routingNumber}
Account Number: ${instructions.bankDetails.accountNumber}

CRITICAL: Include reference code "${instructions.bankDetails.referenceCode}" in your transfer description/memo.

Processing Times:
• ${instructions.instructions.achCredit}
• ${instructions.instructions.wire}
${instructions.instructions.storageReminder ? `
Important: ${instructions.instructions.storageReminder}` : ''}

We'll automatically match your payment when received and send you confirmation.

Questions? Reply to this email or call us at (555) 123-4567.

Best regards,
Firefly Tiny Homes Team

Build ID: ${buildId}`

    const mailtoLink = `mailto:${instructions.payerInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink)
  }

  if (!buildId || !milestone) {
    return (
      <div className={`bg-red-900/30 border border-red-600 rounded-lg p-4 ${className}`}>
        <p className="text-red-200">Invalid bank transfer configuration</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-white font-semibold text-xl mb-3">
            Bank Transfer Instructions
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
            </div>
          </div>
        </div>
      )}

      {!instructions && !loading && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
          <h3 className="text-white font-medium mb-3">Ready to Generate Instructions</h3>
          <p className="text-gray-300 text-sm mb-4">
            Click below to generate your secure bank transfer instructions for this payment milestone.
          </p>
          <button 
            className="btn-primary"
            onClick={generateInstructions}
            disabled={loading}
          >
            Confirm & Get Bank Transfer Instructions
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-3"></div>
          <p className="text-gray-300">Generating secure transfer instructions...</p>
        </div>
      )}

      {instructions && (
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
                {formatCurrency(instructions.amount)}
              </span>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Bank Transfer Details</h3>
            <div className="bg-gray-800 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Recipient Name:</span>
                <span className="text-white font-mono text-sm">{instructions.bankDetails.recipientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Bank Name:</span>
                <span className="text-white font-mono text-sm">{instructions.bankDetails.bankName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Routing Number:</span>
                <span className="text-white font-mono text-sm">{instructions.bankDetails.routingNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Account Number:</span>
                <span className="text-white font-mono text-sm">{instructions.bankDetails.accountNumber}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-600 pt-3">
                <span className="text-yellow-300 text-sm font-medium">Reference Code:</span>
                <span className="text-yellow-400 font-mono text-sm font-bold">
                  {instructions.bankDetails.referenceCode}
                </span>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mt-4">
              <div className="text-yellow-200 text-xs">
                <strong>⚠️ Important:</strong> Include the reference code in your transfer description/memo field 
                to ensure proper matching. Without it, we may not be able to identify your payment.
              </div>
            </div>
          </div>

          {/* Processing Information */}
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
            <div className="text-blue-200">
              <div className="font-semibold text-sm mb-2">📋 Processing Information</div>
              <ul className="text-xs space-y-1">
                <li>• {instructions.instructions.achCredit}</li>
                <li>• {instructions.instructions.wire}</li>
                <li>• {instructions.instructions.clearing}</li>
                {instructions.instructions.storageReminder && (
                  <li className="text-yellow-200 font-medium">• {instructions.instructions.storageReminder}</li>
                )}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button 
                className="btn-primary"
                onClick={handleTransferInitiated}
                disabled={transferInitiated}
              >
                {transferInitiated ? '✓ Transfer Initiated' : 'I\'ve Initiated My Transfer'}
              </button>
              <button 
                className="px-4 py-2 rounded border border-gray-600 text-white hover:bg-gray-700 transition-colors"
                onClick={downloadInstructions}
              >
                Download PDF Instructions
              </button>
              <button 
                className="px-4 py-2 rounded border border-gray-600 text-white hover:bg-gray-700 transition-colors"
                onClick={emailInstructions}
              >
                Email Me the Instructions
              </button>
            </div>

            {transferInitiated && (
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <span className="text-green-400 text-xl mr-3">✓</span>
                  <h4 className="text-white font-medium">Transfer Confirmed</h4>
                </div>
                <p className="text-green-200 text-sm">
                  Thank you for confirming your bank transfer. We'll automatically match your payment when it arrives 
                  and notify you via email.
                </p>
              </div>
            )}
          </div>

          {/* Hosted Invoice Link */}
          {instructions.hostedInvoiceUrl && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-3">
                You can also view and manage this payment through Stripe:
              </p>
              <a 
                href={instructions.hostedInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 underline text-sm"
              >
                View Invoice on Stripe →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
