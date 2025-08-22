import React, { useEffect, useRef, useState } from 'react'

type Props = {
  src?: string
  alt?: string
  overlay?: string
}

export default function BackgroundImage({ src = '/hero/tiny-home-dusk.jpg', alt = 'Tiny home at dusk', overlay = 'from-black/55 via-black/30 to-transparent' }: Props) {
  const backgroundRef = useRef<HTMLDivElement>(null)
  const [isStabilized, setIsStabilized] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    // Check if we're in full-screen/standalone mode
    const checkFullScreenMode = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isFullScreenMode = window.matchMedia('(display-mode: fullscreen)').matches
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches
      
      setIsFullScreen(isStandalone || isFullScreenMode || isMinimalUI)
    }

    // Use visual viewport API (industry standard for mobile viewport handling)
    const visualViewport = window.visualViewport
    
    // Update CSS custom properties for dynamic viewport handling
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01
      
      // In full-screen mode, use standard viewport height (no Chrome header)
      const mobileVh = isFullScreen ? vh : (visualViewport?.height || window.innerHeight) * 0.01
      
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.documentElement.style.setProperty('--mobile-vh', `${mobileVh}px`)
      
      // Stabilize background after viewport update
      if (backgroundRef.current) {
        backgroundRef.current.style.transform = 'translateZ(0)'
        setIsStabilized(true)
      }
    }

    // Debounced viewport update to prevent excessive calls
    let resizeTimeout: NodeJS.Timeout
    let orientationTimeout: NodeJS.Timeout

    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        checkFullScreenMode()
        updateViewportHeight()
      }, 100)
    }

    const handleOrientationChange = () => {
      clearTimeout(orientationTimeout)
      orientationTimeout = setTimeout(() => {
        checkFullScreenMode()
        updateViewportHeight()
      }, 300)
    }

    // Visual viewport change handler (modern approach)
    const handleVisualViewportChange = () => {
      // Only update if not in full-screen mode (Chrome header shouldn't appear)
      if (!isFullScreen) {
        updateViewportHeight()
      }
    }

    // Display mode change handler
    const handleDisplayModeChange = () => {
      checkFullScreenMode()
      updateViewportHeight()
    }

    // Initial setup
    checkFullScreenMode()
    updateViewportHeight()

    // Event listeners
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
    
    // Visual viewport API (modern browsers) - only if not in full-screen
    if (window.visualViewport && !isFullScreen) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange, { passive: true })
    }

    // Display mode change listener
    const displayModeMediaQuery = window.matchMedia('(display-mode: standalone)')
    displayModeMediaQuery.addEventListener('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange)
      }
      displayModeMediaQuery.removeEventListener('change', handleDisplayModeChange)
      clearTimeout(resizeTimeout)
      clearTimeout(orientationTimeout)
    }
  }, [isFullScreen])

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      <div
        ref={backgroundRef}
        className={`fixed-background absolute inset-0 ${isStabilized ? 'stabilized' : ''} ${isFullScreen ? 'fullscreen' : ''}`}
        style={{
          backgroundImage: `url(${src})`,
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          transform: 'translateZ(0)',
          willChange: 'auto',
          backfaceVisibility: 'hidden' as const,
          zIndex: -1
        }}
        role="img"
        aria-label={alt}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${overlay}`} />
    </div>
  )
}


