import React, { useState, useEffect, useRef } from 'react'
import BlogEngagement from './BlogEngagement'

export default function EngagementTracker({ 
  postData, 
  className = '' 
}) {
  const [readingProgress, setReadingProgress] = useState(0)
  const [viewCount] = useState(Math.floor(Math.random() * 200) + 100)
  const [likeCount] = useState(Math.floor(Math.random() * 50) + 10)
  const [commentCount] = useState(Math.floor(Math.random() * 20) + 5)
  
  const progressRef = useRef(null)

  // Track reading progress for top bar only
  useEffect(() => {
    const handleScroll = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const progress = Math.min(100, Math.max(0, (scrollTop / documentHeight) * 100))
      setReadingProgress(progress)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`engagement-tracker ${className}`} ref={progressRef}>
      {/* Subtle Reading Progress Bar at Top */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
        <div 
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Inline Engagement Section - No Popup */}
      <BlogEngagement 
        postData={postData}
        views={viewCount}
        likes={likeCount}
        comments={commentCount}
        readTime={postData.readTime || '5 min read'}
        className={className}
      />
    </div>
  )
}
