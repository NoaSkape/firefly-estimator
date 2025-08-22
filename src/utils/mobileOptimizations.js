// Mobile-specific optimizations and utilities

// Update viewport height CSS variables for mobile browsers
export function updateViewportHeight() {
  const vh = window.innerHeight * 0.01
  const mobileVh = Math.max(window.innerHeight, window.visualViewport?.height || window.innerHeight) * 0.01
  
  document.documentElement.style.setProperty('--vh', `${vh}px`)
  document.documentElement.style.setProperty('--mobile-vh', `${mobileVh}px`)
}

// Debounced viewport height update
let viewportUpdateTimeout
export function debouncedViewportUpdate() {
  clearTimeout(viewportUpdateTimeout)
  viewportUpdateTimeout = setTimeout(() => {
    updateViewportHeight()
  }, 100)
}

// Smooth viewport change handler for background stabilization
export function setupSmoothViewportHandling() {
  let resizeTimeout
  let orientationTimeout
  
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      updateViewportHeight()
      // Trigger a custom event for background components
      window.dispatchEvent(new CustomEvent('viewportStabilized'))
    }, 150)
  }
  
  const handleOrientationChange = () => {
    clearTimeout(orientationTimeout)
    orientationTimeout = setTimeout(() => {
      updateViewportHeight()
      window.dispatchEvent(new CustomEvent('viewportStabilized'))
    }, 500)
  }
  
  // Listen for viewport changes
  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
  
  // Initial setup
  updateViewportHeight()
  
  return () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('orientationchange', handleOrientationChange)
    clearTimeout(resizeTimeout)
    clearTimeout(orientationTimeout)
  }
}

// Setup mobile analytics (temporarily disabled)
export function setupMobileAnalytics() {
  // Temporarily disabled to prevent console spam
  // if (typeof window !== 'undefined' && window.gtag) {
  //   // Mobile-specific analytics tracking
  //   window.gtag('config', 'GA_MEASUREMENT_ID', {
  //     custom_map: {
  //       'custom_parameter_1': 'mobile_optimization'
  //     }
  //   })
  // }
}

// Mobile touch optimizations
export function setupMobileTouchOptimizations() {
  // Prevent zoom on double tap
  let lastTouchEnd = 0
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime()
    if (now - lastTouchEnd <= 300) {
      event.preventDefault()
    }
    lastTouchEnd = now
  }, false)
  
  // Optimize touch scrolling
  document.addEventListener('touchstart', () => {}, { passive: true })
  document.addEventListener('touchmove', () => {}, { passive: true })
}

// Initialize all mobile optimizations
export function initializeMobileOptimizations() {
  updateViewportHeight()
  setupSmoothViewportHandling()
  setupMobileTouchOptimizations()
  setupMobileAnalytics()
}
