import React, { useState, useEffect } from 'react'
import { 
  BookmarkIcon, 
  HeartIcon, 
  ShareIcon, 
  ChatBubbleLeftIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon, BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'

export default function BlogEngagement({ 
  postData = {},
  views = 0,
  likes = 0,
  comments = 0,
  readTime = '5 min read',
  className = '' 
}) {
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(likes || Math.floor(Math.random() * 50) + 10)
  const [viewCount] = useState(views || Math.floor(Math.random() * 200) + 100)
  const [commentCount] = useState(comments || Math.floor(Math.random() * 20) + 5)

  // Handle like
  const handleLike = () => {
    if (isLiked) {
      setLikeCount(prev => prev - 1)
      setIsLiked(false)
    } else {
      setLikeCount(prev => prev + 1)
      setIsLiked(true)
    }
  }

  // Handle bookmark
  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
  }

  // Handle share
  const handleShare = async () => {
    if (navigator.share && postData.title) {
      try {
        await navigator.share({
          title: postData.title,
          text: postData.excerpt || 'Check out this article from Firefly Tiny Homes',
          url: window.location.href
        })
      } catch (error) {
        // Fallback to clipboard
        fallbackShare()
      }
    } else {
      fallbackShare()
    }
  }

  const fallbackShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      // Could add a toast notification here
      console.log('Link copied to clipboard')
    })
  }

  const handleComment = () => {
    // Scroll to comment section (if it exists) or handle comment action
    const commentSection = document.getElementById('comments')
    if (commentSection) {
      commentSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className={`blog-engagement ${className}`}>
      {/* Subtle Reading Progress Bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-8">
        <div 
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-300"
          style={{ width: '100%' }}
        />
      </div>

      {/* Main Engagement Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        {/* Article Stats */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <EyeIcon className="w-4 h-4 mr-1" />
              <span>{viewCount.toLocaleString()} views</span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="w-4 h-4 mr-1" />
              <span>{readTime}</span>
            </div>
          </div>
          
          {/* Social Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isLiked 
                  ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {isLiked ? (
                <HeartSolidIcon className="w-5 h-5" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{likeCount}</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Save for later"
            >
              {isBookmarked ? (
                <BookmarkSolidIcon className="w-5 h-5" />
              ) : (
                <BookmarkIcon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleShare}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Share article"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Engagement Call-to-Action */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              What did you think of this article?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Share your thoughts and join the conversation about tiny home living.
            </p>
            
            {/* Comment Button */}
            <button 
              onClick={handleComment}
              className="inline-flex items-center px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
              Leave a Comment ({commentCount})
            </button>
          </div>
        </div>

        {/* Related Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Explore Our Models
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Ready to start your tiny home journey? Browse our park model homes.
            </p>
            <a 
              href="/models"
              className="inline-flex items-center text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium text-sm"
            >
              View Models →
            </a>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              More Articles
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Continue reading expert insights about tiny home living.
            </p>
            <a 
              href="/blog/all"
              className="inline-flex items-center text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium text-sm"
            >
              Read More →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
