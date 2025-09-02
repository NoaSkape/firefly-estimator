import React, { useState } from 'react'
import { 
  HeartIcon,
  PhotoIcon,
  UserIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function UserStorySubmission({ 
  className = '',
  onStorySubmit = () => {}
}) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    story: '',
    photos: [],
    tinyHomeType: '',
    location: '',
    contactPermission: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Here you would typically send to your API
      await onStorySubmit(formData)
      
      // Reset form and close
      setFormData({
        name: '',
        email: '',
        story: '',
        photos: [],
        tinyHomeType: '',
        location: '',
        contactPermission: false
      })
      setIsFormOpen(false)
      
      // Show success message
      alert('Thank you for sharing your story! We\'ll review it and may feature it on our blog.')
    } catch (error) {
      alert('There was an error submitting your story. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  if (!isFormOpen) {
    return (
      <div className={`user-story-cta ${className}`}>
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 text-center text-white">
          <HeartIcon className="w-16 h-16 mx-auto mb-4 text-pink-300" />
          <h3 className="text-2xl font-bold mb-4">
            Share Your Tiny Home Journey!
          </h3>
          <p className="text-lg text-blue-100 mb-6 max-w-2xl mx-auto">
            Have you experienced the freedom of tiny home living? We'd love to hear your story! 
            Share your experience, photos, and insights with our community.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
          >
            Tell Your Story!
            <ArrowRightIcon className="w-5 h-5" />
          </button>
          <p className="text-sm text-blue-200 mt-4">
            Selected stories may be featured on our blog with your permission
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`user-story-form ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Share Your Tiny Home Story
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Help inspire others with your tiny home experience
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <UserIcon className="w-4 h-4 inline mr-2" />
                Your Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <EnvelopeIcon className="w-4 h-4 inline mr-2" />
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* Tiny Home Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tiny Home Type
              </label>
              <select
                name="tinyHomeType"
                value={formData.tinyHomeType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select type...</option>
                <option value="park-model">Park Model Home</option>
                <option value="tiny-house">Tiny House</option>
                <option value="container-home">Container Home</option>
                <option value="cabin">Cabin</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location (City/State)
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Austin, TX"
              />
            </div>
          </div>

          {/* Story */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <ChatBubbleLeftRightIcon className="w-4 h-4 inline mr-2" />
              Your Story *
            </label>
            <textarea
              name="story"
              value={formData.story}
              onChange={handleInputChange}
              required
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about your tiny home experience... What inspired you? What challenges did you face? What do you love most about tiny living?"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Share your journey, tips, lessons learned, and what makes tiny home living special for you.
            </p>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <PhotoIcon className="w-4 h-4 inline mr-2" />
              Photos (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <PhotoIcon className="w-4 h-4" />
                Upload Photos
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Share photos of your tiny home, lifestyle, or favorite moments
              </p>
            </div>

            {/* Photo Preview */}
            {formData.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permission */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              name="contactPermission"
              checked={formData.contactPermission}
              onChange={handleInputChange}
              className="mt-1 w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm text-gray-700 dark:text-gray-300">
              I give permission for Firefly Tiny Homes to contact me about featuring my story on the blog. 
              I understand my story and photos may be shared publicly.
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit My Story'}
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
