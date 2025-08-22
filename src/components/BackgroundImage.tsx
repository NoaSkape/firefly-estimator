import React, { useEffect, useRef, useState } from 'react'

type Props = {
  src?: string
  alt?: string
  overlay?: string
}

export default function BackgroundImage({ src = '/hero/tiny-home-dusk.jpg', alt = 'Tiny home at dusk', overlay = 'from-black/55 via-black/30 to-transparent' }: Props) {
  const backgroundRef = useRef<HTMLDivElement>(null)
  const [isStabilized, setIsStabilized] = useState(false)

  useEffect(() => {
    // Use visual viewport API (industry standard for mobile viewport handling)
    const visualViewport = window.visualViewport
    
    // Update CSS custom properties for dynamic viewport handling
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01
      const mobileVh = (visualViewport?.height || window.innerHeight) * 0.01
      
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
      resizeTimeout = setTimeout(updateViewportHeight, 100)
    }

    const handleOrientationChange = () => {
      clearTimeout(orientationTimeout)
      orientationTimeout = setTimeout(updateViewportHeight, 300)
    }

    // Visual viewport change handler (modern approach)
    const handleVisualViewportChange = () => {
      updateViewportHeight()
    }

    // Initial setup
    updateViewportHeight()

    // Event listeners
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
    
    // Visual viewport API (modern browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange, { passive: true })
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange)
      }
      clearTimeout(resizeTimeout)
      clearTimeout(orientationTimeout)
    }
  }, [])

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      <div
        ref={backgroundRef}
        className={`fixed-background absolute inset-0 ${isStabilized ? 'stabilized' : ''}`}
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


