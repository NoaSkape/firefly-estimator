import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import PublicOptionSelector from '../public/PublicOptionSelector'
import PackagesSelector from '../components/PackagesSelector'
import { AdvancedImage } from '@cloudinary/react'
import { createHeroImage, createThumbnailImage, createGalleryImage } from '../utils/cloudinary'
import { slugToModelId, isValidSlug, getModelBySlug } from '../utils/modelUrlMapping'
import { MODELS } from '../data/models'
import { OPTIONS } from '../data/options'
import SEOHead from '../components/SEOHead'
import FunnelProgress from '../components/FunnelProgress'
import { useToast } from '../components/ToastProvider'
import { navigateToStep, updateBuildStep } from '../utils/checkoutNavigation'
import { useUserProfile } from '../hooks/useUserProfile'
import { useBuildData, buildCache } from '../hooks/useBuildData'
import { formatCurrency, roundToCents } from '../utils/currency'
import { 
  saveAnonymousCustomization, 
  loadAnonymousCustomization, 
  clearAnonymousCustomization,
  migrateAnonymousCustomizations,
  cleanupExpiredCustomizations
} from '../utils/customizationStorage'

const Customize = () => {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const { getPrimaryAddress, profile, addresses, getAutoFillData } = useUserProfile()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState([])
  const [selectedPackage, setSelectedPackage] = useState('')
  const [saving, setSaving] = useState(false)
  const [customizationLoaded, setCustomizationLoaded] = useState(false)
  const [deliveryCost, setDeliveryCost] = useState(null) // null = not calculated, 0 = calculated as 0, number = actual cost
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  // Get buildId from query parameters (from checkout navigation)
  const urlParams = new URLSearchParams(window.location.search)
  const specificBuildId = urlParams.get('buildId')
  
  // Use centralized build data management
  const { 
    build: currentBuild, 
    loading: buildLoading, 
    error: buildError, 
    updateBuild, 
    isLoaded: buildLoaded 
  } = useBuildData(specificBuildId)

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

  // Load customization on component mount (both anonymous and migrated)
  useEffect(() => {
    if (actualModelCode && !customizationLoaded) {
      if (!isSignedIn) {
        // Load anonymous customization for non-signed-in users
        const savedCustomization = loadAnonymousCustomization(actualModelCode)
        if (savedCustomization) {
          setSelectedOptions(savedCustomization.selectedOptions || [])
          setSelectedPackage(savedCustomization.selectedPackage || '')
          addToast({
            type: 'info',
            title: 'Customization Restored',
            message: 'Your previous customization has been restored.'
          })
        }
        setCustomizationLoaded(true)
      } else if (buildLoaded && currentBuild) {
        // For signed-in users with build data, load from build
        const options = currentBuild.selections?.options || []
        const selectedPackage = currentBuild.selections?.package || ''
        
        console.log('Loading customization from build:', {
          buildId: currentBuild._id,
          modelSlug: currentBuild.modelSlug,
          step: currentBuild.step,
          options: options.length,
          selectedPackage
        })
        
        setSelectedOptions(options)
        setSelectedPackage(selectedPackage)
        
        // Initialize delivery cost from loaded build if available
        if (currentBuild.pricing?.delivery !== undefined && currentBuild.pricing.delivery !== null) {
          setDeliveryCost(roundToCents(currentBuild.pricing.delivery))
          console.log('Initialized delivery cost from build:', currentBuild.pricing.delivery)
        } else {
          console.log('No valid delivery cost found in build, will calculate fresh')
          setDeliveryCost(null)
        }
        
        addToast({
          type: 'info',
          title: 'Build Restored',
          message: 'Your previous build has been restored.'
        })
        
        console.log('Restored build customization:', { options, selectedPackage })
        setCustomizationLoaded(true)
      } else if (isSignedIn && !specificBuildId) {
        // Fallback: load from user's builds if no specific buildId
        loadUserBuildsForModel(actualModelCode)
      }
    }
  }, [isSignedIn, actualModelCode, customizationLoaded, addToast, buildLoaded, currentBuild, specificBuildId])

  // Handle redirect back after sign-in
  useEffect(() => {
    if (isSignedIn && actualModelCode && customizationLoaded) {
      // Check if we're returning from a sign-in redirect
      const urlParams = new URLSearchParams(window.location.search)
      const isRedirect = urlParams.get('redirect') || urlParams.get('from')
      
      if (isRedirect) {
        console.log('Detected redirect back to customization page, ensuring customizations are loaded')
        // Force reload of customizations
        loadUserBuildsForModel(actualModelCode)
      }
    }
  }, [isSignedIn, actualModelCode, customizationLoaded])



  // Load user's builds for this model
  const loadUserBuildsForModel = async (modelCode) => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/builds', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const builds = await response.json()
        // Find builds for this model, prioritizing those in progress (step > 1)
        const modelBuilds = builds.filter(b => 
          b.modelSlug === modelCode || b.modelSlug === modelId
        )
        
        // Sort by: 1) builds in progress (step > 1), 2) most recent
        const sortedBuilds = modelBuilds.sort((a, b) => {
          const aInProgress = (a.step || 1) > 1
          const bInProgress = (b.step || 1) > 1
          
          if (aInProgress && !bInProgress) return -1
          if (!aInProgress && bInProgress) return 1
          
          // If both are in progress or both are not, sort by most recent
          return new Date(b.createdAt) - new Date(a.createdAt)
        })

        if (sortedBuilds.length > 0) {
          const latestBuild = sortedBuilds[0]
          const options = latestBuild.selections?.options || []
          const selectedPackage = latestBuild.selections?.package || ''
          
          console.log('Found builds for model:', {
            modelCode,
            modelId,
            totalBuilds: builds.length,
            modelBuilds: modelBuilds.length,
            sortedBuilds: sortedBuilds.map(b => ({
              id: b._id,
              modelSlug: b.modelSlug,
              step: b.step,
              createdAt: b.createdAt,
              inProgress: (b.step || 1) > 1
            })),
            selectedBuild: {
              id: latestBuild._id,
              modelSlug: latestBuild.modelSlug,
              step: latestBuild.step,
              inProgress: (latestBuild.step || 1) > 1
            }
          })
          
          console.log('Loading build data:', {
            buildId: latestBuild._id,
            modelSlug: latestBuild.modelSlug,
            pricing: latestBuild.pricing,
            deliveryCost: latestBuild.pricing?.delivery
          })
          
          setSelectedOptions(options)
          setSelectedPackage(selectedPackage)
          
                     // Initialize delivery cost from loaded build if available
           if (latestBuild.pricing?.delivery !== undefined && latestBuild.pricing.delivery !== null) {
             setDeliveryCost(roundToCents(latestBuild.pricing.delivery))
             console.log('Initialized delivery cost from loaded build:', latestBuild.pricing.delivery)
           } else {
             console.log('No valid delivery cost found in loaded build, keeping current delivery cost')
             // Don't reset deliveryCost to null if we already have a value
           }
          
          addToast({
            type: 'info',
            title: 'Build Restored',
            message: 'Your previous build has been restored.'
          })
          
          console.log('Restored build customization:', { options, selectedPackage })
          setCustomizationLoaded(true)
        } else {
          // If no builds found, try to load from migrated anonymous customizations
          const migratedCustomization = loadMigratedCustomization(modelCode)
          if (migratedCustomization) {
            setSelectedOptions(migratedCustomization.selectedOptions || [])
            setSelectedPackage(migratedCustomization.selectedPackage || '')
            addToast({
              type: 'info',
              title: 'Customization Restored',
              message: 'Your previous customization has been restored.'
            })
          }
          setCustomizationLoaded(true)
        }
      }
    } catch (error) {
      console.error('Failed to load user builds:', error)
      setCustomizationLoaded(true) // Set to true even on error to prevent infinite loading
    }
  }

  // Load migrated customization from localStorage (temporary storage after migration)
  const loadMigratedCustomization = (modelCode) => {
    try {
      const key = `migrated_${modelCode}_${user?.id}`
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        // Clear the temporary storage after loading
        localStorage.removeItem(key)
        return data
      }
    } catch (error) {
      console.error('Failed to load migrated customization:', error)
    }
    return null
  }

  // Auto-save customization changes for anonymous users
  useEffect(() => {
    if (!isSignedIn && actualModelCode && customizationLoaded) {
      const timeoutId = setTimeout(() => {
        saveAnonymousCustomization(actualModelCode, {
          selectedOptions,
          selectedPackage
        })
      }, 1000) // Debounce saves by 1 second

      return () => clearTimeout(timeoutId)
    }
  }, [selectedOptions, selectedPackage, isSignedIn, actualModelCode, customizationLoaded])

  // Define computePricing BEFORE the useEffect that uses it
  const computePricing = useCallback(() => {
    if (!model) {
      return {
        base: 0,
        options: 0,
        package: 0,
        subtotal: 0,
        delivery: 0,
        taxes: 0,
        total: 0
      }
    }

    const base = roundToCents(Number(model.basePrice || 0))
    const optionsTotal = roundToCents(selectedOptions.reduce((s, o) => s + (o.price || 0), 0))
    const pkgDelta = roundToCents((() => {
      const pkg = (model.packages || []).find(p => (p.key || p.name) === selectedPackage)
      return pkg ? Number(pkg.priceDelta || 0) : 0
    })())
    
    // Calculate subtotal before delivery and taxes
    const subtotal = roundToCents(base + optionsTotal + pkgDelta)
    
    // Delivery cost (will be calculated based on address for signed-in users)
    const delivery = isSignedIn && deliveryCost !== null ? roundToCents(deliveryCost) : 0
    
    // Calculate taxes (6.25% for Texas)
    const taxRate = 0.0625
    const taxableAmount = roundToCents(subtotal + delivery)
    const taxes = roundToCents(taxableAmount * taxRate)
    
    const total = roundToCents(subtotal + delivery + taxes)
    
    return { 
      base, 
      options: optionsTotal, 
      package: pkgDelta, 
      subtotal,
      delivery, 
      taxes, 
      total 
    }
  }, [model, selectedOptions, selectedPackage, isSignedIn, deliveryCost])

  // Auto-save customization changes for signed-in users
  useEffect(() => {
    if (isSignedIn && currentBuild && currentBuild._id && customizationLoaded && model && !saving) {
      const timeoutId = setTimeout(async () => {
        try {
          const pricing = computePricing()
          await updateBuild({
            selections: {
              options: selectedOptions,
              package: selectedPackage
            },
            pricing
          }, { skipRefetch: true }) // Skip refetch to prevent infinite loops
          
          console.log('Auto-saved customization changes')
        } catch (error) {
          console.error('Error auto-saving customization:', error)
        }
      }, 2000) // Debounce saves by 2 seconds

      return () => clearTimeout(timeoutId)
    }
  }, [selectedOptions, selectedPackage, isSignedIn, currentBuild, customizationLoaded, updateBuild, computePricing, model, saving])

  // Clean up expired customizations on mount
  useEffect(() => {
    cleanupExpiredCustomizations()
  }, [])

  // Calculate delivery cost for signed-in users
  const calculateDeliveryCost = async () => {
    if (!isSignedIn) return

    try {
      setDeliveryLoading(true)
      
      // Try multiple sources for address data
      let addressData = null
      
      // First, try getAutoFillData
      const autoFillData = await getAutoFillData()
      console.log('Auto-fill data for delivery calculation:', autoFillData)
      
      if (autoFillData.address && autoFillData.city && autoFillData.state && autoFillData.zip) {
        addressData = {
          address: autoFillData.address,
          city: autoFillData.city,
          state: autoFillData.state,
          zip: autoFillData.zip
        }
      } else {
        // Fallback: try to get from current build's buyer info
        if (currentBuild?.buyerInfo) {
          const buyerInfo = currentBuild.buyerInfo
          if (buyerInfo.address && buyerInfo.city && buyerInfo.state && buyerInfo.zip) {
            addressData = {
              address: buyerInfo.address,
              city: buyerInfo.city,
              state: buyerInfo.state,
              zip: buyerInfo.zip
            }
            console.log('Using address from build buyer info:', addressData)
          }
        }
      }
      
      if (!addressData) {
        console.log('No complete address found for delivery calculation')
        setDeliveryCost(null) // Set to null when no address available
        return
      }

      console.log('Calculating delivery cost with address:', addressData)

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
        setDeliveryCost(calculatedCost)
        console.log('Delivery cost calculated:', calculatedCost)
        
        // Update the build with the new delivery cost if we have a current build
        if (currentBuild && currentBuild._id) {
          try {
            const pricing = computePricing()
            await updateBuild({
              pricing
            }, { skipRefetch: true })
            console.log('Updated build with new delivery cost')
          } catch (error) {
            console.error('Error updating build with delivery cost:', error)
          }
        }
      } else {
        console.error('Failed to calculate delivery cost')
        setDeliveryCost(null) // Set to null on error
      }
    } catch (error) {
      console.error('Error calculating delivery cost:', error)
      setDeliveryCost(null) // Set to null on error
    } finally {
      setDeliveryLoading(false)
    }
  }

  // Calculate delivery cost when user signs in
  useEffect(() => {
    console.log('Delivery cost useEffect triggered:', {
      isSignedIn,
      deliveryCost,
      customizationLoaded,
      hasBuildDeliveryCost: currentBuild?.pricing?.delivery !== undefined && currentBuild?.pricing?.delivery !== null
    })
    
    // Only calculate if signed in, customization is loaded, deliveryCost is null, AND we don't have delivery cost from build
    if (isSignedIn && customizationLoaded && deliveryCost === null && 
        (currentBuild?.pricing?.delivery === undefined || currentBuild?.pricing?.delivery === null)) {
      console.log('Triggering delivery cost calculation')
      calculateDeliveryCost()
    } else if (!isSignedIn) {
      setDeliveryCost(null) // Reset to null when not signed in
    }
  }, [isSignedIn, deliveryCost, customizationLoaded, currentBuild?.pricing?.delivery]) // Add build delivery cost dependency

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
                features: localModel.features || [],
                packages: []
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
              features: localModel.features || [],
              packages: []
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

  const handleSaveCustomization = async () => {
    if (!isSignedIn) {
      // Redirect to sign-in page
      navigate('/sign-in?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
      return
    }

    if (!model) {
      addToast({ 
        type: 'error', 
        title: 'Cannot Save',
        message: 'Model data is not loaded yet. Please wait and try again.'
      })
      return
    }

    setSaving(true)
    try {
      const pricing = computePricing()
      const body = {
        modelSlug: modelId,
        modelName: model.name || '',
        basePrice: Number(model.basePrice || 0),
        selections: {
          options: selectedOptions,
          package: selectedPackage
        },
        pricing
      }
      
      const token = await getToken()
      let buildId = currentBuild?._id
      
             // Always try to update existing build first, then create new if needed
       if (currentBuild && currentBuild._id) {
         console.log('Updating existing build:', currentBuild._id)
         const updateRes = await fetch(`/api/builds/${currentBuild._id}`, {
           method: 'PATCH',
           headers: { 
             'Content-Type': 'application/json', 
             ...(token ? { Authorization: `Bearer ${token}` } : {}) 
           },
           body: JSON.stringify(body)
         })
         
         if (updateRes.ok) {
           const updatedBuild = await updateRes.json()
           buildId = updatedBuild._id
           console.log('Build updated successfully:', buildId)
         } else {
           console.log('Failed to update build, creating new one')
           // Fallback to creating new build
           const key = `${Date.now()}-${user?.id || 'anon'}-${actualModelCode}`
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
           buildId = data.buildId
           console.log('New build created:', buildId)
         }
       } else {
         // Create new build if no existing build
         console.log('Creating new build')
         const key = `${Date.now()}-${user?.id || 'anon'}-${actualModelCode}`
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
         buildId = data.buildId
         console.log('New build created:', buildId)
       }
      
      // Clear anonymous customization after successful save
      clearAnonymousCustomization(actualModelCode)
      
      addToast({ 
        type: 'success', 
        title: 'Customization Saved!',
        message: 'Your home design has been saved to your account.'
      })
      
      // Update build step to 4 (Delivery Address)
      await updateBuildStep(buildId, 4, token)
      
      // Navigate to the next step in the funnel (Buyer Info)
      navigate(`/checkout/${buildId}/buyer`)
      
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
    navigate('/sign-up?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
  }

  const handleSignIn = () => {
    navigate('/sign-in?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
  }

  // Handle option selection changes
  const handleOptionsChange = (newOptions) => {
    setSelectedOptions(newOptions)
  }

  // Handle package selection changes
  const handlePackageChange = (newPackage) => {
    setSelectedPackage(newPackage)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
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
      


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FunnelProgress
          current="Customize!"
          isSignedIn={isSignedIn}
          onNavigate={(stepName, stepIndex) => {
            // Use the actual build ID from currentBuild if available, otherwise use modelId
            const actualBuildId = currentBuild?._id || modelId
            navigateToStep(stepName, 'Customize!', actualBuildId, isSignedIn, currentBuild, navigate, addToast, () => {
              // Invalidate cache before navigation to ensure fresh data
              if (currentBuild?._id) {
                buildCache.delete(currentBuild._id)
              }
            })
          }}
          build={currentBuild}
          buildId={currentBuild?._id || modelId}
        />
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(`/models/${modelId}`)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            ← Back to {model.name}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Model Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Model Header */}
            <div className="card">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {model.name}
              </h1>
              <p className="text-xl text-yellow-500 font-semibold mb-4">
                Starting at {formatCurrency(Number(model.basePrice || 0))}
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
                    <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <PackagesSelector packages={model.packages} value={selectedPackage} onChange={handlePackageChange} />
              </div>
            )}

            {/* Additional Add-Ons */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Additional Add-Ons</h2>
              <PublicOptionSelector options={OPTIONS} value={selectedOptions} onChange={handleOptionsChange} />
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
                  <span className="font-medium">{formatCurrency(pricing.base)}</span>
                </div>
                {pricing.package > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Package</span>
                    <span className="font-medium">+{formatCurrency(pricing.package)}</span>
                  </div>
                )}
                {pricing.options > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Add-ons</span>
                    <span className="font-medium">+{formatCurrency(pricing.options)}</span>
                  </div>
                )}
                
                {/* Subtotal */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal</span>
                    <span>{formatCurrency(pricing.subtotal)}</span>
                  </div>
                </div>
                
                {/* Delivery */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Delivery</span>
                  {isSignedIn ? (
                    deliveryLoading ? (
                      <span className="text-sm text-gray-500">Calculating...</span>
                    ) : deliveryCost === null ? (
                      <span className="text-sm text-gray-500">N/A</span>
                    ) : (
                      <span className="font-medium">{formatCurrency(deliveryCost)}</span>
                    )
                  ) : (
                    <span className="text-sm text-yellow-500 font-medium text-center ml-4">
                      <button 
                        onClick={handleCreateAccount}
                        className="text-yellow-500 hover:text-yellow-400 underline cursor-pointer"
                      >
                        Create Account
                      </button>
                      <br />
                      to discover delivery cost
                    </span>
                  )}
                </div>
                
                {/* Taxes */}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Taxes (6.25%)</span>
                  <span className="font-medium">{formatCurrency(pricing.taxes)}</span>
                </div>
                
                {/* Total */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-yellow-500">{formatCurrency(pricing.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Authentication Gate */}
            <div className="card">
              {isSignedIn ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    To Continue Click
                  </h3>
                  <button
                    onClick={handleSaveCustomization}
                    disabled={saving}
                    className="w-full btn-primary text-lg py-4 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Next Step'}
                  </button>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Your customization is automatically saved as you make changes.
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
                    Already have an account? <button onClick={handleSignIn} className="text-yellow-500 hover:text-yellow-400 underline">Sign in here</button>
                  </p>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Your customization is automatically saved and will be restored when you return.
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
