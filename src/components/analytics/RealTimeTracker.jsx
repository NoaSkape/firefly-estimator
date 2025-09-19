// Real-time Analytics Tracker Component
// Tracks actual user sessions, page views, and engagement

import { useEffect, useRef } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useLocation } from 'react-router-dom'

let sessionId = null
let pageStartTime = null
let isTrackerInitialized = false

export default function RealTimeTracker() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const location = useLocation()
  const lastPageRef = useRef(null)

  // Initialize session tracking
  useEffect(() => {
    if (isTrackerInitialized) return
    
    const initializeTracking = async () => {
      try {
        // Start session
        sessionId = await startSession()
        
        // Track initial page view
        await trackPageView(location.pathname)
        
        // Set up page visibility tracking
        setupVisibilityTracking()
        
        // Set up beforeunload tracking
        setupUnloadTracking()
        
        isTrackerInitialized = true
        console.log('[REAL_TRACKER] Analytics tracking initialized')
      } catch (error) {
        console.error('[REAL_TRACKER] Failed to initialize tracking:', error)
      }
    }
    
    initializeTracking()
  }, [])

  // Track page changes
  useEffect(() => {
    if (!sessionId || !isTrackerInitialized) return
    
    const currentPage = location.pathname
    if (lastPageRef.current && lastPageRef.current !== currentPage) {
      // Track previous page time
      trackPageTime(lastPageRef.current)
      
      // Track new page view
      trackPageView(currentPage)
    }
    
    lastPageRef.current = currentPage
    pageStartTime = Date.now()
  }, [location.pathname])

  // Start a new session
  const startSession = async () => {
    try {
      const response = await fetch('/api/analytics/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          landingPage: window.location.pathname,
          screenResolution: `${screen.width}x${screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.sessionId
      }
    } catch (error) {
      console.error('[REAL_TRACKER] Session start failed:', error)
    }
    
    // Fallback session ID
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Track a page view
  const trackPageView = async (page) => {
    if (!sessionId) return
    
    try {
      await fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          sessionId,
          page,
          title: document.title,
          url: window.location.href,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
          screenResolution: `${screen.width}x${screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`
        })
      })
      
      console.log('[REAL_TRACKER] Page view tracked:', page)
    } catch (error) {
      console.error('[REAL_TRACKER] Page view tracking failed:', error)
    }
  }

  // Track time spent on page
  const trackPageTime = async (page) => {
    if (!pageStartTime || !sessionId) return
    
    const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000) // seconds
    
    try {
      await fetch('/api/analytics/page-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          sessionId,
          page,
          timeOnPage
        })
      })
      
      console.log('[REAL_TRACKER] Page time tracked:', page, timeOnPage, 'seconds')
    } catch (error) {
      console.error('[REAL_TRACKER] Page time tracking failed:', error)
    }
  }

  // End session
  const endSession = async () => {
    if (!sessionId) return
    
    try {
      await fetch('/api/analytics/session/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          sessionId
        })
      })
      
      console.log('[REAL_TRACKER] Session ended:', sessionId)
    } catch (error) {
      console.error('[REAL_TRACKER] Session end failed:', error)
    }
  }

  // Set up page visibility tracking
  const setupVisibilityTracking = () => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // User switched tabs/minimized - track current page time
        if (lastPageRef.current) {
          trackPageTime(lastPageRef.current)
        }
      } else if (document.visibilityState === 'visible') {
        // User came back - restart page timer
        pageStartTime = Date.now()
      }
    })
  }

  // Set up beforeunload tracking
  const setupUnloadTracking = () => {
    window.addEventListener('beforeunload', () => {
      // Track final page time
      if (lastPageRef.current) {
        trackPageTime(lastPageRef.current)
      }
      
      // End session
      endSession()
    })
  }

  // Get authentication headers
  const getAuthHeaders = async () => {
    try {
      const token = await getToken()
      return token ? { Authorization: `Bearer ${token}` } : {}
    } catch (error) {
      return {}
    }
  }

  // This component doesn't render anything
  return null
}

// Export session utilities for other components
export const trackEvent = async (eventName, eventData = {}) => {
  if (!sessionId) return
  
  try {
    const response = await fetch('/api/analytics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        eventName,
        eventData,
        timestamp: new Date().toISOString()
      })
    })
    
    if (response.ok) {
      console.log('[REAL_TRACKER] Event tracked:', eventName)
    }
  } catch (error) {
    console.error('[REAL_TRACKER] Event tracking failed:', error)
  }
}

export const getCurrentSessionId = () => sessionId
