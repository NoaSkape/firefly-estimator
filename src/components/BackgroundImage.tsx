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
    let resizeTimeout: NodeJS.Timeout
    let orientationTimeout: NodeJS.Timeout

    // Debounced viewport change handler
    const handleViewportChange = () => {
      if (backgroundRef.current) {
        // Add a small delay to let the viewport settle
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          if (backgroundRef.current) {
            // Force the background to maintain its position with smooth transitions
            backgroundRef.current.style.transform = 'translateZ(0)'
            backgroundRef.current.style.transition = 'transform 0.3s ease-out'
            setIsStabilized(true)
          }
        }, 50)
      }
    }

    // Handle orientation changes with longer delay
    const handleOrientationChange = () => {
      clearTimeout(orientationTimeout)
      orientationTimeout = setTimeout(() => {
        handleViewportChange()
      }, 300)
    }

    // Listen for viewport changes
    window.addEventListener('resize', handleViewportChange, { passive: true })
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
    
    // Initial stabilization
    handleViewportChange()

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
      clearTimeout(resizeTimeout)
      clearTimeout(orientationTimeout)
    }
  }, [])

  // Fixed, covers viewport, sits behind fireflies and content
  // Mobile-optimized to prevent viewport-based repositioning while maintaining aspect ratio
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      <div
        ref={backgroundRef}
        className={`fixed-background absolute inset-0 bg-cover bg-center bg-no-repeat ${isStabilized ? 'stabilized' : ''}`}
        style={{
          backgroundImage: `url(${src})`,
          // Ensure background stays in place on mobile
          backgroundPosition: 'center center',
          // Prevent any scaling or zooming effects
          transform: 'translateZ(0)',
          // Force hardware acceleration to prevent repositioning
          willChange: 'auto',
          // Prevent mobile browser from affecting positioning
          backfaceVisibility: 'hidden',
          // Ensure proper stacking context
          zIndex: -1,
          // Smooth transitions for viewport changes
          transition: 'transform 0.3s ease-out'
        }}
        role="img"
        aria-label={alt}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${overlay}`} />
    </div>
  )
}


