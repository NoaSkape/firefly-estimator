import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'

import { canEditModelsClient } from '../lib/canEditModels'
import { AdvancedImage } from '@cloudinary/react'
import { createHeroImage, createThumbnailImage, createGalleryImage } from '../utils/cloudinary'
import { slugToModelId, isValidSlug, getModelBySlug } from '../utils/modelUrlMapping'
import { MODELS } from '../data/models'
import SEOHead from '../components/SEOHead'
import FunnelProgress from '../components/FunnelProgress'
import AdminModelEditor from '../components/AdminModelEditor'

const ModelDetail = ({ onModelSelect }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Inline editing and inline upload removed; edits happen in AdminModelEditor only
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isTourOpen, setIsTourOpen] = useState(false)
  const thumbnailContainerRef = useRef(null)
  const thumbnailRefs = useRef([])
  
  // Touch/swipe handling for mobile image gallery
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !model?.images) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      setCurrentImageIndex((prev) => (prev + 1) % model.images.length)
    }
    if (isRightSwipe) {
      setCurrentImageIndex((prev) => (prev - 1 + model.images.length) % model.images.length)
    }
  }

  // Fullscreen viewer swipe handling
  const [viewerTouchStart, setViewerTouchStart] = useState(null)
  const [viewerTouchEnd, setViewerTouchEnd] = useState(null)

  const onViewerTouchStart = (e) => {
    setViewerTouchEnd(null)
    setViewerTouchStart(e.targetTouches[0].clientX)
  }

  const onViewerTouchMove = (e) => {
    setViewerTouchEnd(e.targetTouches[0].clientX)
  }

  const onViewerTouchEnd = () => {
    if (!viewerTouchStart || !viewerTouchEnd || !model?.images) return
    const distance = viewerTouchStart - viewerTouchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      setCurrentImageIndex((prev) => (prev + 1) % model.images.length)
    }
    if (isRightSwipe) {
      setCurrentImageIndex((prev) => (prev - 1 + model.images.length) % model.images.length)
    }
  }

  // Auto-scroll thumbnail into view when current image changes
  useEffect(() => {
    // Only auto-scroll thumbnails if the component has been loaded for a moment
    // This prevents interference with initial page scroll-to-top
    const timer = setTimeout(() => {
      if (thumbnailRefs.current[currentImageIndex] && thumbnailContainerRef.current) {
        const thumbnail = thumbnailRefs.current[currentImageIndex]
        const container = thumbnailContainerRef.current
        
        // Calculate if thumbnail is visible
        const containerRect = container.getBoundingClientRect()
        const thumbnailRect = thumbnail.getBoundingClientRect()
        
        // Check if thumbnail is outside the visible area
        if (thumbnailRect.left < containerRect.left || thumbnailRect.right > containerRect.right) {
          thumbnail.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          })
        }
      }
    }, 100) // Small delay to ensure page scroll-to-top completes first

    return () => clearTimeout(timer)
  }, [currentImageIndex])

  // Initialize thumbnail refs array
  useEffect(() => {
    if (model?.images) {
      thumbnailRefs.current = thumbnailRefs.current.slice(0, model.images.length)
    }
  }, [model?.images])

  // Close viewer first on browser back
  useEffect(() => {
    if (!isViewerOpen) return
    function onPop() {
      setIsViewerOpen(false)
    }
    window.addEventListener('popstate', onPop)
    // push a state so back closes viewer first
    window.history.pushState({ viewer: true }, '')
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [isViewerOpen])
  const debug = (import.meta.env?.VITE_DEBUG_ADMIN === 'true')

  // Determine admin: role metadata OR email included in VITE_ADMIN_EMAILS
  const isAdmin = canEditModelsClient(user)

  // Determine the actual model code from URL parameters
  const getModelCode = () => {
    if (!id) return null
    // If id is a slug, map to modelCode for Cloudinary folder usage
    if (isValidSlug(id)) {
      return slugToModelId(id)
    }
    // Otherwise, assume it's already a code
    return id
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
      
      // Fetch from API using the actual model code
      if (actualModelCode) {
        try {
          const token = await getToken()
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
          const url = `/api/models/${actualModelCode}`
          if (debug) {
            const maskedAuth = headers.Authorization ? `${headers.Authorization.slice(0, 13)}...${headers.Authorization.slice(-6)}` : undefined
            console.log('[DEBUG_ADMIN] Fetch model', { url, headers: { ...headers, Authorization: maskedAuth } })
          }
          const response = await fetch(url, { headers })
          
          if (response.ok) {
            const apiModelData = await response.json()
            setModel(apiModelData)
            if (debug) {
              console.log('[DEBUG_ADMIN] Model loaded from API', {
                _id: apiModelData?._id,
                modelCode: apiModelData?.modelCode,
                imagesLength: Array.isArray(apiModelData?.images) ? apiModelData.images.length : 0,
                featuresLength: Array.isArray(apiModelData?.features) ? apiModelData.features.length : 0
              })
            }
            
          } else {
            // If API fails, try to find in local data as fallback
            const localModel = MODELS.find(m => m.id === actualModelCode)
            if (localModel) {
              const transformedModel = {
                ...localModel,
                modelCode: localModel.subtitle,
                width: localModel.specs?.width,
                length: localModel.specs?.length,
                height: localModel.specs?.height,
                weight: localModel.specs?.weight,
                bedrooms: localModel.specs?.bedrooms,
                bathrooms: localModel.specs?.bathrooms,
                squareFeet: calculateSquareFeet(localModel.specs?.length, localModel.specs?.width),
                images: [],
                features: localModel.features || []
              }
              setModel(transformedModel)
              
            } else {
              throw new Error('Model not found')
            }
          }
        } catch (apiErr) {
          console.error('API error:', apiErr)
          if (debug) console.log('[DEBUG_ADMIN] Fetch model error', apiErr)
          // Try local data as final fallback
          const localModel = MODELS.find(m => m.id === actualModelCode)
          if (localModel) {
            const transformedModel = {
              ...localModel,
              modelCode: localModel.subtitle,
              width: localModel.specs?.width,
              length: localModel.specs?.length,
              height: localModel.specs?.height,
              weight: localModel.specs?.weight,
              bedrooms: localModel.specs?.bedrooms,
              bathrooms: localModel.specs?.bathrooms,
              squareFeet: calculateSquareFeet(localModel.specs?.length, localModel.specs?.width),
              images: [],
              features: localModel.features || []
            }
            setModel(transformedModel)
            
          } else {
            throw new Error('Model not found')
          }
        }
      } else {
        throw new Error('Invalid model code')
      }
    } catch (err) {
      console.error('Error fetching model:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to calculate square feet
  const calculateSquareFeet = (length, width) => {
    if (!length || !width) return null
    
    // Extract numbers from strings like "30'" and "8'6\""
    const lengthNum = parseFloat(length.replace(/['"]/g, ''))
    const widthNum = parseFloat(width.replace(/['"]/g, ''))
    
    if (isNaN(lengthNum) || isNaN(widthNum)) return null
    
    return Math.round(lengthNum * widthNum)
  }

  // Description editing moved into AdminModelEditor. All image uploads handled inside AdminModelEditor.
  
  // Image navigation helpers must be declared before any early returns
  const nextImage = () => {
    if (model?.images && model.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % model.images.length)
    }
  }

  const prevImage = () => {
    if (model?.images && model.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + model.images.length) % model.images.length)
    }
  }

  // Keyboard navigation in viewer – keep before conditional returns to preserve hook order
  useEffect(() => {
    if (!isViewerOpen) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'Escape') setIsViewerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isViewerOpen, model?.images?.length])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading model...</p>
        </div>
      </div>
    )
  }

  if (error || !model) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Model Not Found</h1>
          <p className="text-gray-600 mb-6">The model you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const handleChooseModel = () => {
    // Navigate to builds page
    navigate(`/builds`)
  }



  const handleModelUpdate = (updated) => {
    setModel(updated)
    if (debug) {
      console.log('[DEBUG_ADMIN] ModelDetail onSaved(received)', {
        _id: updated?._id,
        modelCode: updated?.modelCode,
        imagesLength: Array.isArray(updated?.images) ? updated.images.length : 0,
        featuresLength: Array.isArray(updated?.features) ? updated.features.length : 0
      })
    }
  }

  

  return (
    <div className="min-h-screen">
      {/* SEO Head Component */}
      <SEOHead 
        title={model ? `${model.name} - Firefly Tiny Homes` : 'Model Not Found - Firefly Tiny Homes'}
        description={model ? `${model.name} - ${model.description || 'Explore this beautiful tiny home model from Firefly Tiny Homes.'}` : 'The model you\'re looking for doesn\'t exist.'}
        model={model}
      />
      


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FunnelProgress
          current="Choose Your Home"
          isSignedIn={isSignedIn}
          onNavigate={(label)=>{
            // support quick back to home/explore
            if (label === 'Choose Your Home') navigate('/models')
          }}
        />
        {/* Admin Edit Button */}
        {isAdmin && (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="px-3 py-2 btn-primary rounded-md"
            >
              Edit
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative">
              {model.images && model.images.length > 0 ? (
                <div
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  className="relative"
                >
                  <img
                    src={model.images[currentImageIndex]?.url}
                    alt={`${model.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-96 object-cover rounded-lg shadow-lg cursor-zoom-in"
                    onClick={() => setIsViewerOpen(true)}
                  />
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-lg shadow-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>No images available</p>
                    {isAdmin && (
                      <p className="text-sm mt-2">Upload images to get started</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Navigation Arrows - Hidden on mobile */}
              {model.images && model.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="hidden md:block absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                  >
                    ←
                  </button>
                  <button
                    onClick={nextImage}
                    className="hidden md:block absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                  >
                    →
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {model.images && model.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto" ref={thumbnailContainerRef}>
                {model.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden ${
                      currentImageIndex === index ? 'ring-2 ring-yellow-500' : ''
                    }`}
                    ref={el => thumbnailRefs.current[index] = el}
                  >
                    <img
                      src={image.url}
                      alt={`${model.name} - Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* 3D Virtual Tour Button */}
            {model.tourUrl && (
              <div className="pt-4">
                <button
                  onClick={() => setIsTourOpen(true)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Explore This Home In 3D</span>
                </button>
              </div>
            )}

            {/* Inline Admin Image Upload removed; use Edit panel instead */}
            
            {/* Model Description - positioned below images, perfectly aligned width */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-gray-100 mb-4">About This Model</h2>
              <div className="text-gray-300 max-w-none">
                {model.description ? (
                  model.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 leading-relaxed text-lg">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-gray-400 italic text-lg">
                    No description available. Please contact us for more information about this model.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Model Information */}
          <div className="space-y-6">
            {/* Model Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {model.name}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                {model.modelCode}
              </p>
              <p className="text-xl text-yellow-500 font-semibold">
                ${model.basePrice?.toLocaleString() || 'N/A'}
              </p>
            </div>

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
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Customize Your Home → proceed to Customize page */}
            <div className="card">
              <button
                onClick={() => navigate(`/customize/${actualModelCode}`)}
                className="w-full btn-primary text-lg py-4"
              >
                Customize Your Home!
              </button>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Add packages and options to personalize your home. Next: Customize.
              </p>
            </div>
          </div>
        </div>


      </div>

      {/* 3D Tour Modal */}
      {isTourOpen && model?.tourUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-black">Virtual 3D Tour - {model.name}</h3>
              <button 
                onClick={() => setIsTourOpen(false)} 
                className="text-gray-500 hover:text-gray-700 text-xl px-2"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe 
                src={`${model.tourUrl}${model.tourUrl.includes('?') ? '&' : '?'}play=1&qs=1`}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
                allow="xr-spatial-tracking"
                title={`3D Tour of ${model.name}`}
                onError={() => {
                  // Fallback: open in new window if iframe fails
                  window.open(model.tourUrl, '_blank');
                  setIsTourOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isAdmin && isEditorOpen && model && (
        <AdminModelEditor
          idParam={actualModelCode}
          model={model}
          onClose={() => setIsEditorOpen(false)}
          onSaved={handleModelUpdate}
        />
      )}

      {/* Fullscreen Image Viewer */}
      {isViewerOpen && model?.images?.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onTouchStart={onViewerTouchStart}
          onTouchMove={onViewerTouchMove}
          onTouchEnd={onViewerTouchEnd}
        >
          {/* Side arrows for better UX - hidden on mobile */}
          {model.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded hidden md:block"
              >
                ←
              </button>
              <button
                onClick={nextImage}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded hidden md:block"
              >
                →
              </button>
            </>
          )}
          <button
            aria-label="Close"
            className="absolute top-4 right-4 text-white bg-black/60 hover:bg-black/80 rounded px-3 py-1 z-10"
            onClick={() => setIsViewerOpen(false)}
          >
            ✕
          </button>
          <div className="flex-1 flex items-center justify-center select-none">
            <img
              src={model.images[currentImageIndex]?.url}
              alt={`${model.name} - Image ${currentImageIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
          </div>
          {model.images.length > 1 && (
            <div className="p-4 flex items-center justify-between text-white">
              <button
                onClick={prevImage}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded hidden md:block"
              >
                Prev
              </button>
              <div className="space-x-2 overflow-x-auto">
                {model.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`inline-block w-16 h-16 rounded overflow-hidden ${idx===currentImageIndex?'ring-2 ring-yellow-400':''}`}
                  >
                    <img src={img.url} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <button
                onClick={nextImage}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded hidden md:block"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ModelDetail 