import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { AdvancedImage } from '@cloudinary/react'
import { createHeroImage, createThumbnailImage, createGalleryImage } from '../utils/cloudinary'
import { slugToModelId, isValidSlug, getModelBySlug } from '../utils/modelUrlMapping'
import { MODELS } from '../data/models'
import SEOHead from '../components/SEOHead'

const ModelDetail = ({ onModelSelect }) => {
  const { modelCode, slug } = useParams()
  const navigate = useNavigate()
  const { user, isSignedIn } = useUser()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingDescription, setEditingDescription] = useState(false)
  const [description, setDescription] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageTag, setImageTag] = useState('gallery')
  
  const isAdmin = user?.publicMetadata?.role === 'admin'

  // Determine the actual model code from URL parameters
  const getModelCode = () => {
    // If we have a slug, convert it to model code
    if (slug && isValidSlug(slug)) {
      return slugToModelId(slug)
    }
    // Otherwise use the modelCode parameter (legacy support)
    return modelCode
  }

  const actualModelCode = getModelCode()

  useEffect(() => {
    fetchModel()
  }, [actualModelCode])

  const fetchModel = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First try to get model from local data
      let modelData = null
      
      if (slug && isValidSlug(slug)) {
        // Use local data for slug-based URLs
        modelData = getModelBySlug(slug, MODELS)
        if (modelData) {
          setModel(modelData)
          setDescription(modelData.description || '')
          setLoading(false)
          return
        }
      }
      
      // Fallback to API call for admin features or if local data not found
      const token = await user?.getToken()
      const response = await fetch(`/api/models/${actualModelCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch model')
      }
      
      const apiModelData = await response.json()
      setModel(apiModelData)
      setDescription(apiModelData.description || '')
    } catch (err) {
      console.error('Error fetching model:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDescription = async () => {
    try {
      const token = await user?.getToken()
      const response = await fetch(`/api/models/${actualModelCode}/description`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ description })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save description')
      }
      
      setEditingDescription(false)
      await fetchModel() // Refresh the model data
    } catch (err) {
      console.error('Error saving description:', err)
    }
  }

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true)
      
      // Get signed upload parameters
      const token = await user?.getToken()
      const signResponse = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          folder: `${process.env.VITE_CLOUDINARY_ROOT_FOLDER}/${actualModelCode}`,
          tags: [imageTag]
        })
      })
      
      if (!signResponse.ok) {
        throw new Error('Failed to get upload parameters')
      }
      
      const uploadParams = await signResponse.json()
      
      // Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('timestamp', uploadParams.timestamp)
      formData.append('signature', uploadParams.signature)
      formData.append('api_key', uploadParams.apiKey)
      formData.append('folder', uploadParams.folder)
      formData.append('tags', imageTag)
      
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }
      
      const uploadResult = await uploadResponse.json()
      
      // Save image metadata to our API
      const saveResponse = await fetch(`/api/models/${actualModelCode}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          tag: imageTag
        })
      })
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save image metadata')
      }
      
      await fetchModel() // Refresh the model data
      setImageTag('gallery')
    } catch (err) {
      console.error('Error uploading image:', err)
    } finally {
      setUploadingImage(false)
    }
  }

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
            Back to Quote Builder
          </button>
        </div>
      </div>
    )
  }

  const handleChooseModel = () => {
    navigate(`/?model=${actualModelCode}`)
  }

  const nextImage = () => {
    if (model.images && model.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % model.images.length)
    }
  }

  const prevImage = () => {
    if (model.images && model.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + model.images.length) % model.images.length)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Head Component */}
      <SEOHead 
        title={model ? `${model.name} - Firefly Tiny Homes` : 'Model Not Found - Firefly Tiny Homes'}
        description={model ? `${model.name} - ${model.description || 'Explore this beautiful tiny home model from Firefly Tiny Homes.'}` : 'The model you\'re looking for doesn\'t exist.'}
        model={model}
      />
      
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
              {model.images && model.images.length > 0 ? (
                <img
                  src={model.images[currentImageIndex]?.url}
                  alt={`${model.name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-96 object-cover rounded-lg shadow-lg"
                />
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
              
              {/* Navigation Arrows */}
              {model.images && model.images.length > 1 && (
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
            {model.images && model.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {model.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden ${
                      currentImageIndex === index ? 'ring-2 ring-primary-500' : ''
                    }`}
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

            {/* Admin Image Upload */}
            {isAdmin && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Image</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image Tag
                    </label>
                    <select
                      value={imageTag}
                      onChange={(e) => setImageTag(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="gallery">Gallery</option>
                      <option value="hero">Hero</option>
                      <option value="floorplan">Floor Plan</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="living">Living Area</option>
                      <option value="bedroom">Bedroom</option>
                      <option value="bathroom">Bathroom</option>
                      <option value="exterior">Exterior</option>
                      <option value="porch">Porch</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image File
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file && file.size <= 10 * 1024 * 1024) { // 10MB limit
                          handleImageUpload(file)
                        } else {
                          alert('Please select a valid image file (max 10MB)')
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={uploadingImage}
                    />
                  </div>
                  {uploadingImage && (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Uploading image...</p>
                    </div>
                  )}
                </div>
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
                ${model.basePrice?.toLocaleString() || 'N/A'}
              </p>
            </div>

            {/* Model Description */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                {isAdmin && (
                  <button
                    onClick={() => setEditingDescription(!editingDescription)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {editingDescription ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>
              
              {editingDescription ? (
                <div className="space-y-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter model description..."
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveDescription}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescription(false)
                        setDescription(model.description || '')
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700">{model.description || 'No description available.'}</p>
              )}
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Width</span>
                  <p className="font-medium">{model.width}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Square Feet</span>
                  <p className="font-medium">{model.squareFeet} sq ft</p>
                </div>
                {model.length && (
                  <div>
                    <span className="text-sm text-gray-500">Length</span>
                    <p className="font-medium">{model.length}</p>
                  </div>
                )}
                {model.height && (
                  <div>
                    <span className="text-sm text-gray-500">Height</span>
                    <p className="font-medium">{model.height}</p>
                  </div>
                )}
                {model.weight && (
                  <div>
                    <span className="text-sm text-gray-500">Weight</span>
                    <p className="font-medium">{model.weight}</p>
                  </div>
                )}
                {model.bedrooms && (
                  <div>
                    <span className="text-sm text-gray-500">Bedrooms</span>
                    <p className="font-medium">{model.bedrooms}</p>
                  </div>
                )}
                {model.bathrooms && (
                  <div>
                    <span className="text-sm text-gray-500">Bathrooms</span>
                    <p className="font-medium">{model.bathrooms}</p>
                  </div>
                )}
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