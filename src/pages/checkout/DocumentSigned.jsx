import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function DocumentSigned() {
  const { buildId } = useParams()

  useEffect(() => {
    // Notify the parent window that the document has been signed
    if (window.opener) {
      window.opener.postMessage({ type: 'DOCUMENT_SIGNED', buildId }, '*')
    }
  }, [buildId])

  const handleClose = () => {
    // Close this window and return to the parent
    if (window.opener) {
      window.close()
    } else {
      // Fallback: redirect to the contract page
      window.location.href = `/checkout/${buildId}/agreement`
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-6" />
        
        <h1 className="text-2xl font-bold text-white mb-4">
          Document Signed!
        </h1>
        
        <p className="text-gray-300 mb-8">
          Congratulations! Your Purchase Agreement has been signed successfully.
        </p>
        
        <button
          onClick={handleClose}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Return to Contract
        </button>
      </div>
    </div>
  )
}
