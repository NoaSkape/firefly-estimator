import { useState } from 'react'
import { 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

/**
 * Comprehensive Error Handler for Contract Operations
 * Provides user-friendly error messages and recovery options
 */
export default function ContractErrorHandler({ 
  error, 
  onRetry, 
  onClose,
  context = 'general' // 'signing', 'loading', 'download', 'general'
}) {
  const [isRetrying, setIsRetrying] = useState(false)

  if (!error) return null

  const getErrorConfig = (error, context) => {
    // Network/Connection Errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return {
        title: 'Connection Issue',
        message: 'Unable to connect to our servers. Please check your internet connection and try again.',
        type: 'warning',
        canRetry: true,
        suggestions: [
          'Check your internet connection',
          'Disable any VPN or proxy temporarily',
          'Try refreshing the page'
        ]
      }
    }

    // DocuSeal Integration Errors
    if (error.message?.includes('DocuSeal') || error.message?.includes('submission')) {
      return {
        title: 'Document Service Issue',
        message: 'There was a problem with the document signing service. This is usually temporary.',
        type: 'error',
        canRetry: true,
        suggestions: [
          'Wait a few moments and try again',
          'Clear your browser cache and cookies',
          'Try using a different browser'
        ]
      }
    }

    // Authentication Errors
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      return {
        title: 'Session Expired',
        message: 'Your session has expired. Please refresh the page to continue.',
        type: 'warning',
        canRetry: false,
        suggestions: [
          'Refresh the page to log back in',
          'Clear your browser cookies',
          'Contact support if the issue persists'
        ]
      }
    }

    // Popup Blocked Errors
    if (error.message?.includes('popup') || context === 'popup') {
      return {
        title: 'Popup Blocked',
        message: 'Your browser blocked the signing window. Please allow popups for this site.',
        type: 'info',
        canRetry: true,
        suggestions: [
          'Click the popup blocker icon in your address bar',
          'Add this site to your popup exceptions',
          'Try holding Ctrl/Cmd while clicking the button'
        ]
      }
    }

    // Download Errors
    if (context === 'download') {
      return {
        title: 'Download Failed',
        message: 'Unable to download the document. The file may be temporarily unavailable.',
        type: 'warning',
        canRetry: true,
        suggestions: [
          'Try downloading again in a few moments',
          'Check your browser\'s download settings',
          'Contact support for a copy of your document'
        ]
      }
    }

    // Loading/Status Errors
    if (context === 'loading') {
      return {
        title: 'Loading Error',
        message: 'Unable to load the contract status. Your progress has been saved.',
        type: 'warning',
        canRetry: true,
        suggestions: [
          'Refresh the page to reload',
          'Check your internet connection',
          'Your signing progress is automatically saved'
        ]
      }
    }

    // Generic/Unknown Errors
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Don\'t worry - your progress has been saved.',
      type: 'error',
      canRetry: true,
      suggestions: [
        'Try again in a few moments',
        'Refresh the page if the issue persists',
        'Contact our support team if you continue having problems'
      ]
    }
  }

  const handleRetry = async () => {
    if (!onRetry) return
    
    setIsRetrying(true)
    try {
      await onRetry()
      onClose?.()
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setIsRetrying(false)
    }
  }

  const config = getErrorConfig(error, context)
  
  const getIconColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      case 'info': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  const getBgColor = (type) => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'info': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity bg-gray-900/50 backdrop-blur-sm" />

        {/* Modal */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-start space-x-4">
            {/* Icon */}
            <div className={`flex-shrink-0 p-2 rounded-full ${getBgColor(config.type)}`}>
              <ExclamationTriangleIcon className={`w-6 h-6 ${getIconColor(config.type)}`} />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {config.title}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {config.message}
              </p>

              {/* Suggestions */}
              {config.suggestions && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <InformationCircleIcon className="w-4 h-4 mr-1" />
                    Try these solutions:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {config.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {config.canRetry && onRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg text-white font-medium transition-colors"
                  >
                    {isRetrying ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2" />
                        Try Again
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 font-medium transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Contact Support */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  Still having trouble? Our support team is here to help:
                </p>
                <div className="flex flex-col sm:flex-row gap-2 text-sm">
                  <a 
                    href="tel:830-328-6109" 
                    className="flex items-center text-blue-600 hover:text-blue-700"
                  >
                    <PhoneIcon className="w-4 h-4 mr-1" />
                    (830) 328-6109
                  </a>
                  <a 
                    href="mailto:support@fireflytinyhomes.com" 
                    className="flex items-center text-blue-600 hover:text-blue-700"
                  >
                    <EnvelopeIcon className="w-4 h-4 mr-1" />
                    support@fireflytinyhomes.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
