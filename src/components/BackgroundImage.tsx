import React, { useEffect, useRef, useState, useCallback } from 'react'

type Props = {
  src?: string
  alt?: string
  overlay?: string
}

export default function BackgroundImage({ src = '/hero/tiny-home-dusk.jpg', alt = 'Tiny home at dusk', overlay = 'from-black/55 via-black/30 to-transparent' }: Props) {
  const backgroundRef = useRef<HTMLDivElement>(null)
  const [isStabilized, setIsStabilized] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [initialViewportHeight, setInitialViewportHeight] = useState(0)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const animationFrameRef = useRef<number | undefined>(undefined)

  // Calculate buffer zones for seamless viewport transitions
  const HEADER_HEIGHT = 60 // Chrome's dynamic header height
  const BUFFER_ZONE = 120 // Extra buffer for smooth transitions
  const TOTAL_OVERFLOW = HEADER_HEIGHT + BUFFER_ZONE // 180px total

  // Dynamic background positioning to prevent grey bars
  const adjustBackgroundPosition = useCallback((newViewportHeight: number, oldViewportHeight: number) => {
    if (!backgroundRef.current) return

    const heightDifference = newViewportHeight - oldViewportHeight
    const isHeaderAppearing = heightDifference < 0 // Viewport getting smaller
    const isHeaderDisappearing = heightDifference > 0 // Viewport getting larger

    if (Math.abs(heightDifference) < 10) return // Ignore tiny changes

    setIsAdjusting(true)

    // Calculate the adjustment needed
    let adjustmentY = 0
    if (isHeaderAppearing) {
      // Header is appearing - move background up to reveal bottom buffer
      adjustmentY = Math.min(Math.abs(heightDifference), BUFFER_ZONE)
    } else if (isHeaderDisappearing) {
      // Header is disappearing - move background down to reveal top buffer
      adjustmentY = -Math.min(heightDifference, BUFFER_ZONE)
    }

    // Apply the adjustment with smooth animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const startTime = performance.now()
    const duration = 300 // 300ms animation
    const startY = parseFloat(backgroundRef.current.style.transform.replace(/[^\d.-]/g, '') || '0')

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentY = startY + (adjustmentY * easeOutCubic)

      if (backgroundRef.current) {
        backgroundRef.current.style.transform = `translateZ(0) translateY(${currentY}px)`
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setIsAdjusting(false)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [])

  // Enhanced viewport change handler with overflow buffer technique
  const handleViewportChange = useCallback(() => {
    const newViewportHeight = window.innerHeight
    const oldViewportHeight = viewportHeight

    if (Math.abs(newViewportHeight - oldViewportHeight) > 5) {
      setViewportHeight(newViewportHeight)
      adjustBackgroundPosition(newViewportHeight, oldViewportHeight)
    }
  }, [viewportHeight, adjustBackgroundPosition])

  // Debounced viewport change handler
  const debouncedViewportChange = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    setTimeout(() => {
      handleViewportChange()
    }, 50)
  }, [handleViewportChange])

  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout
    let orientationTimeout: NodeJS.Timeout

    // Set initial viewport height
    setInitialViewportHeight(window.innerHeight)
    setViewportHeight(window.innerHeight)

    // Enhanced viewport change handler
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        debouncedViewportChange()
        setIsStabilized(true)
      }, 50)
    }

    // Handle orientation changes with longer delay
    const handleOrientationChange = () => {
      clearTimeout(orientationTimeout)
      orientationTimeout = setTimeout(() => {
        debouncedViewportChange()
        setIsStabilized(true)
      }, 300)
    }

    // Listen for viewport changes
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
    
    // Initial stabilization
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      clearTimeout(resizeTimeout)
      clearTimeout(orientationTimeout)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [debouncedViewportChange])

  // Calculate initial background positioning with overflow buffer
  const getInitialBackgroundStyle = () => {
    const scale = 1 + (TOTAL_OVERFLOW / initialViewportHeight) // Scale to include buffer
    const translateY = -TOTAL_OVERFLOW / 2 // Center the buffer zones

    return {
      backgroundImage: `url(${src})`,
      backgroundPosition: 'center center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      transform: `translateZ(0) scale(${scale}) translateY(${translateY}px)`,
      willChange: 'auto',
      backfaceVisibility: 'hidden' as const,
      zIndex: -1,
      transition: isAdjusting ? 'none' : 'transform 0.3s ease-out'
    }
  }

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      <div
        ref={backgroundRef}
        className={`fixed-background absolute inset-0 ${isStabilized ? 'stabilized' : ''}`}
        style={getInitialBackgroundStyle()}
        role="img"
        aria-label={alt}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${overlay}`} />
    </div>
  )
}


