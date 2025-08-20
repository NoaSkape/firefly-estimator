// Mobile optimization utilities for touch gestures, viewport management, and mobile-specific features
import analytics from './analytics'

class MobileOptimizations {
  constructor() {
    this.isMobile = false
    this.isTablet = false
    this.touchStartX = 0
    this.touchStartY = 0
    this.touchEndX = 0
    this.touchEndY = 0
    this.swipeThreshold = 50
    this.longPressThreshold = 500
    this.longPressTimer = null
    this.gestureCallbacks = new Map()
    this.viewportHeight = 0
    this.keyboardOpen = false
  }

  // Initialize mobile optimizations
  init() {
    this.detectDevice()
    this.setupViewportManagement()
    this.setupTouchGestures()
    this.setupKeyboardDetection()
    this.setupPerformanceOptimizations()
    this.setupMobileAnalytics()
  }

  // Detect device type
  detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    const isTabletDevice = /ipad|android(?=.*\b(?!.*mobile))/i.test(userAgent)
    
    this.isMobile = isMobileDevice
    this.isTablet = isTabletDevice
    
    // Add device classes to body
    document.body.classList.toggle('mobile-device', this.isMobile)
    document.body.classList.toggle('tablet-device', this.isTablet)
    document.body.classList.toggle('desktop-device', !this.isMobile && !this.isTablet)
    
    // Set viewport height
    this.updateViewportHeight()
  }

  // Setup viewport management
  setupViewportManagement() {
    // Update viewport height on resize and orientation change
    window.addEventListener('resize', () => this.updateViewportHeight())
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateViewportHeight(), 100)
    })
    
    // Set CSS custom properties for viewport units
    this.updateViewportHeight()
  }

  // Update viewport height (handles mobile browser UI)
  updateViewportHeight() {
    this.viewportHeight = window.innerHeight
    document.documentElement.style.setProperty('--vh', `${this.viewportHeight * 0.01}px`)
    document.documentElement.style.setProperty('--mobile-vh', `${this.viewportHeight}px`)
  }

  // Setup touch gestures
  setupTouchGestures() {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
  }

  // Handle touch start
  handleTouchStart(event) {
    this.touchStartX = event.touches[0].clientX
    this.touchStartY = event.touches[0].clientY
    
    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(event)
    }, this.longPressThreshold)
  }

  // Handle touch end
  handleTouchEnd(event) {
    this.touchEndX = event.changedTouches[0].clientX
    this.touchEndY = event.changedTouches[0].clientY
    
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    
    // Detect swipe gestures
    this.detectSwipe(event)
  }

  // Handle touch move
  handleTouchMove(event) {
    // Clear long press timer on movement
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  // Detect swipe gestures
  detectSwipe(event) {
    const deltaX = this.touchEndX - this.touchStartX
    const deltaY = this.touchEndY - this.touchStartY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (distance < this.swipeThreshold) return
    
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
    let direction = ''
    
    if (angle >= -45 && angle <= 45) {
      direction = 'right'
    } else if (angle >= 45 && angle <= 135) {
      direction = 'down'
    } else if (angle >= 135 || angle <= -135) {
      direction = 'left'
    } else {
      direction = 'up'
    }
    
    this.handleSwipe(direction, event, distance)
  }

  // Handle swipe gesture
  handleSwipe(direction, event, distance) {
    const target = event.target.closest('[data-swipe]')
    if (!target) return
    
    const swipeConfig = target.dataset.swipe
    if (swipeConfig && swipeConfig.includes(direction)) {
      event.preventDefault()
      
      // Trigger swipe callback
      const callback = this.gestureCallbacks.get(target)
      if (callback && callback.swipe) {
        callback.swipe(direction, distance)
      }
      
      // Add visual feedback
      this.addSwipeFeedback(target, direction)
      
      analytics.trackEvent('mobile_swipe', {
        direction,
        distance,
        element: target.tagName.toLowerCase(),
        context: target.dataset.swipe
      })
    }
  }

  // Handle long press
  handleLongPress(event) {
    const target = event.target.closest('[data-longpress]')
    if (!target) return
    
    event.preventDefault()
    
    // Trigger long press callback
    const callback = this.gestureCallbacks.get(target)
    if (callback && callback.longPress) {
      callback.longPress(event)
    }
    
    // Add visual feedback
    this.addLongPressFeedback(target)
    
    analytics.trackEvent('mobile_longpress', {
      element: target.tagName.toLowerCase(),
      context: target.dataset.longpress
    })
  }

  // Add swipe visual feedback
  addSwipeFeedback(element, direction) {
    element.classList.add(`swipe-${direction}`)
    setTimeout(() => {
      element.classList.remove(`swipe-${direction}`)
    }, 300)
  }

  // Add long press visual feedback
  addLongPressFeedback(element) {
    element.classList.add('longpress-active')
    setTimeout(() => {
      element.classList.remove('longpress-active')
    }, 200)
  }

  // Register gesture callbacks for element
  registerGestures(element, callbacks) {
    this.gestureCallbacks.set(element, callbacks)
  }

  // Remove gesture callbacks for element
  unregisterGestures(element) {
    this.gestureCallbacks.delete(element)
  }

  // Setup keyboard detection
  setupKeyboardDetection() {
    const initialViewportHeight = window.innerHeight
    
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight
      const heightDifference = initialViewportHeight - currentHeight
      
      // Detect keyboard opening (height reduction > 150px)
      if (heightDifference > 150) {
        this.keyboardOpen = true
        document.body.classList.add('keyboard-open')
        this.handleKeyboardOpen()
      } else {
        this.keyboardOpen = false
        document.body.classList.remove('keyboard-open')
        this.handleKeyboardClose()
      }
    })
  }

  // Handle keyboard opening
  handleKeyboardOpen() {
    // Scroll to focused element
    const focusedElement = document.activeElement
    if (focusedElement && focusedElement.scrollIntoView) {
      setTimeout(() => {
        focusedElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }, 100)
    }
    
    analytics.trackEvent('mobile_keyboard_open', {
      focusedElement: focusedElement?.tagName.toLowerCase()
    })
  }

  // Handle keyboard closing
  handleKeyboardClose() {
    analytics.trackEvent('mobile_keyboard_close')
  }

  // Setup performance optimizations
  setupPerformanceOptimizations() {
    // Reduce motion on mobile for better performance
    if (this.isMobile) {
      document.body.classList.add('reduce-motion')
    }
    
    // Optimize scroll performance
    this.optimizeScrollPerformance()
    
    // Optimize image loading
    this.optimizeImageLoading()
  }

  // Optimize scroll performance
  optimizeScrollPerformance() {
    // Use passive listeners for better scroll performance
    const scrollElements = document.querySelectorAll('.scroll-container')
    scrollElements.forEach(element => {
      element.addEventListener('scroll', () => {
        // Throttled scroll handling
        if (!element.scrollThrottle) {
          element.scrollThrottle = setTimeout(() => {
            this.handleScroll(element)
            element.scrollThrottle = null
          }, 16) // ~60fps
        }
      }, { passive: true })
    })
  }

  // Handle scroll events
  handleScroll(element) {
    // Add scroll-based animations or effects
    const scrollTop = element.scrollTop
    const scrollHeight = element.scrollHeight
    const clientHeight = element.clientHeight
    const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100
    
    // Update scroll progress indicators
    const progressElements = element.querySelectorAll('[data-scroll-progress]')
    progressElements.forEach(progressEl => {
      progressEl.style.setProperty('--scroll-progress', `${scrollPercentage}%`)
    })
  }

  // Optimize image loading
  optimizeImageLoading() {
    // Lazy load images with intersection observer
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target
            img.src = img.dataset.src
            img.classList.remove('lazy')
            imageObserver.unobserve(img)
          }
        })
      })
      
      const lazyImages = document.querySelectorAll('img[data-src]')
      lazyImages.forEach(img => imageObserver.observe(img))
    }
  }

  // Setup mobile analytics
  setupMobileAnalytics() {
    // Track mobile-specific events
    analytics.trackEvent('mobile_session_start', {
      isMobile: this.isMobile,
      isTablet: this.isTablet,
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    })
    
    // Track orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        analytics.trackEvent('mobile_orientation_change', {
          orientation: window.orientation,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        })
      }, 100)
    })
  }

  // Get device type
  getDeviceType() {
    if (this.isTablet) return 'tablet'
    if (this.isMobile) return 'mobile'
    return 'desktop'
  }

  // Check if device supports touch
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  // Get safe area insets (for notched devices)
  getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement)
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0'),
      right: parseInt(style.getPropertyValue('--sar') || '0'),
      bottom: parseInt(style.getPropertyValue('--sab') || '0'),
      left: parseInt(style.getPropertyValue('--sal') || '0')
    }
  }

  // Add safe area padding to element
  addSafeAreaPadding(element, sides = ['top', 'right', 'bottom', 'left']) {
    const insets = this.getSafeAreaInsets()
    sides.forEach(side => {
      if (insets[side] > 0) {
        element.style[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`] = `${insets[side]}px`
      }
    })
  }

  // Optimize form inputs for mobile
  optimizeFormInputs() {
    const inputs = document.querySelectorAll('input, textarea, select')
    inputs.forEach(input => {
      // Set appropriate input types for mobile
      if (input.type === 'text' && input.name?.includes('email')) {
        input.type = 'email'
        input.inputMode = 'email'
      } else if (input.type === 'text' && input.name?.includes('tel')) {
        input.type = 'tel'
        input.inputMode = 'tel'
      } else if (input.type === 'text' && input.name?.includes('number')) {
        input.type = 'number'
        input.inputMode = 'numeric'
      }
      
      // Add mobile-specific attributes
      input.setAttribute('autocomplete', 'on')
      input.setAttribute('autocorrect', 'on')
      input.setAttribute('autocapitalize', 'sentences')
    })
  }

  // Enable pull-to-refresh (if supported)
  enablePullToRefresh(container, callback) {
    let startY = 0
    let currentY = 0
    let pulling = false
    
    container.addEventListener('touchstart', (e) => {
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY
        pulling = true
      }
    }, { passive: true })
    
    container.addEventListener('touchmove', (e) => {
      if (!pulling) return
      
      currentY = e.touches[0].clientY
      const pullDistance = currentY - startY
      
      if (pullDistance > 0 && container.scrollTop === 0) {
        e.preventDefault()
        container.style.transform = `translateY(${Math.min(pullDistance * 0.5, 100)}px)`
      }
    }, { passive: false })
    
    container.addEventListener('touchend', () => {
      if (!pulling) return
      
      const pullDistance = currentY - startY
      if (pullDistance > 100) {
        callback()
      }
      
      container.style.transform = ''
      pulling = false
    }, { passive: true })
  }

  // Add mobile-specific CSS classes
  addMobileClasses() {
    const classes = [
      'mobile-optimized',
      `device-${this.getDeviceType()}`,
      this.isTouchDevice() ? 'touch-device' : 'no-touch'
    ]
    
    classes.forEach(className => {
      document.body.classList.add(className)
    })
  }

  // Optimize animations for mobile
  optimizeAnimations() {
    if (this.isMobile) {
      // Reduce animation complexity on mobile
      const animatedElements = document.querySelectorAll('[data-animate]')
      animatedElements.forEach(element => {
        element.style.setProperty('--animation-duration', '0.3s')
        element.style.setProperty('--animation-timing', 'ease-out')
      })
    }
  }

  // Handle mobile-specific navigation
  setupMobileNavigation() {
    // Add hamburger menu functionality
    const hamburger = document.querySelector('[data-mobile-menu]')
    const mobileMenu = document.querySelector('[data-mobile-menu-content]')
    
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('active')
        hamburger.classList.toggle('active')
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : ''
      })
      
      // Close menu on swipe
      this.registerGestures(mobileMenu, {
        swipe: (direction) => {
          if (direction === 'left') {
            mobileMenu.classList.remove('active')
            hamburger.classList.remove('active')
            document.body.style.overflow = ''
          }
        }
      })
    }
  }
}

// Create singleton instance
const mobileOptimizations = new MobileOptimizations()

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    mobileOptimizations.init()
  })
}

export default mobileOptimizations
