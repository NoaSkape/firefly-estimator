import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getModelById } from '../data/baseModels'

const ModelDetail = ({ onModelSelect }) => {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  const model = getModelById(modelId)
  
  if (!model) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Model Not Found</h1>
          <p className="text-gray-600 mb-6">The model you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Back to Quote Builder
          </button>
        </div>
      </div>
    )
  }

  // Image gallery - these will be loaded from /public/models/[modelId]/
  const images = [
    { src: `/models/${model.imageFolder}/hero.jpg`, alt: `${model.name} - Hero Image` },
    { src: `/models/${model.imageFolder}/floorplan.jpg`, alt: `${model.name} - Floor Plan` },
    { src: `/models/${model.imageFolder}/kitchen.jpg`, alt: `${model.name} - Kitchen` },
    { src: `/models/${model.imageFolder}/living.jpg`, alt: `${model.name} - Living Area` },
    { src: `/models/${model.imageFolder}/bedroom.jpg`, alt: `${model.name} - Bedroom` },
    { src: `/models/${model.imageFolder}/bathroom.jpg`, alt: `${model.name} - Bathroom` },
    { src: `/models/${model.imageFolder}/exterior.jpg`, alt: `${model.name} - Exterior` },
    { src: `/models/${model.imageFolder}/porch.jpg`, alt: `${model.name} - Porch` }
  ]

  const handleChooseModel = () => {
    // Navigate back to quote builder with the selected model
    navigate(`/?model=${modelId}`)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                ← Back to Quote Builder
              </button>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Firefly Estimator
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative">
              <img
                src={images[currentImageIndex]?.src}
                alt={images[currentImageIndex]?.alt}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  e.target.src = '/models/placeholder.svg'
                  e.target.alt = 'Image not available'
                }}
              />
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                  >
                    ←
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                  >
                    →
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden ${
                      currentImageIndex === index ? 'ring-2 ring-primary-500' : ''
                    }`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/models/placeholder.svg'
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Model Information */}
          <div className="space-y-6">
            {/* Model Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {model.name}
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                {model.modelCode}
              </p>
              <p className="text-xl text-primary-600 font-semibold">
                ${model.basePrice.toLocaleString()}
              </p>
            </div>

            {/* Model Description */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700">{model.description}</p>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Length</span>
                  <p className="font-medium">{model.length}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Width</span>
                  <p className="font-medium">{model.width}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Height</span>
                  <p className="font-medium">{model.height}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Square Feet</span>
                  <p className="font-medium">{model.squareFeet} sq ft</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Weight</span>
                  <p className="font-medium">{model.weight}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Bedrooms</span>
                  <p className="font-medium">{model.bedrooms}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Bathrooms</span>
                  <p className="font-medium">{model.bathrooms}</p>
                </div>
              </div>
            </div>

            {/* Choose Model Button */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <button
                onClick={handleChooseModel}
                className="w-full btn-primary text-lg py-4"
              >
                Choose This Model
              </button>
              <p className="text-sm text-gray-600 mt-2 text-center">
                This will select this model and return you to the quote builder
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelDetail 