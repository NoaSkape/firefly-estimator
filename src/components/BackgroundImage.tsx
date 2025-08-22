import React, { useEffect, useRef } from 'react'

type Props = {
  src?: string
  alt?: string
  overlay?: string
}

export default function BackgroundImage({ src = '/hero/tiny-home-dusk.jpg', alt = 'Tiny home at dusk', overlay = 'from-black/55 via-black/30 to-transparent' }: Props) {
  const backgroundRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Prevent viewport changes from affecting background positioning on mobile
    const handleViewportChange = () => {
      if (backgroundRef.current) {
        // Force the background to maintain its position
        backgroundRef.current.style.transform = 'translateZ(0)'
      }
    }

    // Listen for viewport changes
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)
    
    // Initial stabilization
    handleViewportChange()

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [])

  // Fixed, covers viewport, sits behind fireflies and content
  // Mobile-optimized to prevent viewport-based repositioning
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      <div
        ref={backgroundRef}
        className="fixed-background absolute inset-0 bg-cover bg-center bg-no-repeat"
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
          zIndex: -1
        }}
        role="img"
        aria-label={alt}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${overlay}`} />
    </div>
  )
}


