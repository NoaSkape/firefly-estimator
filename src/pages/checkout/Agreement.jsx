import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'
import FunnelProgress from '../../components/FunnelProgress'
import { updateBuildStep } from '../../utils/checkoutNavigation'
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BanknotesIcon,
  HomeIcon,
  UserIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'

export default function Agreement() {
  const { buildId } = useParams()
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  
  // Contract data state
  const [build, setBuild] = useState(null)
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [preparingDocs, setPreparingDocs] = useState(false)
  
  // Checklist state - track what user has reviewed
  const [checklistState, setChecklistState] = useState({
    orderSummary: false,
    buyerInfo: false,
    deliverySite: false,
    paymentTerms: false,
    disclosures: false
  })
  
  // Signing state
  const [signingState, setSigningState] = useState('not_ready') // 'not_ready', 'ready', 'signing', 'completed'
  const [signerUrl, setSignerUrl] = useState('')
  const [contractStatus, setContractStatus] = useState('draft') // 'draft', 'ready', 'signing', 'completed', 'voided'
  const [currentDocTab, setCurrentDocTab] = useState('all')
  
  const iframeRef = useRef(null)
  const statusPollRef = useRef(null)

  // Load build and contract data
  useEffect(() => {
    loadBuildData()
  }, [buildId])

  // Status polling while signing
  useEffect(() => {
    if (signingState === 'signing') {
      statusPollRef.current = setInterval(pollContractStatus, 4000)
      return () => {
        if (statusPollRef.current) {
          clearInterval(statusPollRef.current)
        }
      }
    }
  }, [signingState])

  async function loadBuildData() {
    try {
      console.log('[AGREEMENT_DEBUG] loadBuildData called with buildId:', buildId)
      setLoading(true)
      const token = await getToken()
      
      // Load build data
      const buildRes = await fetch(`/api/builds/${buildId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      console.log('[AGREEMENT_DEBUG] Build response:', {
        status: buildRes.status,
        ok: buildRes.ok,
        buildId: buildId
      })
      
      if (buildRes.ok) {
        const buildData = await buildRes.json()
        setBuild(buildData)
        
        // Update build step to 7 (Contract) to ensure proper navigation flow
        try {
          await updateBuildStep(buildId, 7, token)
          console.log('[AGREEMENT_DEBUG] Build step updated to 7 (Contract)')
        } catch (stepError) {
          console.error('[AGREEMENT_DEBUG] Failed to update build step:', stepError)
          // Don't block the page load if step update fails
        }
        
        // Check if we need to create contract
        await loadOrCreateContract(token)
      } else {
        addToast({ type: 'error', title: 'Error', message: 'Unable to load build data' })
      }
    } catch (error) {
      console.error('Failed to load build data:', error)
      addToast({ type: 'error', title: 'Error', message: 'Unable to load build data' })
    } finally {
      setLoading(false)
    }
  }

  async function loadOrCreateContract(token) {
    try {
      console.log('[AGREEMENT_DEBUG] loadOrCreateContract called with buildId:', buildId)
      
      // Try to get existing contract status
      const statusRes = await fetch(`/api/contracts/status?buildId=${buildId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      console.log('[AGREEMENT_DEBUG] Status response:', {
        status: statusRes.status,
        ok: statusRes.ok,
        buildId: buildId
      })
      
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setContract(statusData)
        setContractStatus(statusData.status || 'draft')
        setSignerUrl(statusData.signerUrl || '')
        
        if (statusData.status === 'completed') {
          setSigningState('completed')
        } else if (statusData.status === 'signing') {
          setSigningState('signing')
        } else if (statusData.signerUrl) {
          setSigningState('ready')
        }
      } else {
        // Contract doesn't exist, create it
        await createContract(token)
      }
    } catch (error) {
      console.error('Failed to load contract:', error)
      // Try to create new contract
      await createContract(token)
    }
  }

  async function createContract(token) {
    try {
      console.log('[AGREEMENT_DEBUG] createContract called with buildId:', buildId)
      setPreparingDocs(true)
      
      const requestBody = { buildId }
      console.log('[AGREEMENT_DEBUG] Creating contract with body:', requestBody)
      
      const res = await fetch('/api/contracts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('[AGREEMENT_DEBUG] Create response:', {
        status: res.status,
        ok: res.ok,
        buildId: buildId
      })
      
      if (res.ok) {
        const contractData = await res.json()
        setContract(contractData)
        setContractStatus(contractData.status || 'ready')
        setSignerUrl(contractData.signerUrl || '')
        setSigningState('ready')
      } else {
        throw new Error('Failed to create contract')
      }
    } catch (error) {
      console.error('Failed to create contract:', error)
      addToast({ 
        type: 'error', 
        title: 'Contract Creation Failed',
        message: 'Unable to prepare contract documents. Please try again.' 
      })
    } finally {
      setPreparingDocs(false)
    }
  }

  async function pollContractStatus() {
    try {
      const token = await getToken()
      const res = await fetch(`/api/contracts/status?buildId=${buildId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (res.ok) {
        const statusData = await res.json()
        setContract(statusData)
        setContractStatus(statusData.status || 'draft')
        
        if (statusData.status === 'completed') {
          setSigningState('completed')
          if (statusPollRef.current) {
            clearInterval(statusPollRef.current)
          }
          addToast({
            type: 'success',
            title: 'All documents signed!',
            message: "We've emailed you the full packet. You can also download it here anytime."
          })
        }
      }
    } catch (error) {
      console.error('Failed to poll contract status:', error)
    }
  }

  function updateChecklistItem(item, viewed) {
    setChecklistState(prev => ({
      ...prev,
      [item]: viewed
    }))
  }

  function canContinueToSign() {
    return checklistState.orderSummary && checklistState.disclosures
  }

  function handleContinueToSign() {
    if (!canContinueToSign()) {
      addToast({
        type: 'warning',
        title: 'Review Required',
        message: 'Please review the Order Summary and Required Disclosures before signing.'
      })
      return
    }
    
    setSigningState('signing')
    // Scroll to document viewer
    document.getElementById('document-viewer')?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleOpenInNewTab() {
    if (signerUrl) {
      window.open(signerUrl, '_blank', 'noopener,noreferrer')
      setSigningState('signing')
    }
  }

  function handleContinueToConfirmation() {
    navigate(`/checkout/${buildId}/confirm`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading contract information...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Funnel Progress Bar */}
      <FunnelProgress 
        current="Contract" 
        isSignedIn={true} 
        onNavigate={() => {}}
        build={build}
        buildId={buildId}
      />
      
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-white">
                Contract Review & Signature
              </h1>
              <div className="text-sm text-gray-400">
                Order #{buildId?.slice(-8) || 'N/A'}
              </div>
              <div className="text-sm text-gray-400">
                Version 1.0
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <StatusPill status={contractStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Desktop Split / Mobile Stacked */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Contract Checklist (40% desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <ContractChecklist 
              build={build}
              contract={contract}
              checklistState={checklistState}
              onUpdateChecklist={updateChecklistItem}
              onReviewSection={(section) => setCurrentDocTab(section)}
            />
          </div>

          {/* Right Column - Document Viewer (60% desktop) */}
          <div className="lg:col-span-3">
            <DocumentViewer 
              id="document-viewer"
              signerUrl={signerUrl}
              signingState={signingState}
              contractStatus={contractStatus}
              currentDocTab={currentDocTab}
              preparingDocs={preparingDocs}
              onOpenInNewTab={handleOpenInNewTab}
              iframeRef={iframeRef}
              buildId={buildId}
            />
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-0 z-50 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ActionBar 
            signingState={signingState}
            contractStatus={contractStatus}
            canContinueToSign={canContinueToSign()}
            onContinueToSign={handleContinueToSign}
            onContinueToConfirmation={handleContinueToConfirmation}
            buildId={buildId}
          />
        </div>
      </div>
    </div>
  )
}

// Status Pill Component
function StatusPill({ status }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'draft':
        return { label: 'Draft', className: 'bg-gray-600 text-gray-200' }
      case 'ready':
        return { label: 'Ready', className: 'bg-blue-600 text-blue-100' }
      case 'signing':
        return { label: 'Signing', className: 'bg-yellow-600 text-yellow-100' }
      case 'completed':
        return { label: 'Completed', className: 'bg-green-600 text-green-100' }
      case 'voided':
        return { label: 'Voided', className: 'bg-red-600 text-red-100' }
      default:
        return { label: 'Unknown', className: 'bg-gray-600 text-gray-200' }
    }
  }

  const config = getStatusConfig(status)
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// Contract Checklist Component
function ContractChecklist({ build, contract, checklistState, onUpdateChecklist, onReviewSection }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Contract Checklist</h2>
      
      {/* Order Summary Card */}
      <ChecklistCard
        title="Order Summary"
        icon={<HomeIcon className="h-5 w-5" />}
        isViewed={checklistState.orderSummary}
        isRequired={true}
        onReview={() => {
          onUpdateChecklist('orderSummary', true)
          onReviewSection('order')
        }}
      >
        <div className="text-sm text-gray-400 space-y-1">
          <div>Base price, options, delivery, fees & taxes</div>
          <div className="font-medium text-yellow-400">
            Total: {build?.pricing?.total ? `$${(build.pricing.total / 100).toLocaleString()}` : 'Calculating...'}
          </div>
        </div>
      </ChecklistCard>

      {/* Buyer Info Card */}
      <ChecklistCard
        title="Buyer Information"
        icon={<UserIcon className="h-5 w-5" />}
        isViewed={checklistState.buyerInfo}
        onReview={() => {
          onUpdateChecklist('buyerInfo', true)
          onReviewSection('buyer')
        }}
      >
        <div className="text-sm text-gray-400">
          Buyer details, contact information
        </div>
      </ChecklistCard>

      {/* Delivery Site Card */}
      <ChecklistCard
        title="Delivery Address & Site Readiness"
        icon={<MapPinIcon className="h-5 w-5" />}
        isViewed={checklistState.deliverySite}
        onReview={() => {
          onUpdateChecklist('deliverySite', true)
          onReviewSection('delivery')
        }}
      >
        <div className="text-sm text-gray-400">
          Delivery address, access notes, site requirements
        </div>
      </ChecklistCard>

      {/* Payment Terms Card */}
      <ChecklistCard
        title="Payment Terms (Cash/ACH)"
        icon={<BanknotesIcon className="h-5 w-5" />}
        isViewed={checklistState.paymentTerms}
        onReview={() => {
          onUpdateChecklist('paymentTerms', true)
          onReviewSection('payment')
        }}
      >
        <div className="text-sm text-gray-400 space-y-1">
          <div>Bank account verified & linked</div>
          <div>Deposit: 25% • Balance due before delivery</div>
        </div>
      </ChecklistCard>

      {/* Required Disclosures Card */}
      <ChecklistCard
        title="Required Disclosures"
        icon={<ShieldCheckIcon className="h-5 w-5" />}
        isViewed={checklistState.disclosures}
        isRequired={true}
        onReview={() => {
          onUpdateChecklist('disclosures', true)
          onReviewSection('disclosures')
        }}
      >
        <div className="text-sm text-gray-400 space-y-1">
          <div>• Purchase Agreement</div>
          <div>• Payment & Deposit Terms</div>
          <div>• Delivery & Site Requirements</div>
          <div>• Warranty & Service</div>
          <div>• Consumer Rights & Disclosures</div>
        </div>
      </ChecklistCard>

      {/* Ready to Sign Indicator */}
      <div className={`p-4 rounded-lg border-2 ${
        checklistState.orderSummary && checklistState.disclosures
          ? 'border-green-600 bg-green-900/20'
          : 'border-gray-600 bg-gray-800/50'
      }`}>
        <div className="flex items-center space-x-3">
          {checklistState.orderSummary && checklistState.disclosures ? (
            <CheckCircleIcon className="h-6 w-6 text-green-400" />
          ) : (
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
          )}
          <div>
            <div className="font-medium text-white">Ready to Sign</div>
            <div className="text-sm text-gray-400">
              {checklistState.orderSummary && checklistState.disclosures
                ? 'All required sections reviewed'
                : 'Review Order Summary and Required Disclosures'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Checklist Card Component
function ChecklistCard({ title, icon, children, isViewed, isRequired, onReview }) {
  return (
    <div className={`p-4 rounded-lg border ${
      isViewed ? 'border-green-600 bg-green-900/10' : 'border-gray-600 bg-gray-800/50'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`${isViewed ? 'text-green-400' : 'text-gray-400'}`}>
            {icon}
          </div>
          <h3 className="font-medium text-white">
            {title}
            {isRequired && <span className="text-red-400 ml-1">*</span>}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {isViewed && <CheckCircleIcon className="h-4 w-4 text-green-400" />}
        </div>
      </div>
      
      <div className="mb-3">
        {children}
      </div>
      
      <button
        onClick={onReview}
        className="text-sm text-yellow-400 hover:text-yellow-300 font-medium"
      >
        Review →
      </button>
    </div>
  )
}

// Document Viewer Component
function DocumentViewer({ id, signerUrl, signingState, contractStatus, currentDocTab, preparingDocs, onOpenInNewTab, iframeRef, buildId }) {
  if (preparingDocs) {
    return (
      <div id={id} className="bg-gray-800 rounded-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <div className="text-white text-lg mb-2">Preparing Documents...</div>
          <div className="text-gray-400 text-sm">Setting up your contract for review and signature</div>
        </div>
      </div>
    )
  }

  if (!signerUrl) {
    return (
      <div id={id} className="bg-gray-800 rounded-lg p-8">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <div className="text-white text-lg mb-2">Documents Not Ready</div>
          <div className="text-gray-400 text-sm">
            We're preparing your contract documents. Please wait or refresh the page.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id={id} className="space-y-4">
      {/* Document Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button className="border-b-2 border-yellow-400 py-2 px-1 text-sm font-medium text-yellow-400">
            All Documents
          </button>
        </nav>
      </div>

      {/* Document Content */}
      <div className="bg-gray-800 rounded-lg overflow-hidden" style={{ minHeight: '80vh' }}>
        {signingState === 'completed' ? (
          <div className="p-8 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <div className="text-white text-xl mb-2">Documents Signed Successfully!</div>
            <div className="text-gray-400 mb-6">
              Thank you for completing your contract. We've sent the signed documents to your email.
            </div>
            <button 
              onClick={() => window.open(`/api/contracts/download/packet?buildId=${buildId}`, '_blank')}
              className="btn-primary"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download Signed Documents
            </button>
          </div>
        ) : (
          <>
            <iframe
              ref={iframeRef}
              src={signerUrl}
              title="Contract Documents"
              className="w-full h-full"
              style={{ minHeight: '80vh' }}
              allow="fullscreen; clipboard-write; autoplay"
            />
            
            {/* Fallback for CSP issues */}
            <div className="p-4 bg-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Having trouble with the embedded viewer?
              </div>
              <button
                onClick={onOpenInNewTab}
                className="flex items-center text-sm text-yellow-400 hover:text-yellow-300"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                Open in New Tab
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Action Bar Component
function ActionBar({ signingState, contractStatus, canContinueToSign, onContinueToSign, onContinueToConfirmation, buildId }) {
  return (
    <div className="flex items-center justify-between">
      {/* Left side - Download */}
      <button 
        onClick={() => window.open(`/api/contracts/download/summary?buildId=${buildId}`, '_blank')}
        className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-md hover:bg-gray-700"
      >
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        Download Summary (PDF)
      </button>

      {/* Right side - Primary action */}
      <div className="flex items-center space-x-3">
        {signingState === 'not_ready' && (
          <button
            onClick={onContinueToSign}
            disabled={!canContinueToSign}
            className={`btn-primary ${!canContinueToSign ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Continue to Sign
          </button>
        )}
        
        {signingState === 'ready' && (
          <button
            onClick={onContinueToSign}
            className="btn-primary"
          >
            Continue to Sign
          </button>
        )}
        
        {signingState === 'signing' && (
          <button
            disabled
            className="btn-primary opacity-50 cursor-not-allowed"
          >
            Signing in Progress...
          </button>
        )}
        
        {signingState === 'completed' && (
          <button
            onClick={onContinueToConfirmation}
            className="btn-primary"
          >
            Continue to Confirmation
          </button>
        )}
      </div>
    </div>
  )
}


