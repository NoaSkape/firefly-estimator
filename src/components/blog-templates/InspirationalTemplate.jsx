import React from 'react'
import { 
  HeartIcon,
  StarIcon,
  ShareIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  ArrowRightIcon,
  PlayIcon,
  CameraIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function InspirationalTemplate({ 
  postData, 
  activeSections = [], 
  onSectionDelete, 
  isPreview = false,
  isEditing = false 
}) {
  
  // Helper function to check if section is active
  const hasSection = (sectionId) => activeSections.includes(sectionId)
  
  // Calculate reading time (rough estimate: 180 words per minute for inspirational content)
  const calculateReadingTime = (content) => {
    if (!content) return 0
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length
    return Math.ceil(wordCount / 180)
  }
  
  const readingTime = calculateReadingTime(postData.content)
  
  // Sample gallery images (in real implementation, these would come from postData)
  const sampleGalleryImages = [
    '/hero/tiny-home-dusk.png',
    '/logo/firefly-logo.png',
    '/app-icon.png'
  ]
  
  // Sample testimonials
  const sampleTestimonials = [
    {
      name: "Sarah Johnson",
      role: "Tiny Home Owner",
      content: "Firefly Tiny Homes transformed our living experience. The quality and attention to detail is incredible!",
      rating: 5,
      image: "/app-icon.png"
    },
    {
      name: "Mike Chen",
      role: "First-time Buyer",
      content: "I never thought downsizing could be so liberating. This home has everything we need and more.",
      rating: 5,
      image: "/app-icon.png"
    }
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-orange-900/20">
      {/* Hero Section */}
      {hasSection('hero') && (
        <div className="relative h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600">
          {postData.featuredImage && (
            <img
              src={typeof postData.featuredImage === 'string' ? postData.featuredImage : postData.featuredImage.url}
              alt="Hero image"
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-orange-900/40" />
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center text-white max-w-5xl px-6">
              <div className="flex items-center justify-center mb-6">
                <SparklesIcon className="w-16 h-16 mr-4 animate-pulse" />
                <span className="text-2xl font-medium">Inspiration Gallery</span>
              </div>
              {hasSection('title') && (
                <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  {postData.title || 'Your Inspirational Title'}
                </h1>
              )}
              {hasSection('excerpt') && postData.excerpt && (
                <p className="text-2xl md:text-3xl text-purple-100 max-w-4xl mx-auto leading-relaxed mb-8">
                  {postData.excerpt}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl">
                  Get Inspired
                </button>
                <button className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-purple-600 transition-all transform hover:scale-105">
                  <PlayIcon className="w-6 h-6 inline mr-2" />
                  Watch Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Title Section (if no hero) */}
        {!hasSection('hero') && hasSection('title') && (
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <SparklesIcon className="w-12 h-12 text-purple-600 mr-4" />
              <span className="text-xl font-medium text-purple-600">Inspiration Gallery</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-8">
              {postData.title || 'Your Inspirational Title'}
            </h1>
            {hasSection('excerpt') && postData.excerpt && (
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto">
                {postData.excerpt}
              </p>
            )}
          </div>
        )}
        
        {/* Featured Image Section */}
        {hasSection('featuredImage') && postData.featuredImage && !hasSection('hero') && (
          <div className="relative mb-16">
            <img
              src={typeof postData.featuredImage === 'string' ? postData.featuredImage : postData.featuredImage.url}
              alt="Featured image"
              className="w-full h-96 object-cover rounded-2xl shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-2xl" />
          </div>
        )}
        
        {/* Image Gallery Section */}
        {hasSection('gallery') && (
          <div className="mb-16">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-4">
                <CameraIcon className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Visual Inspiration
                </h2>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Explore these stunning examples of tiny home living and design
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleGalleryImages.map((image, index) => (
                <div key={index} className="group relative overflow-hidden rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
                  <img
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform">
                    <h3 className="font-semibold">Inspiration {index + 1}</h3>
                    <p className="text-sm text-gray-200">Click to explore</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Content Section */}
        {hasSection('content') && (
          <div className="max-w-4xl mx-auto mb-16">
            <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">
              <div dangerouslySetInnerHTML={{ __html: postData.content || '<p>Your inspirational content will appear here...</p>' }} />
            </div>
          </div>
        )}
        
        {/* Testimonials Section */}
        {hasSection('testimonials') && (
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                What People Are Saying
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Real stories from real people who found their inspiration
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {sampleTestimonials.map((testimonial, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-all duration-300">
                  <div className="flex items-center mb-6">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full mr-4"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {testimonial.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <StarIcon key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic">
                    "{testimonial.content}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Call to Action Section */}
        {hasSection('callToAction') && (
          <div className="text-center mb-16">
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-3xl p-12 text-white">
              <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
              <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
                Join thousands of others who have discovered the freedom and beauty of tiny home living
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl">
                  Get Started Today
                </button>
                <button className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-purple-600 transition-all transform hover:scale-105">
                  <ArrowRightIcon className="w-6 h-6 inline mr-2" />
                  Learn More
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Social Share Section */}
        {hasSection('socialShare') && (
          <div className="text-center mb-16">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Share This Inspiration
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors transform hover:scale-105">
                <ShareIcon className="w-5 h-5" />
                Facebook
              </button>
              <button className="flex items-center gap-2 bg-pink-600 text-white px-6 py-3 rounded-full hover:bg-pink-700 transition-colors transform hover:scale-105">
                <ShareIcon className="w-5 h-5" />
                Instagram
              </button>
              <button className="flex items-center gap-2 bg-blue-400 text-white px-6 py-3 rounded-full hover:bg-blue-500 transition-colors transform hover:scale-105">
                <ShareIcon className="w-5 h-5" />
                Twitter
              </button>
              <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition-colors transform hover:scale-105">
                <ShareIcon className="w-5 h-5" />
                WhatsApp
              </button>
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="text-center mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Take Action
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-800/40 dark:hover:to-pink-800/40 transition-all transform hover:scale-105">
                <HeartIcon className="w-8 h-8 text-red-500" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Like</span>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl hover:from-blue-200 hover:to-cyan-200 dark:hover:from-blue-800/40 dark:hover:to-cyan-800/40 transition-all transform hover:scale-105">
                <BookmarkIcon className="w-8 h-8 text-blue-500" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Save</span>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl hover:from-green-200 hover:to-emerald-200 dark:hover:from-green-800/40 dark:hover:to-emerald-800/40 transition-all transform hover:scale-105">
                <ChatBubbleLeftIcon className="w-8 h-8 text-green-500" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Comment</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Related Posts */}
        {hasSection('relatedPosts') && (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
              More Inspiration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Minimalist Living", image: "/app-icon.png", time: "6 min read" },
                { title: "Design Trends", image: "/app-icon.png", time: "8 min read" },
                { title: "Success Stories", image: "/app-icon.png", time: "10 min read" }
              ].map((post, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {post.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {post.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
