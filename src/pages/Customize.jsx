import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import PublicOptionSelector from '../public/PublicOptionSelector'
import PackagesSelector from '../components/PackagesSelector'
import { AdvancedImage } from '@cloudinary/react'
import { createHeroImage, createThumbnailImage, createGalleryImage } from '../utils/cloudinary'
import { slugToModelId, isValidSlug, getModelBySlug } from '../utils/modelUrlMapping'
import { MODELS } from '../data/models'
import SEOHead from '../components/SEOHead'
import { useToast } from '../components/ToastProvider'

const Customize = () => {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState([])
  const [selectedPackage, setSelectedPackage] = useState('')
  const [saving, setSaving] = useState(false)

  // Determine the actual model code from URL parameters
  const getModelCode = () => {
    if (!modelId) return null
    // If modelId is a slug, map to modelCode for Cloudinary folder usage
    if (isValidSlug(modelId)) {
      return slugToModelId(modelId)
    }
    // Otherwise, assume it's already a code
    return modelId
  }

  const actualModelCode = getModelCode()

  useEffect(() => {
    fetchModel()
  }, [actualModelCode])

  const fetchModel = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // API-first fetch to ensure persisted images/features are loaded from DB
      if (actualModelCode) {
        try {
          const token = await getToken()
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
          const url = `/api/models/${actualModelCode}`
          const response = await fetch(url, { headers })
          
          if (response.ok) {
            const apiModelData = await response.json()
            setModel(apiModelData)
          } else {
            // If API fails, try to find in local data as fallback
            const localModel = MODELS.find(m => m.id === actualModelCode)
            if (localModel) {
              const transformedModel = {
                ...localModel,
                modelCode: localModel.subtitle,
                images: [],
                features: localModel.features || []
              }
              setModel(transformedModel)
            } else {
              setError('Model not found')
            }
          }
        } catch (apiError) {
          console.error('API fetch failed:', apiError)
          // Fallback to local data
          const localModel = MODELS.find(m => m.id === actualModelCode)
          if (localModel) {
            const transformedModel = {
              ...localModel,
              modelCode: localModel.subtitle,
              images: [],
              features: localModel.features || []
            }
            setModel(transformedModel)
          } else {
            setError('Model not found')
          }
        }
      } else {
        setError('Invalid model ID')
      }
    } catch (err) {
      console.error('Error fetching model:', err)
      setError('Failed to load model')
    } finally {
      setLoading(false)
    }
  }

  const computePricing = () => {
    const base = Number(model?.basePrice || 0)
    const optionsTotal = selectedOptions.reduce((s, o) => s + (o.priceDelta || 0), 0)
    const pkgDelta = (() => {
      const pkg = (model?.packages || []).find(p => (p.key || p.name) === selectedPackage)
      return pkg ? Number(pkg.priceDelta || 0) : 0
    })()
    const total = base + optionsTotal + pkgDelta
    return { base, options: optionsTotal, package: pkgDelta, total }
  }

  const handleSaveCustomization = async () => {
    if (!isSignedIn) {
      // Redirect to sign-in page
      navigate('/sign-in?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }

    setSaving(true)
    try {
      const pricing = computePricing()
      const body = {
        model: { 
          modelCode: model?.modelCode || actualModelCode, 
          slug: modelId, 
          name: model?.name, 
          basePrice: Number(model?.basePrice||0) 
        },
        selections: {
          options: selectedOptions,
          package: selectedPackage
        },
        pricing
      }
      
      const key = `${Date.now()}-${user?.id || 'anon'}-${actualModelCode}`
      const token = await getToken()
      const res = await fetch('/api/builds', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Idempotency-Key': key, 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify(body)
      })
      
      if (!res.ok) throw new Error('Failed to save customization')
      const data = await res.json()
      
      addToast({ 
        type: 'success', 
        title: 'Customization Saved!',
        message: 'Your home design has been saved to your account.'
      })
      
      // Navigate to the next step in the funnel (Buyer Info)
      navigate(`/checkout/${data.buildId}/buyer`)
      
    } catch (e) {
      console.error(e)
      addToast({ 
        type: 'error', 
        title: 'Save Failed',
        message: 'Could not save your customization. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAccount = () => {
    navigate('/sign-up?redirect=' + encodeURIComponent(window.location.pathname))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading model...</p>
        </div>
      </div>
    )
  }

  if (error || !model) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Model Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The model you\'re looking for doesn\'t exist.'}</p>
          <button 
            onClick={() => navigate('/models')}
            className="btn-primary px-6 py-2"
          >
            Browse Models
          </button>
        </div>
      </div>
    )
  }

  const pricing = computePricing()

  return (
    <div className="min-h-screen">
      {/* SEO Head Component */}
      <SEOHead 
        title={`Customize ${model.name} - Firefly Tiny Homes`}
        description={`Customize your ${model.name} with packages and options. Add your personal touch to this beautiful tiny home.`}
        model={model}
      />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-900/50 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/models/${modelId}`)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                ← Back to {model.name}
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Step 1 of 5: Customize
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Model Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Model Header */}
            <div className="card">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {model.name}
              </h1>
              <p className="text-xl text-yellow-600 font-semibold mb-4">
                Starting at ${Number(model.basePrice || 0).toLocaleString()}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                {model.description || 'No description available.'}
              </p>
            </div>

            {/* Image Gallery */}
            {model.images && model.images.length > 0 && (
              <div className="card">
                <div className="grid grid-cols-2 gap-4">
                  {model.images.slice(0, 4).map((image, index) => (
                    <div key={index} className="aspect-video rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={`${model.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specifications */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Width</span>
                  <p className="font-medium">{model.width}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Square Feet</span>
                  <p className="font-medium">{model.squareFeet} sq ft</p>
                </div>
                {model.length && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Length</span>
                    <p className="font-medium">{model.length}</p>
                  </div>
                )}
                {model.height && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Height</span>
                    <p className="font-medium">{model.height}</p>
                  </div>
                )}
                {model.weight && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Weight</span>
                    <p className="font-medium">{model.weight}</p>
                  </div>
                )}
                {model.bedrooms && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Bedrooms</span>
                    <p className="font-medium">{model.bedrooms}</p>
                  </div>
                )}
                {model.bathrooms && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Bathrooms</span>
                    <p className="font-medium">{model.bathrooms}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Features</h2>
              <ul className="space-y-2">
                {model.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Packages */}
            {Array.isArray(model?.packages) && model.packages.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Popular Add-on Packages</h2>
                <PackagesSelector packages={model.packages} value={selectedPackage} onChange={setSelectedPackage} />
              </div>
            )}

            {/* Additional Add-Ons */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Additional Add-Ons</h2>
              <PublicOptionSelector value={selectedOptions} onChange={setSelectedOptions} />
            </div>
          </div>

          {/* Right Column - Price Summary & Save */}
          <div className="space-y-6">
            {/* Price Summary */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Price Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Base Price</span>
                  <span className="font-medium">${pricing.base.toLocaleString()}</span>
                </div>
                {pricing.package > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Package</span>
                    <span className="font-medium">+${pricing.package.toLocaleString()}</span>
                  </div>
                )}
                {pricing.options > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Add-ons</span>
                    <span className="font-medium">+${pricing.options.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-yellow-600">${pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Authentication Gate */}
            <div className="card">
              {isSignedIn ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    To Keep Your Customizations
                  </h3>
                  <button
                    onClick={handleSaveCustomization}
                    disabled={saving}
                    className="w-full btn-primary text-lg py-4 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Your customization will be saved to your account.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    To Save Your Home
                  </h3>
                  <button
                    onClick={handleCreateAccount}
                    className="w-full btn-primary text-lg py-4"
                  >
                    Create Account
                  </button>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Create a free account to save your customization.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Customize
