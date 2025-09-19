// Real-time Session Tracking Component
// Tracks user sessions, page views, and interactions for customer intelligence

import { useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useLocation } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

const SessionTracker = () => {
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const location = useLocation()
  const sessionIdRef = useRef(null)
  const lastPageRef = useRef(null)
  const startTimeRef = useRef(Date.now())

  // Initialize session tracking
  useEffect(() => {
    // Generate or retrieve session ID
    if (!sessionIdRef.current) {
      sessionIdRef.current = sessionStorage.getItem('firefly_session_id') || uuidv4()
      sessionStorage.setItem('firefly_session_id', sessionIdRef.current)
    }

    // Track initial session start
    trackEvent('session_start', {
      page: location.pathname,
      referrer: document.referrer,
      timestamp: new Date()
    })

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEvent('page_hidden', { page: location.pathname })
      } else {
        trackEvent('page_visible', { page: location.pathname })
      }
    }

    // Track before page unload
    const handleBeforeUnload = () => {
      trackEvent('session_end', {
        page: location.pathname,
        sessionDuration: Date.now() - startTimeRef.current
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Track page changes
  useEffect(() => {
    if (lastPageRef.current !== location.pathname) {
      // Track page view
      trackEvent('page_view', {
        page: location.pathname,
        previousPage: lastPageRef.current,
        timestamp: new Date()
      })
      
      lastPageRef.current = location.pathname
    }
  }, [location.pathname])

  // Track authentication changes
  useEffect(() => {
    if (isSignedIn && userId) {
      trackEvent('user_login', {
        userId: userId,
        page: location.pathname,
        userEmail: user?.emailAddresses[0]?.emailAddress,
        timestamp: new Date()
      })
    }
  }, [isSignedIn, userId])

  // Core tracking function
  const trackEvent = async (action, data = {}) => {
    try {
      // Prepare tracking data
      const trackingData = {
        sessionId: sessionIdRef.current,
        userId: isSignedIn ? userId : null,
        action: action,
        page: location.pathname,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        timestamp: new Date(),
        ...data
      }

      // Send to appropriate tracking endpoint
      if (isSignedIn && userId) {
        // Track authenticated user session
        await fetch('/api/customers-enterprise?action=track_session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(trackingData)
        })
      } else {
        // Track anonymous visitor (with consent)
        const consentGiven = localStorage.getItem('analytics_consent') === 'true'
        if (consentGiven) {
          await fetch('/api/customers-enterprise?action=track_anonymous', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...trackingData,
              consentGiven: true
            })
          })
        }
      }
    } catch (error) {
      // Fail silently to not disrupt user experience
      console.warn('Session tracking failed:', error.message)
    }
  }

  // Expose tracking function for manual events
  useEffect(() => {
    // Make tracking function available globally for manual event tracking
    window.trackCustomerEvent = (eventName, eventData = {}) => {
      trackEvent(eventName, eventData)
    }

    // Track common interactions
    const trackInteraction = (eventType) => (event) => {
      const target = event.target
      const elementInfo = {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        text: target.textContent?.substring(0, 100) // First 100 chars
      }
      
      trackEvent(eventType, {
        element: elementInfo,
        page: location.pathname
      })
    }

    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target.closest('button, a, [data-track]')
      if (target) {
        trackInteraction('interaction_click')(event)
      }
    })

    // Track form submissions
    document.addEventListener('submit', trackInteraction('form_submit'))

    return () => {
      delete window.trackCustomerEvent
    }
  }, [location.pathname, isSignedIn, userId])

  // Component doesn't render anything visible
  return null
}

export default SessionTracker
