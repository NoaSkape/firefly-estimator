import React from 'react'
import { 
  UserIcon, 
  CalendarIcon, 
  ClockIcon, 
  ShareIcon,
  BookmarkIcon,
  HeartIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

export default function StoryTemplate({ 
  postData, 
  activeSections = [], 
  onSectionDelete, 
  isPreview = false,
  isEditing = false 
}) {
  
  // Helper function to check if section is active
  const hasSection = (sectionId) => activeSections.includes(sectionId)
  
  // Calculate reading time (rough estimate: 200 words per minute)
  const calculateReadingTime = (content) => {
    if (!content) return 0
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length
    return Math.ceil(wordCount / 200)
  }
  
  const readingTime = calculateReadingTime(postData.content)
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      {hasSection('hero') && (
        <div className="relative h-96 bg-gradient-to-br from-blue-600 to-purple-700">
          {postData.featuredImage && (
            <img
              src={typeof postData.featuredImage === 'string' ? postData.featuredImage : postData.featuredImage.url}
              alt="Hero image"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center text-white max-w-4xl px-6">
              {hasSection('title') && (
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  {postData.title || 'Your Story Title'}
                </h1>
              )}
              {hasSection('excerpt') && postData.excerpt && (
                <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
                  {postData.excerpt}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Title Section (if no hero) */}
            {!hasSection('hero') && hasSection('title') && (
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  {postData.title || 'Your Story Title'}
                </h1>
                {hasSection('excerpt') && postData.excerpt && (
                  <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    {postData.excerpt}
                  </p>
                )}
              </div>
            )}
            
            {/* Featured Image Section */}
            {hasSection('featuredImage') && postData.featuredImage && !hasSection('hero') && (
              <div className="relative">
                <img
                  src={typeof postData.featuredImage === 'string' ? postData.featuredImage : postData.featuredImage.url}
                  alt="Featured image"
                  className="w-full h-96 object-cover rounded-lg shadow-lg"
                />
              </div>
            )}
            
            {/* Content Section */}
            {hasSection('content') && (
              <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">
                <div dangerouslySetInnerHTML={{ __html: postData.content || '<p>Your story content will appear here...</p>' }} />
              </div>
            )}
            
            {/* Story Progress Indicator */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Story Progress
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {readingTime} min read
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: '75%' }} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                You're 75% through this story
              </p>
            </div>
            
            {/* Call to Action */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">Enjoyed This Story?</h3>
              <p className="text-blue-100 mb-6">
                Share your thoughts and experiences in the comments below
              </p>
              <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Leave a Comment
              </button>
            </div>
          </div>
          
          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Author Section */}
            {hasSection('author') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      Firefly Team
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tiny Home Experts
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Our team of tiny home specialists shares insights, stories, and expertise to help you on your journey.
                </p>
              </div>
            )}
            
            {/* Reading Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Reading Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Reading Time</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{readingTime} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Published</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {postData.publishDate ? new Date(postData.publishDate).toLocaleDateString() : 'Today'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Category</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {postData.category || 'Lifestyle'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Social Share */}
            {hasSection('socialShare') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Share This Story</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <ShareIcon className="w-4 h-4" />
                    Facebook
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors">
                    <ShareIcon className="w-4 h-4" />
                    Twitter
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <ShareIcon className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    <ShareIcon className="w-4 h-4" />
                    Email
                  </button>
                </div>
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors">
                  <BookmarkIcon className="w-4 h-4" />
                  Save for Later
                </button>
                <button className="w-full flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                  <HeartIcon className="w-4 h-4" />
                  Like Story
                </button>
                <button className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  Comment
                </button>
              </div>
            </div>
            
            {/* Related Posts */}
            {hasSection('relatedPosts') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Related Stories</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                    <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-lg flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        Tiny Home Living Tips
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">5 min read</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                    <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-lg flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        Downsizing Success Stories
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">8 min read</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
