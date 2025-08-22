import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { modelIdToSlug } from '../utils/modelUrlMapping'
import { useToast } from '../components/ToastProvider'
import analytics from '../utils/analytics'

export default function MobileModelCard({ model, onQuickView }) {
  const { addToast } = useToast()
  const [isLiked, setIsLiked] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const cardRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    // Component initialization
  }, [])

  const handleQuickView = () => {
    if (onQuickView) {
      onQuickView(model)
    }
    
    analytics.trackEvent('mobile_model_quick_view', {
      modelSlug: model.slug,
      modelName: model.name,
      action: 'swipe_left'
    })
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    
    addToast({
      type: isLiked ? 'info' : 'success',
      title: isLiked ? 'Removed from Favorites' : 'Added to Favorites',
      message: isLiked ? `${model.name} removed from your favorites` : `${model.name} added to your favorites`
    })
    
    analytics.trackEvent('mobile_model_like', {
      modelSlug: model.slug,
      modelName: model.name,
      action: isLiked ? 'unlike' : 'like',
      method: 'swipe_right'
    })
  }

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

  // Enhanced touch/swipe handling for images
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
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      handleImageSwipe('left')
    }
    if (isRightSwipe) {
      handleImageSwipe('right')
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleViewDetails = () => {
    // Ensure scroll to top when navigating to model details
    window.scrollTo(0, 0)
    
    analytics.trackEvent('mobile_model_view_details', {
      modelSlug: model.slug,
      modelName: model.name
    })
  }

  return (
    <div
      ref={cardRef}
      data-swipe="left,right"
      data-longpress="true"
      className="mobile-card bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300"
    >
      {/* Image Section */}
      <div className="relative">
        <div className="relative overflow-hidden">
          {model.images && model.images.length > 0 ? (
            <img
              ref={imageRef}
              src={model.images[currentImageIndex]}
              alt={model.name}
              className="mobile-image w-full h-48 object-cover transition-transform duration-300 hover:scale-105"
              onLoad={handleImageLoad}
              onError={() => setIsLoading(false)}
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          
          {/* Quick action indicators */}
          <div className="absolute top-2 right-2 flex space-x-1">
            <div className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              ← Quick View
            </div>
            <div className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              Like →
            </div>
          </div>
          
          {/* Price badge */}
          <div className="absolute top-2 left-2">
            <div className="bg-yellow-500 text-gray-900 font-bold px-3 py-1 rounded-full text-sm">
              {formatPrice(model.basePrice)}
            </div>
          </div>
        </div>
        
        {/* Touch/swipe area for image navigation */}
        <div 
          className="absolute inset-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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

      {/* Content Section */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 mobile-text">
            {model.name}
          </h3>
          <button
            onClick={handleLike}
            className={`mobile-button p-2 rounded-full transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-400'
            }`}
            aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-3 mobile-text">
          {model.description}
        </p>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Size</div>
            <div className="font-semibold text-gray-900">{model.specs?.size || 'N/A'}</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Bedrooms</div>
            <div className="font-semibold text-gray-900">{model.specs?.bedrooms || 'N/A'}</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Bathrooms</div>
            <div className="font-semibold text-gray-900">{model.specs?.bathrooms || 'N/A'}</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Square Feet</div>
            <div className="font-semibold text-gray-900">{model.specs?.squareFeet || 'N/A'}</div>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {model.features?.slice(0, 5).map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-4">
          <Link
            to={`/models/${model.slug}`}
            className="flex-1 mobile-button bg-yellow-500 text-gray-900 font-semibold py-3 px-4 rounded-lg text-center transition-colors hover:bg-yellow-400"
            onClick={handleViewDetails}
          >
            View Details
          </Link>
          
          <button
            onClick={handleQuickView}
            className="mobile-button bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors hover:bg-gray-200"
          >
            Quick View
          </button>
        </div>

        {/* Swipe hints */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          <p>Swipe left for Quick View • Swipe right to Like • Long press for more info</p>
        </div>
      </div>
    </div>
  )
}
