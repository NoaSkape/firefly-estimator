import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import { formatCurrency, formatMiles } from '../../utils/formatCurrency'
import FunnelProgress from '../../components/FunnelProgress'
import { useToast } from '../../components/ToastProvider'
import { trackEvent } from '../../utils/analytics'
import { navigateToStep, updateBuildStep } from '../../utils/checkoutNavigation'
import { useBuildData, buildCache } from '../../hooks/useBuildData'
import { calculateTotalPurchasePrice } from '../../utils/calculateTotal'
import { generateOrderPDF } from '../../utils/generateOrderPDF'

export default function Review() {
  const { buildId } = useParams()
  const navigate = useNavigate()
  const { getToken, userId } = useAuth()
  const { addToast } = useToast()
  
  // Function to calculate delivery cost if missing
  const calculateDeliveryCost = async () => {
    if (!build || !build.buyerInfo) return
    
    try {
      const buyerInfo = build.buyerInfo
      if (!buyerInfo.address || !buyerInfo.city || !buyerInfo.state || !buyerInfo.zip) {
        console.log('Incomplete address for delivery calculation')
        return
      }
      
      const addressData = {
        address: buyerInfo.address,
        city: buyerInfo.city,
        state: buyerInfo.state,
        zip: buyerInfo.zip
      }
      
      console.log('Calculating delivery cost from Review component:', addressData)
      
      const token = await getToken()
      const response = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(addressData)
      })
      
      if (response.ok) {
        const deliveryData = await response.json()
        const calculatedCost = deliveryData.fee || 0
        console.log('Delivery cost calculated from Review:', calculatedCost)
        
        // Update the build with the new delivery cost
        const pricing = {
          ...build.pricing,
          delivery: calculatedCost
        }
        
        await updateBuild({
          pricing
        }, { skipRefetch: true })
        console.log('Updated build with delivery cost from Review component')
      } else {
        console.error('Failed to calculate delivery cost from Review component')
      }
    } catch (error) {
      console.error('Error calculating delivery cost from Review component:', error)
    }
  }
  
  // Use centralized build data management with force refresh to ensure latest data
  const { 
    build, 
    loading: buildLoading, 
    error: buildError, 
    updateBuild, 
    isLoaded: buildLoaded 
  } = useBuildData(buildId, true) // Force refresh to ensure we have latest data
  
  const [settings, setSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true)
        const token = await getToken()
        const url = token ? '/api/admin/settings' : '/api/settings'
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const settingsRes = await fetch(url, { headers })
        if (settingsRes.ok) {
          setSettings(await settingsRes.json())
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setSettingsLoading(false)
      }
    }
    
    loadSettings()
  }, [getToken])
  
  // Calculate delivery cost if missing when build loads
  useEffect(() => {
    if (buildLoaded && build && build.buyerInfo && 
        (build.pricing?.delivery === undefined || build.pricing?.delivery === null)) {
      console.log('Build loaded but missing delivery cost, calculating...')
      calculateDeliveryCost()
    }
  }, [buildLoaded, build])

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true)
      
      // Prepare the data for PDF generation
      const orderData = {
        build,
        settings,
        pricing: {
          basePrice: Number(build?.selections?.basePrice || 0),
          optionsSubtotal: optionsSubtotal,
          deliveryFee: Number(build?.pricing?.delivery || 0),
          titleFee: Number(settings?.pricing?.title_fee_default || 500),
          setupFee: Number(settings?.pricing?.setup_fee_default || 3000),
          taxRate: Number(settings?.pricing?.tax_rate_percent || 6.25) / 100,
          salesTax: salesTax,
          total: total
        }
      }
      
      // Generate PDF using the new utility
      await generateOrderPDF(orderData)
      
      addToast({ type: 'success', message: 'PDF downloaded successfully' })
      trackEvent('pdf_downloaded', { buildId })
    } catch (error) {
      console.error('PDF download error:', error)
      addToast({ type: 'error', message: 'Failed to download PDF' })
    } finally {
      setPdfLoading(false)
    }
  }

  const handleRemoveOption = async (optionId) => {
    try {
      // Remove the option from the build's selections
      const updatedOptions = build.selections.options.filter(opt => opt.id !== optionId)
      
      // Update the build with the new options
      await updateBuild({
        selections: {
          ...build.selections,
          options: updatedOptions
        }
      }, { skipRefetch: true })
      
      addToast({
        type: 'success',
        title: 'Option Removed',
        message: 'The option has been removed from your build.'
      })
    } catch (error) {
      console.error('Error removing option:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove the option. Please try again.'
      })
    }
  }

  const handleEditCustomization = () => {
    navigate(`/customize/${build?.modelSlug}?buildId=${buildId}`)
  }

  const handleFunnelNavigation = (stepName, stepIndex) => {
    navigateToStep(stepName, 'Overview', buildId, true, build, navigate, addToast, () => {
      // Invalidate cache before navigation to ensure fresh data
      buildCache.delete(buildId)
    })
  }

  // Show loading state
  if (buildLoading || settingsLoading) {
    return (
      <div>
        <FunnelProgress current="Overview" isSignedIn={true} onNavigate={() => {}} />
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="section-header">Review</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (buildError || !build) {
    return (
      <div>
        <FunnelProgress current="Overview" isSignedIn={true} onNavigate={() => {}} />
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="section-header">Review</h1>
          <div className="text-gray-400">
            {buildError ? `Error: ${buildError}` : 'Build not found'}
          </div>
        </div>
      </div>
    )
  }

  // Calculate comprehensive pricing breakdown using utility function
  const basePrice = Number(build?.selections?.basePrice || 0)
  const options = build?.selections?.options || []
  const optionsSubtotal = options.reduce((sum, opt) => sum + Number(opt.price || 0) * (opt.quantity || 1), 0)
  const subtotalBeforeFees = basePrice + optionsSubtotal
  
  // Get fees from settings or build
  const deliveryFee = Number(build?.pricing?.delivery || 0)
  const titleFee = Number(settings?.pricing?.title_fee_default || 500)
  const setupFee = Number(settings?.pricing?.setup_fee_default || 3000)
  const taxRate = Number(settings?.pricing?.tax_rate_percent || 6.25) / 100
  
  const feesSubtotal = deliveryFee + titleFee + setupFee
  const subtotalBeforeTax = subtotalBeforeFees + feesSubtotal
  const salesTax = subtotalBeforeTax * taxRate
  const total = calculateTotalPurchasePrice(build, settings)

  // Group options by category for better organization
  const optionsByCategory = options.reduce((acc, option) => {
    const category = option.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(option)
    return acc
  }, {})

  // Construct delivery address from individual fields
  const deliveryAddress = build?.buyerInfo?.deliveryAddress || 
    [build?.buyerInfo?.address, build?.buyerInfo?.city, build?.buyerInfo?.state, build?.buyerInfo?.zip]
      .filter(Boolean)
      .join(', ') || 'Not specified'

  return (
    <div>
      <FunnelProgress 
        current="Overview" 
        isSignedIn={true} 
        onNavigate={handleFunnelNavigation}
        build={build}
        buildId={buildId}
      />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="section-header">Review</h1>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="btn-secondary flex items-center gap-2"
          >
            {pdfLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            Download PDF
          </button>
        </div>

        {/* Order Summary */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-100">Order Summary</h2>
              <p className="text-lg text-yellow-500 font-medium">{build?.modelName} ({build?.modelSlug})</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Order ID</p>
              <p className="text-sm text-gray-200 font-mono">{buildId}</p>
            </div>
          </div>

          {/* Base Price */}
          <div className="border-b border-gray-700 pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-100">Base Price</h3>
                <p className="text-sm text-gray-400">Standard {build?.modelName} configuration</p>
              </div>
              <span className="text-lg font-semibold text-gray-100">{formatCurrency(basePrice)}</span>
            </div>
          </div>

          {/* Options by Category */}
          {Object.keys(optionsByCategory).length > 0 && (
            <div className="border-b border-gray-700 pb-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-100">Selected Options</h3>
                <button
                  onClick={handleEditCustomization}
                  className="text-yellow-500 hover:text-yellow-400 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
              {Object.entries(optionsByCategory).map(([category, categoryOptions]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <h4 className="text-md font-medium text-gray-200 mb-2">{category}</h4>
                  <div className="space-y-2">
                    {categoryOptions.map((option, index) => (
                      <div key={`${option.code}-${index}`} className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-100 font-medium">{option.name || option.code}</span>
                            {option.quantity > 1 && (
                              <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded">×{option.quantity}</span>
                            )}
                          </div>
                          {option.description && (
                            <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-100 font-medium">
                            {formatCurrency(Number(option.price || 0) * (option.quantity || 1))}
                          </span>
                          <button
                            onClick={() => handleRemoveOption(option.id)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                <span className="text-gray-300">Options Subtotal</span>
                <span className="text-gray-100 font-semibold">{formatCurrency(optionsSubtotal)}</span>
              </div>
            </div>
          )}

          {/* Fees Breakdown */}
          <div className="border-b border-gray-700 pb-4 mb-4">
            <h3 className="text-lg font-medium text-gray-100 mb-3">Fees & Services</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-300">Delivery</span>
                </div>
                <span className="text-gray-100">{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Title & Registration</span>
                <span className="text-gray-100">{formatCurrency(titleFee)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Setup & Installation</span>
                <span className="text-gray-100">{formatCurrency(setupFee)}</span>
              </div>
            </div>
          </div>

          {/* Tax Calculation */}
          <div className="border-b border-gray-700 pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-300">Sales Tax</span>
                <span className="text-sm text-gray-400 ml-2">({(taxRate * 100).toFixed(2)}%)</span>
              </div>
              <span className="text-gray-100">{formatCurrency(salesTax)}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center text-xl font-bold">
            <span className="text-gray-100">Total Purchase Price</span>
            <span className="text-yellow-500">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Buyer & Delivery Information */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Buyer & Delivery Information</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-3">Contact Information</h3>
              <div className="space-y-2 text-gray-300">
                <p><span className="font-medium">Name:</span> {build?.buyerInfo?.firstName} {build?.buyerInfo?.lastName}</p>
                <p><span className="font-medium">Email:</span> {build?.buyerInfo?.email}</p>
                <p><span className="font-medium">Phone:</span> {build?.buyerInfo?.phone || 'Not provided'}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-3">Delivery Address</h3>
              <div className="text-gray-300">
                <p>{deliveryAddress}</p>
                {build?.pricing?.deliveryMiles && (
                  <p className="text-sm text-gray-400 mt-2">
                    Distance: {formatMiles(build.pricing.deliveryMiles)} from factory
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-300">
              <span className="font-medium">Payment Method:</span> 
              <span className="ml-2 text-gray-400">{build?.financing?.method || 'To be selected in next step'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            className="btn-primary flex-1"
            onClick={async () => {
              try {
                const token = await getToken()
                // Update build step to 6 (Payment Method)
                await updateBuildStep(buildId, 6, token)
                navigate(`/checkout/${buildId}/payment-method`)
              } catch (error) {
                console.error('Error updating build step:', error)
                // Still navigate even if step update fails
                navigate(`/checkout/${buildId}/payment-method`)
              }
            }}
          >
            Continue to Payment Method
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate(`/customize/${build?.modelSlug}?buildId=${buildId}`)}
          >
            Edit Customization
          </button>
        </div>
      </div>
    </div>
  )
}


