import React, { useState, useEffect, useRef } from 'react'
import { 
  BookmarkIcon, 
  HeartIcon, 
  ShareIcon, 
  ChatBubbleLeftIcon,
  EyeIcon,
  ClockIcon,
  ChartBarIcon,
  FireIcon
} from '@heroicons/react/24/outline'

export default function EngagementTracker({ 
  postData, 
  className = '' 
}) {
  const [readingProgress, setReadingProgress] = useState(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 50) + 10)
  const [viewCount, setViewCount] = useState(Math.floor(Math.random() * 200) + 100)
  const [commentCount, setCommentCount] = useState(Math.floor(Math.random() * 20) + 5)
  const [engagementScore, setEngagementScore] = useState(0)
  
  const progressRef = useRef(null)
  const startTime = useRef(Date.now())

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      if (!progressRef.current) return
      
      const element = progressRef.current
      const rect = element.getBoundingClientRect()
      const windowHeight = window.innerHeight
      
      if (rect.top <= 0 && rect.bottom >= windowHeight) {
        const progress = Math.abs(rect.top) / (element.offsetHeight - windowHeight)
        setReadingProgress(Math.min(100, Math.max(0, progress * 100)))
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track time spent
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000)
      setTimeSpent(elapsed)
      
      // Calculate engagement score based on time spent and progress
      const timeScore = Math.min(100, (elapsed / 300) * 100) // Max score at 5 minutes
      const progressScore = readingProgress
      const engagement = Math.round((timeScore + progressScore) / 2)
      setEngagementScore(engagement)
    }, 1000)

    return () => clearInterval(interval)
  }, [readingProgress])

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

  // Format time
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Get engagement level
  const getEngagementLevel = () => {
    if (engagementScore >= 80) return { level: 'Excellent', color: 'text-green-600', icon: FireIcon }
    if (engagementScore >= 60) return { level: 'Good', color: 'text-blue-600', icon: ChartBarIcon }
    if (engagementScore >= 40) return { level: 'Fair', color: 'text-yellow-600', icon: ClockIcon }
    return { level: 'Getting Started', color: 'text-gray-600', icon: EyeIcon }
  }

  const engagementInfo = getEngagementLevel()
  const EngagementIcon = engagementInfo.icon

  return (
    <div className={`engagement-tracker ${className}`} ref={progressRef}>
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Engagement Stats */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
          {/* Progress Summary */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reading Progress</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(readingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${readingProgress}%` }}
              />
            </div>
          </div>

          {/* Engagement Score */}
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <EngagementIcon className={`w-5 h-5 ${engagementInfo.color}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Engagement</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{engagementScore}</span>
              <span className={`text-sm font-medium ${engagementInfo.color}`}>{engagementInfo.level}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{viewCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Views</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{commentCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Comments</div>
            </div>
          </div>

          {/* Time Spent */}
          <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Time Spent</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatTime(timeSpent)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleLike}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors ${
                isLiked 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{likeCount}</span>
            </button>
            
            <button
              onClick={handleBookmark}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <BookmarkIcon className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              <span className="text-sm">Save</span>
            </button>
            
            <button className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <ShareIcon className="w-4 h-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>

          {/* Comment Button */}
          <button className="w-full mt-3 flex items-center justify-center gap-2 p-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-lg font-medium transition-colors">
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Leave a Comment
          </button>
        </div>
      </div>

      {/* Floating Progress Indicator (Mobile) */}
      <div className="fixed bottom-4 left-4 z-40 md:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700 flex items-center justify-center relative">
            <div 
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 transition-all duration-300"
              style={{ 
                transform: `rotate(${(readingProgress / 100) * 360}deg)`,
                borderTopColor: readingProgress > 0 ? '#3b82f6' : 'transparent'
              }}
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{Math.round(readingProgress)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
