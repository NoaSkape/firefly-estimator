/**
 * Centralized Build Data Management Hook
 * Provides a single source of truth for build data across all checkout components
 * Implements proper state management, caching, and synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'

// Global cache to prevent duplicate requests
const buildCache = new Map()
const pendingRequests = new Map()

export function useBuildData(buildId) {
  const { getToken, isSignedIn } = useAuth()
  const [build, setBuild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  
  // Refs to prevent race conditions
  const abortControllerRef = useRef(null)
  const lastRequestIdRef = useRef(0)

  // Fetch build data with proper caching and deduplication
  const fetchBuild = useCallback(async (forceRefresh = false) => {
    if (!buildId || !isSignedIn) {
      setBuild(null)
      setLoading(false)
      return
    }

    const requestId = ++lastRequestIdRef.current
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && buildCache.has(buildId)) {
      const cached = buildCache.get(buildId)
      if (Date.now() - cached.timestamp < 30000) { // 30 second cache
        setBuild(cached.data)
        setLoading(false)
        setError(null)
        return
      }
    }

    // Prevent duplicate requests
    if (pendingRequests.has(buildId)) {
      const pending = pendingRequests.get(buildId)
      return pending
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Abort previous request if still pending
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        const token = await getToken()
        const response = await fetch(`/api/builds/${buildId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch build: ${response.status}`)
        }

        const buildData = await response.json()
        
        // Only update if this is still the latest request
        if (requestId === lastRequestIdRef.current) {
          setBuild(buildData)
          setLastUpdated(new Date())
          setError(null)
          
          // Cache the result
          buildCache.set(buildId, {
            data: buildData,
            timestamp: Date.now()
          })
        }
      } catch (err) {
        if (err.name === 'AbortError') return // Request was cancelled
        
        if (requestId === lastRequestIdRef.current) {
          setError(err.message)
          console.error('Error fetching build:', err)
        }
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false)
        }
        pendingRequests.delete(buildId)
      }
    })()

    pendingRequests.set(buildId, requestPromise)
    return requestPromise
  }, [buildId, isSignedIn, getToken])

  // Update build data with optimistic updates
  const updateBuild = useCallback(async (updates, options = {}) => {
    if (!buildId || !isSignedIn || !build) {
      throw new Error('Cannot update build: missing buildId, not signed in, or no build data')
    }

    const { optimistic = true, skipRefetch = false } = options

    // Optimistic update
    if (optimistic) {
      const optimisticBuild = { ...build, ...updates, updatedAt: new Date() }
      setBuild(optimisticBuild)
      
      // Update cache
      buildCache.set(buildId, {
        data: optimisticBuild,
        timestamp: Date.now()
      })
    }

    try {
      const token = await getToken()
      const response = await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Failed to update build: ${response.status}`)
      }

      const updatedBuild = await response.json()
      
      // Update state with server response
      setBuild(updatedBuild)
      setLastUpdated(new Date())
      
      // Update cache
      buildCache.set(buildId, {
        data: updatedBuild,
        timestamp: Date.now()
      })

      // Refetch if requested
      if (!skipRefetch) {
        await fetchBuild(true)
      }

      return updatedBuild
    } catch (err) {
      // Rollback optimistic update on error
      if (optimistic) {
        await fetchBuild(true)
      }
      throw err
    }
  }, [buildId, isSignedIn, build, getToken, fetchBuild])

  // Invalidate cache for this build
  const invalidateCache = useCallback(() => {
    buildCache.delete(buildId)
  }, [buildId])

  // Load build on mount and when dependencies change
  useEffect(() => {
    fetchBuild()
    
    return () => {
      // Cleanup: abort pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchBuild])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    build,
    loading,
    error,
    lastUpdated,
    fetchBuild,
    updateBuild,
    invalidateCache,
    // Computed values for convenience
    isLoaded: !loading && !error && build !== null,
    hasError: error !== null,
    // Build data shortcuts
    selections: build?.selections || {},
    pricing: build?.pricing || {},
    buyerInfo: build?.buyerInfo || {},
    financing: build?.financing || {},
    step: build?.step || 1,
    status: build?.status || 'DRAFT'
  }
}

export default useBuildData
