import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'
import FunnelProgress from '../../components/FunnelProgress'
import { updateBuildStep } from '../../utils/checkoutNavigation'
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export default function ContractNew() {
  const { buildId } = useParams()
  const location = useLocation()
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  
  // Build data state
  const [build, setBuild] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Contract pack state
  const [contractStatus, setContractStatus] = useState({
    packs: {
      summary: 'ready',
      agreement: 'not_started',
      delivery: 'not_started',
      final: 'not_started'
    }
  })
  
  // Current active pack
  const [currentPack, setCurrentPack] = useState('summary')
  const [signingUrl, setSigningUrl] = useState('')
  const [loadingPack, setLoadingPack] = useState(false)
  
  // Summary PDF state
  const [summaryPdfUrl, setSummaryPdfUrl] = useState('')
  const [requestingEdit, setRequestingEdit] = useState(false)
  
  const iframeRef = useRef(null)
  const statusPollRef = useRef(null)
  
  // Helper function to get pack title
  function getPackTitle(packId) {
    const pack = packs.find(p => p.id === packId)
    return pack ? pack.title : packId
  }
  
  // Start polling for pack completion status
  function startStatusPolling(packId) {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current)
    }
    
    statusPollRef.current = setInterval(async () => {
      try {
        const token = await getToken()
        const response = await fetch(`/api/contracts/status?buildId=${buildId}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        })
        
        if (response.ok) {
          const status = await response.json()
          
          // Check if the pack is completed
          if (status.packs?.[packId] === 'completed') {
            clearInterval(statusPollRef.current)
            
            setContractStatus(prev => ({
              ...prev,
              packs: {
                ...prev.packs,
                [packId]: 'completed'
              }
            }))
            
            addToast(`${getPackTitle(packId)} completed successfully!`, 'success')
            
            // Auto-advance to next pack if available
            const currentPackIndex = packs.findIndex(p => p.id === packId)
            const nextPack = packs[currentPackIndex + 1]
            if (nextPack && nextPack.type === 'signature') {
              setCurrentPack(nextPack.id)
            }
          }
        }
      } catch (error) {
        console.error('Status polling error:', error)
      }
    }, 5000) // Poll every 5 seconds
  }
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current)
      }
    }
  }, [])

  // Listen for document completion messages from popup windows
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'DOCUMENT_SIGNED' && event.data?.buildId === buildId) {
        console.log('Document signed message received, refreshing contract status')
        // Refresh the contract status to pick up the completion
        loadBuildAndContract()
        addToast({
          type: 'success',
          title: 'Document Signed!',
          message: 'Your document has been signed successfully.'
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [buildId, addToast])

  // Pack definitions
  const packs = [
    {
      id: 'summary',
      title: 'Order Summary',
      description: 'This is your order overview. Make sure the model, options, and totals look right.',
      type: 'review',
      icon: DocumentTextIcon
    },
    {
      id: 'agreement',
      title: 'Purchase Agreement',
      description: 'Sign the purchase agreement and required disclosures. Takes ~3–5 minutes.',
      type: 'signature',
      icon: DocumentTextIcon
    },
    {
      id: 'delivery',
      title: 'Site & Delivery',
      description: 'Confirm site readiness, delivery details, insurance, and storage terms.',
      type: 'signature',
      icon: DocumentTextIcon
    },
    {
      id: 'final',
      title: 'Final Acknowledgments',
      description: 'Acknowledge warranty & title details, plus any deposits or changes.',
      type: 'signature',
      icon: DocumentTextIcon
    }
  ]

  // Load build and contract status on mount
  useEffect(() => {
    loadBuildAndContract()
  }, [buildId])

  // Handle URL hash navigation
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash && packs.find(p => p.id === hash)) {
      setCurrentPack(hash)
    }
  }, [location.hash])

  // Status polling for active signing sessions
  useEffect(() => {
    if (currentPack !== 'summary' && contractStatus.packs[currentPack] === 'in_progress') {
      statusPollRef.current = setInterval(pollContractStatus, 5000)
      return () => {
        if (statusPollRef.current) {
          clearInterval(statusPollRef.current)
        }
      }
    }
  }, [currentPack, contractStatus])

  async function loadBuildAndContract() {
    try {
      setLoading(true)
      const token = await getToken()
      
      // Load build data
      const buildRes = await fetch(`/api/builds/${buildId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (!buildRes.ok) {
        throw new Error('Failed to load build data')
      }
      
      const buildData = await buildRes.json()
      setBuild(buildData)
      
      // Update build step to 7 (Contract) 
      try {
        await updateBuildStep(buildId, 7, token)
      } catch (stepError) {
        console.error('Failed to update build step:', stepError)
      }
      
      // Load contract status
      await loadContractStatus(token)
      
    } catch (error) {
      console.error('Failed to load build and contract:', error)
      addToast({ 
        type: 'error', 
        title: 'Error', 
        message: 'Unable to load contract data. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadContractStatus(token = null) {
    try {
      if (!token) token = await getToken()
      
      const statusRes = await fetch(`/api/contracts/status?buildId=${buildId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (statusRes.ok) {
        const status = await statusRes.json()
        setContractStatus(status)
      }
    } catch (error) {
      console.error('Failed to load contract status:', error)
    }
  }

  async function pollContractStatus() {
    try {
      const token = await getToken()
      const statusRes = await fetch(`/api/contracts/status?buildId=${buildId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (statusRes.ok) {
        const status = await statusRes.json()
        setContractStatus(status)
        
        // If current pack completed, auto-advance to next
        if (status.packs[currentPack] === 'completed') {
          const currentIndex = packs.findIndex(p => p.id === currentPack)
          const nextPack = packs[currentIndex + 1]
          
          if (nextPack && status.packs[nextPack.id] === 'not_started') {
            addToast({
              type: 'success',
              title: 'Pack Completed',
              message: `${packs[currentIndex].title} completed successfully!`
            })
            
            // Auto-advance to next pack after brief delay
            setTimeout(() => {
              setCurrentPack(nextPack.id)
              navigate(`#${nextPack.id}`, { replace: true })
            }, 2000)
          }
        }
      }
    } catch (error) {
      console.error('Status polling error:', error)
    }
  }

  async function loadSummaryPdf() {
    try {
      const token = await getToken()
      const response = await fetch(`/api/contracts/${buildId}/summary-pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setSummaryPdfUrl(url)
      } else {
        throw new Error('Failed to generate summary PDF')
      }
    } catch (error) {
      console.error('Failed to load summary PDF:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Unable to load order summary. Please try again.'
      })
    }
  }

  async function markSummaryReviewed() {
    try {
      const token = await getToken()
      const response = await fetch(`/api/contracts/${buildId}/mark-summary-reviewed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      
      if (response.ok) {
        await loadContractStatus()
        addToast({
          type: 'success',
          title: 'Summary Reviewed',
          message: 'Order summary marked as reviewed. You can now proceed to signing.'
        })
        
        // Auto-advance to first signing pack
        setCurrentPack('agreement')
        navigate('#agreement', { replace: true })
      } else {
        throw new Error('Failed to mark summary as reviewed')
      }
    } catch (error) {
      console.error('Failed to mark summary as reviewed:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Unable to update summary status. Please try again.'
      })
    }
  }

  async function requestEdit() {
    setRequestingEdit(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/orders/${buildId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          note: 'Customer requested edit to order summary during contract review',
          type: 'edit_request',
          timestamp: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        addToast({
          type: 'info',
          title: 'Edit Request Submitted',
          message: 'Your edit request has been submitted. Our team will contact you shortly.'
        })
      } else {
        throw new Error('Failed to submit edit request')
      }
    } catch (error) {
      console.error('Failed to request edit:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Unable to submit edit request. Please contact support directly.'
      })
    } finally {
      setRequestingEdit(false)
    }
  }

  async function startPackSigning(packId) {
    try {
      setLoadingPack(true)
      const token = await getToken()
      
      // Map pack IDs to template keys
      const templateMap = {
        'agreement': 'masterRetail',
        'delivery': 'delivery',
        'final': 'masterRetail' // Assuming final uses the same template
      }
      
      const templateKey = templateMap[packId]
      if (!templateKey) {
        throw new Error(`Unknown pack: ${packId}`)
      }
      
      const response = await fetch(`/api/contracts/${templateKey}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ buildId, coBuyerEnabled: false })
      })
      
      if (response.ok) {
        const session = await response.json()
        console.log('[CONTRACT_NEW] Session response:', session)
        
        // Use the embedUrl (submitter URL) from the new endpoint
        const signingUrl = session.embedUrl || session.signingUrl
        
        // Open DocuSeal in a new tab to avoid X-Frame-Options issues
        const newWindow = window.open(signingUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
        
        if (newWindow) {
          // Update status to in_progress
          setContractStatus(prev => ({
            ...prev,
            packs: {
              ...prev.packs,
              [packId]: 'in_progress'
            }
          }))
          
          
          // Start polling for completion
          startStatusPolling(packId)
        } else {
          addToast('Please allow popups for this site to open the signing document', 'error')
        }
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create signing session')
      }
    } catch (error) {
      console.error('Failed to start pack signing:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Unable to start signing session. Please try again.'
      })
    } finally {
      setLoadingPack(false)
    }
  }

  function getPackStatusIcon(pack) {
    const status = contractStatus.packs[pack.id]
    
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'in_progress':
        return <div className="w-5 h-5 rounded-full border-2 border-yellow-400 bg-yellow-400 animate-pulse" />
      case 'reviewed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'ready':
        return <div className="w-5 h-5 rounded-full border-2 border-blue-400 bg-blue-400" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
    }
  }

  function getPackStatusText(pack) {
    const status = contractStatus.packs[pack.id]
    
    switch (status) {
      case 'completed':
        return 'Signed'
      case 'in_progress':
        return 'Signing...'
      case 'reviewed':
        return 'Reviewed'
      case 'ready':
        return 'Ready'
      default:
        return 'Not Started'
    }
  }

  function canAccessPack(pack) {
    if (pack.id === 'summary') return true
    
    // Pack 2 (agreement) requires summary to be reviewed
    if (pack.id === 'agreement') {
      return contractStatus.packs.summary === 'reviewed'
    }
    
    // Packs 3 and 4 require previous packs to be completed
    const packIndex = packs.findIndex(p => p.id === pack.id)
    for (let i = 1; i < packIndex; i++) {
      const prevPack = packs[i]
      if (contractStatus.packs[prevPack.id] !== 'completed') {
        return false
      }
    }
    
    return true
  }

  function canProceedToPayment() {
    return ['agreement', 'delivery', 'final'].every(
      packId => contractStatus.packs[packId] === 'completed'
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">We're preparing your contract documents...</p>
          <p className="text-gray-400 text-sm mt-2">This usually takes a few moments.</p>
        </div>
      </div>
    )
  }

  const currentPackData = packs.find(p => p.id === currentPack)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <FunnelProgress 
          current="Contract"
          buildId={buildId}
          build={build}
          onNavigate={(stepName, stepIndex) => {
            // Handle navigation if needed
          }}
        />
        
        <div className="mt-6">
          <h1 className="text-3xl font-bold text-white mb-2">Contract Review & Signature</h1>
          <p className="text-gray-300">
            Review your order details and sign the required documents to finalize your purchase.
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-8 ${currentPack === 'summary' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {/* Left Sidebar - 4-Pack Checklist */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 sticky top-8">
            <h2 className="text-lg font-semibold text-white mb-4">Contract Packs</h2>
            
            <div className="space-y-3">
              {packs.map((pack, index) => {
                const isAccessible = canAccessPack(pack)
                const isActive = currentPack === pack.id
                const status = contractStatus.packs[pack.id]
                
                return (
                  <button
                    key={pack.id}
                    onClick={() => {
                      if (isAccessible) {
                        setCurrentPack(pack.id)
                        navigate(`#${pack.id}`, { replace: true })
                      }
                    }}
                    disabled={!isAccessible}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isActive 
                        ? 'border-yellow-400 bg-yellow-400/10' 
                        : isAccessible 
                          ? 'border-gray-600 hover:border-gray-500 hover:bg-white/5' 
                          : 'border-gray-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${
                          isActive ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {index + 1}
                        </span>
                        {getPackStatusIcon(pack)}
                      </div>
                      <span className={`text-xs ${
                        status === 'completed' ? 'text-green-400' :
                        status === 'in_progress' ? 'text-yellow-400' :
                        status === 'reviewed' ? 'text-green-400' :
                        'text-gray-400'
                      }`}>
                        {getPackStatusText(pack)}
                      </span>
                    </div>
                    
                    <h3 className={`font-medium text-sm mb-1 ${
                      isActive ? 'text-white' : isAccessible ? 'text-gray-200' : 'text-gray-500'
                    }`}>
                      {pack.title}
                    </h3>
                    
                    {isActive && (
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {pack.description}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Pane - Content */}
        <div className={`${currentPack === 'summary' ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg">
            {/* Pack Header */}
            <div className="border-b border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-2">
                <currentPackData.icon className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">
                  {currentPackData.title}
                </h2>
                {getPackStatusIcon(currentPackData)}
              </div>
              <p className="text-gray-300 text-sm">
                {currentPackData.description}
              </p>
            </div>

            {/* Pack Content */}
            <div className="p-6">
              {currentPack === 'summary' && (
                <SummaryPackContent 
                  build={build}
                  summaryPdfUrl={summaryPdfUrl}
                  onLoadPdf={loadSummaryPdf}
                  onMarkReviewed={markSummaryReviewed}
                  onRequestEdit={requestEdit}
                  requestingEdit={requestingEdit}
                  status={contractStatus.packs.summary}
                />
              )}

              {currentPack !== 'summary' && (
                <SigningPackContent
                  pack={currentPackData}
                  status={contractStatus.packs[currentPack]}
                  signingUrl={signingUrl}
                  onStartSigning={() => startPackSigning(currentPack)}
                  loadingPack={loadingPack}
                  buildId={buildId}
                />
              )}
            </div>

            {/* Navigation Footer */}
            <div className="border-t border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex space-x-3">
                  {currentPack !== 'summary' && (
                    <button
                      onClick={() => {
                        const currentIndex = packs.findIndex(p => p.id === currentPack)
                        const prevPack = packs[currentIndex - 1]
                        if (prevPack) {
                          setCurrentPack(prevPack.id)
                          navigate(`#${prevPack.id}`, { replace: true })
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-white/5"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                  )}
                </div>

                <div className="flex space-x-3">
                  {currentPack !== 'final' && (
                    <button
                      onClick={() => {
                        const currentIndex = packs.findIndex(p => p.id === currentPack)
                        const nextPack = packs[currentIndex + 1]
                        if (nextPack && canAccessPack(nextPack)) {
                          setCurrentPack(nextPack.id)
                          navigate(`#${nextPack.id}`, { replace: true })
                        }
                      }}
                      disabled={!(() => {
                        const currentIndex = packs.findIndex(p => p.id === currentPack)
                        const nextPack = packs[currentIndex + 1]
                        return nextPack && canAccessPack(nextPack)
                      })()}
                      className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium"
                    >
                      <span>Continue</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  )}

                  {canProceedToPayment() && (
                    <button
                      onClick={() => navigate(`/checkout/${buildId}/payment-confirmation`)}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium"
                    >
                      <span>Continue to Payment</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Summary Pack Component
function SummaryPackContent({ build, summaryPdfUrl, onLoadPdf, onMarkReviewed, onRequestEdit, requestingEdit, status }) {
  useEffect(() => {
    if (!summaryPdfUrl) {
      onLoadPdf()
    }
  }, [summaryPdfUrl, onLoadPdf])

  return (
    <div className="space-y-6">
      {/* Order Summary Display - Full Height */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Order Summary</h3>
          <p className="text-sm text-gray-400">Review your order details and pricing</p>
        </div>
        
        {summaryPdfUrl ? (
          <div className="border border-gray-600 rounded-lg overflow-hidden bg-white" style={{ height: 'calc(100vh - 280px)', minHeight: '700px' }}>
            {/* PDF Viewer with Custom Controls */}
            <div className="relative w-full h-full">
              <iframe 
                src={`${summaryPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=95`}
                className="w-full h-full border-0"
                title="Order Summary PDF"
                style={{ 
                  backgroundColor: '#ffffff'
                }}
              />
              
              {/* Custom PDF Controls */}
              <div className="absolute top-2 right-2 flex space-x-2 z-10">
                <button 
                  onClick={() => window.open(`${summaryPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=95`, '_blank')}
                  className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
                >
                  Open Full View
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Generating order summary...</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {status !== 'reviewed' && (
        <div className="flex space-x-4">
          <button
            onClick={onMarkReviewed}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium"
          >
            <CheckCircleIcon className="w-5 h-5" />
            <span>Looks Good</span>
          </button>
          
          <button
            onClick={onRequestEdit}
            disabled={requestingEdit}
            className="flex items-center space-x-2 px-6 py-3 border border-yellow-600 text-yellow-400 hover:bg-yellow-600/10 rounded-lg font-medium disabled:opacity-50"
          >
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>{requestingEdit ? 'Submitting...' : 'Request Edit'}</span>
          </button>
        </div>
      )}

      {status === 'reviewed' && (
        <div className="flex items-center space-x-3 p-4 bg-green-900/20 border border-green-600 rounded-lg">
          <CheckCircleIcon className="w-6 h-6 text-green-400" />
          <div>
            <p className="text-green-200 font-medium">Order Summary Reviewed</p>
            <p className="text-green-300 text-sm">You can now proceed to sign the contract documents.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Signing Pack Component
function SigningPackContent({ pack, status, signingUrl, onStartSigning, loadingPack, buildId }) {
  const isInProgress = status === 'in_progress'
  const isNotStarted = status === 'not_started'
  
  return (
    <div className="space-y-6">
      {/* Ready to Sign Section */}
      {(isNotStarted || isInProgress) && (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-medium text-white mb-4">
            {isInProgress ? 'Continue Signing' : 'Ready to Sign'}
          </h3>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto text-lg">
            {isInProgress 
              ? `Continue signing your ${pack.title.toLowerCase()}. Your progress has been saved and you can resume where you left off.`
              : `Click the button below to start signing ${pack.title.toLowerCase()}. The signing process will open in a secure DocuSeal window where you can review and sign your document.`
            }
          </p>
          <button
            onClick={onStartSigning}
            disabled={loadingPack}
            className="px-8 py-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-lg text-white font-medium text-lg"
          >
            {loadingPack 
              ? 'Preparing...' 
              : isInProgress 
                ? `Resume Signing ${pack.title}` 
                : `Start Signing ${pack.title}`
            }
          </button>
          {/* Removed prefilled download button for cleaner UX */}
        </div>
      )}

      {/* Document Signed Section */}
      {status === 'completed' && (
        <div className="text-center py-12">
          <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-6" />
          <h3 className="text-xl font-medium text-white mb-4">
            {pack.title} Signed!
          </h3>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto text-lg">
            Your {pack.title.toLowerCase()} has been signed successfully. You can view the signed document or continue to the next step.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.open(`/api/contracts/download/packet?buildId=${buildId}`, '_blank')}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium"
            >
              View Signed {pack.title}
            </button>
            <button
              onClick={() => window.open(`/api/contracts/download/packet?buildId=${buildId}`, '_blank')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium"
            >
              Download PDF
            </button>
          </div>
        </div>
      )}

      {(status === 'in_progress' || status === 'completed') && signingUrl && (
        <div className="border border-gray-600 rounded-lg overflow-hidden bg-white" style={{ height: 'calc(100vh - 280px)', minHeight: '700px' }}>
          <iframe 
            src={signingUrl}
            className="w-full h-full border-0"
            title={`${pack.title} Signing`}
            style={{ 
              backgroundColor: '#ffffff'
            }}
          />
        </div>
      )}

    </div>
  )
}
