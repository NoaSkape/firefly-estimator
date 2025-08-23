import FunnelProgress from '../../components/FunnelProgress'
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from '../../components/ToastProvider'
import { trackEvent } from '../../utils/analytics'

export default function Review() {
  const { buildId } = useParams()
  const navigate = useNavigate()
  const { getToken, userId } = useAuth()
  const [build, setBuild] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const token = await getToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        
        // Fetch build and settings in parallel
        const [buildRes, settingsRes] = await Promise.all([
          fetch(`/api/builds/${buildId}`, { headers }),
          fetch('/api/admin/settings', { headers })
        ])
        
        if (buildRes.ok) {
          const buildData = await buildRes.json()
          setBuild(buildData)
          
          // If delivery fee hasn't been calculated and we have buyer info, trigger calculation
          if (!buildData?.pricing?.delivery && buildData?.buyerInfo) {
            const address = buildData.buyerInfo.deliveryAddress || 
              [buildData.buyerInfo.address, buildData.buyerInfo.city, buildData.buyerInfo.state, buildData.buyerInfo.zip]
                .filter(Boolean)
                .join(', ')
            
            if (address && address.trim()) {
              try {
                // Trigger delivery calculation by updating the build with current buyer info
                await fetch(`/api/builds/${buildId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', ...headers },
                  body: JSON.stringify({ buyerInfo: buildData.buyerInfo })
                })
                
                // Refetch the build to get updated pricing
                const updatedBuildRes = await fetch(`/api/builds/${buildId}`, { headers })
                if (updatedBuildRes.ok) {
                  setBuild(await updatedBuildRes.json())
                }
              } catch (error) {
                console.error('Error calculating delivery:', error)
              }
            }
          }
        }
        
        if (settingsRes.ok) setSettings(await settingsRes.json())
      } catch (error) {
        console.error('Error loading review data:', error)
        addToast({ type: 'error', message: 'Failed to load order details' })
      } finally {
        setLoading(false)
      }
    })()
  }, [buildId, getToken, addToast])

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true)
      const token = await getToken()
      const res = await fetch(`/api/builds/${buildId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (!res.ok) throw new Error('Failed to generate PDF')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `firefly-order-${buildId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      addToast({ type: 'success', message: 'PDF downloaded successfully' })
      trackEvent('pdf_downloaded', { buildId })
    } catch (error) {
      console.error('PDF download error:', error)
      addToast({ type: 'error', message: 'Failed to download PDF' })
    } finally {
      setPdfLoading(false)
    }
  }

  const handleEditOption = (optionId) => {
    navigate(`/customize/${build?.modelSlug}?edit=${optionId}`)
  }

  if (loading) {
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

  if (!build) {
    return (
      <div>
        <FunnelProgress current="Overview" isSignedIn={true} onNavigate={() => {}} />
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="section-header">Review</h1>
          <div className="text-gray-400">Build not found</div>
        </div>
      </div>
    )
  }

  // Calculate comprehensive pricing breakdown
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
  const total = subtotalBeforeTax + salesTax

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
      <FunnelProgress current="Overview" isSignedIn={true} onNavigate={() => {}} />
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
              <span className="text-lg font-semibold text-gray-100">${basePrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Options by Category */}
          {Object.keys(optionsByCategory).length > 0 && (
            <div className="border-b border-gray-700 pb-4 mb-4">
              <h3 className="text-lg font-medium text-gray-100 mb-3">Selected Options</h3>
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
                            ${(Number(option.price || 0) * (option.quantity || 1)).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleEditOption(option.code)}
                            className="text-yellow-500 hover:text-yellow-400 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                <span className="text-gray-300">Options Subtotal</span>
                <span className="text-gray-100 font-semibold">${optionsSubtotal.toLocaleString()}</span>
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
                  {build?.pricing?.deliveryMiles && (
                    <span className="text-sm text-gray-400 ml-2">
                      ({build.pricing.deliveryMiles} miles × ${settings?.pricing?.delivery_rate_per_mile || 12.5}/mi)
                    </span>
                  )}
                </div>
                <span className="text-gray-100">${deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Title & Registration</span>
                <span className="text-gray-100">${titleFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Setup & Installation</span>
                <span className="text-gray-100">${setupFee.toLocaleString()}</span>
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
              <span className="text-gray-100">${salesTax.toLocaleString()}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center text-xl font-bold">
            <span className="text-gray-100">Total Purchase Price</span>
            <span className="text-yellow-500">${total.toLocaleString()}</span>
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
                    Distance: {build.pricing.deliveryMiles} miles from factory
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
            onClick={() => navigate(`/checkout/${buildId}/payment-method`)}
          >
            Continue to Payment Method
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate(`/customize/${build?.modelSlug}`)}
          >
            Edit Customization
          </button>
        </div>
      </div>
    </div>
  )
}


