import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from './ToastProvider'
import analytics from '../utils/analytics'

export default function MobileQuickViewModal({ model, isOpen, onClose, onCustomize }) {
  const { addToast } = useToast()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const modalRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleImageSwipe = (direction) => {
    if (!model.images || model.images.length <= 1) return
    
    if (direction === 'left') {
      setCurrentImageIndex((prev) => 
        prev === model.images.length - 1 ? 0 : prev + 1
      )
    } else if (direction === 'right') {
      setCurrentImageIndex((prev) => 
        prev === 0 ? model.images.length - 1 : prev - 1
      )
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    
    addToast({
      type: isLiked ? 'info' : 'success',
      title: isLiked ? 'Removed from Favorites' : 'Added to Favorites',
      message: isLiked ? `${model.name} removed from your favorites` : `${model.name} added to your favorites`
    })
    
    analytics.trackEvent('mobile_quick_view_like', {
      modelSlug: model.slug,
      modelName: model.name,
      action: isLiked ? 'unlike' : 'like'
    })
  }

  const handleCustomize = () => {
    onCustomize(model)
    onClose()
    
    analytics.trackEvent('mobile_quick_view_customize', {
      modelSlug: model.slug,
      modelName: model.name
    })
  }

  const handleViewDetails = () => {
    // Ensure scroll to top when navigating to model details
    window.scrollTo(0, 0)
    onClose()
    
    analytics.trackEvent('mobile_quick_view_view_details', {
      modelSlug: model.slug,
      modelName: model.name
    })
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (!isOpen || !model) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        data-swipe="down"
        className="relative w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden transform transition-transform duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="mobile-button p-2 rounded-full bg-gray-100 text-gray-600"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{model.name}</h2>
              <p className="text-sm text-gray-500">Quick View</p>
            </div>
          </div>
          
          <button
            onClick={handleLike}
            className={`mobile-button p-2 rounded-full transition-colors ${
              isLiked ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100'
            }`}
            aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image Gallery */}
          <div className="relative">
            <div className="relative overflow-hidden">
              {model.images && model.images.length > 0 ? (
                <img
                  ref={imageRef}
                  src={model.images[currentImageIndex]}
                  alt={model.name}
                  className="w-full h-64 object-cover"
                  onLoad={handleImageLoad}
                  onError={() => setIsLoading(false)}
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="mobile-loading-spinner"></div>
                </div>
              )}
              
              {/* Navigation arrows */}
              {model.images && model.images.length > 1 && (
                <>
                  <button
                    onClick={() => handleImageSwipe('right')}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 mobile-button bg-black/50 text-white p-2 rounded-full"
                    aria-label="Previous image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleImageSwipe('left')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 mobile-button bg-black/50 text-white p-2 rounded-full"
                    aria-label="Next image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              
              {/* Image navigation dots */}
              {model.images && model.images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {model.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Touch/swipe area for image navigation */}
            <div 
              className="absolute inset-0"
              onTouchStart={(e) => {
                const touch = e.targetTouches[0]
                const startX = touch.clientX
                const startY = touch.clientY
                
                const handleTouchMove = (e) => {
                  const touch = e.targetTouches[0]
                  const deltaX = touch.clientX - startX
                  const deltaY = touch.clientY - startY
                  
                  // If horizontal swipe is greater than vertical, prevent default
                  if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    e.preventDefault()
                  }
                }
                
                const handleTouchEnd = (e) => {
                  const touch = e.changedTouches[0]
                  const deltaX = touch.clientX - startX
                  const deltaY = touch.clientY - startY
                  
                  // Minimum swipe distance
                  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (deltaX > 0) {
                      handleImageSwipe('right')
                    } else {
                      handleImageSwipe('left')
                    }
                  }
                  
                  document.removeEventListener('touchmove', handleTouchMove, { passive: false })
                  document.removeEventListener('touchend', handleTouchEnd)
                }
                
                document.addEventListener('touchmove', handleTouchMove, { passive: false })
                document.addEventListener('touchend', handleTouchEnd)
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const centerX = rect.width / 2
                
                if (x < centerX) {
                  handleImageSwipe('right')
                } else {
                  handleImageSwipe('left')
                }
              }}
            />
          </div>

          {/* Model Info */}
          <div className="p-4 space-y-4">
            {/* Price */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(model.basePrice)}
              </div>
              <div className="text-sm text-gray-500">Starting Price</div>
            </div>



            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Size</div>
                <div className="font-semibold text-gray-900">{model.specs?.size || 'N/A'}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Bedrooms</div>
                <div className="font-semibold text-gray-900">{model.specs?.bedrooms || 'N/A'}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Bathrooms</div>
                <div className="font-semibold text-gray-900">{model.specs?.bathrooms || 'N/A'}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Square Feet</div>
                <div className="font-semibold text-gray-900">{model.specs?.squareFeet || 'N/A'}</div>
              </div>
            </div>

            {/* Features */}
            {model.features && model.features.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Key Features</h3>
                <div className="grid grid-cols-1 gap-2">
                  {model.features.slice(0, 6).map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-600 mobile-text">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Swipe hint */}
            <div className="text-center text-xs text-gray-500 py-2">
              <p>Swipe down to close • Swipe left/right to browse images</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 space-y-3">
          <div className="flex space-x-3">
            <button
              onClick={handleCustomize}
              className="flex-1 mobile-button bg-yellow-500 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors hover:bg-yellow-400"
            >
              Customize This Home
            </button>
            
            <Link
              to={`/models/${model.slug}`}
              onClick={handleViewDetails}
              className="flex-1 mobile-button bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg text-center transition-colors hover:bg-gray-200"
            >
              View Details
            </Link>
          </div>
          
          <button
            onClick={onClose}
            className="w-full mobile-button text-gray-500 py-2 text-sm"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  )
}
