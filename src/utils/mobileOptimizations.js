// Mobile-specific optimizations and utilities

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

// Initialize all mobile optimizations
export function initializeMobileOptimizations() {
  setupMobileTouchOptimizations()
  setupMobileAnalytics()
}
