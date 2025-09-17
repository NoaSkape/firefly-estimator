import { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  PrinterIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline'

/**
 * Professional Document Viewer Modal
 * Supports PDF viewing, downloading, and printing with full-screen capability
 */
export default function DocumentViewerModal({ 
  isOpen, 
  onClose, 
  documentUrl, 
  documentTitle = 'Document',
  filename = 'document.pdf'
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setHasError(false)
      setIsFullscreen(false)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isFullscreen, onClose])

  const handleDownload = async () => {
    try {
      const response = await fetch(documentUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback to direct link
      window.open(documentUrl, '_blank')
    }
  }

  const handlePrint = () => {
    const iframe = document.getElementById('document-iframe')
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.print()
      } catch (error) {
        console.error('Print failed:', error)
        // Fallback to opening in new window for printing
        window.open(documentUrl, '_blank')
      }
    }
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={!isFullscreen ? onClose : undefined}
      />
      
      {/* Modal Container */}
      <div className={`
        relative h-full flex flex-col
        ${isFullscreen 
          ? 'w-full' 
          : 'max-w-6xl mx-auto px-4 py-8'
        }
      `}>
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-t-lg px-6 py-4">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">{documentTitle}</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Fullscreen Toggle */}
            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>
            
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Download</span>
            </button>
            
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Print</span>
            </button>
            
            {/* Close Button */}
            {!isFullscreen && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Document Viewer */}
        <div className={`
          flex-1 bg-white border-x border-b border-gray-700 
          ${isFullscreen ? 'rounded-none' : 'rounded-b-lg'}
          relative overflow-hidden
        `}>
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center max-w-md">
                <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Document</h3>
                <p className="text-gray-600 mb-6">
                  The document could not be displayed. You can still download it using the button above.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
                >
                  Download Document
                </button>
              </div>
            </div>
          )}

          {/* PDF Iframe */}
          {documentUrl && (
            <iframe
              id="document-iframe"
              src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH&zoom=100`}
              className="w-full h-full border-0"
              title={documentTitle}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setHasError(true)
              }}
              style={{ 
                backgroundColor: '#ffffff',
                minHeight: isFullscreen ? '100vh' : '600px'
              }}
            />
          )}
        </div>

        {/* Fullscreen Close Button */}
        {isFullscreen && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  )
}
