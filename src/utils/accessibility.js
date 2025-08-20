// Accessibility utilities for ARIA labels, keyboard navigation, and screen reader support
import analytics from './analytics'

class AccessibilityUtils {
  constructor() {
    this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    this.currentFocusIndex = 0
    this.focusableElementsList = []
  }

  // Initialize accessibility features
  init() {
    this.setupKeyboardNavigation()
    this.setupSkipLinks()
    this.setupFocusManagement()
    this.setupScreenReaderAnnouncements()
  }

  // Setup keyboard navigation
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      // Handle Escape key for closing modals/dropdowns
      if (event.key === 'Escape') {
        this.handleEscapeKey(event)
      }

      // Handle Tab key for focus management
      if (event.key === 'Tab') {
        this.handleTabKey(event)
      }

      // Handle Enter and Space for button activation
      if (event.key === 'Enter' || event.key === ' ') {
        this.handleActivationKey(event)
      }

      // Handle arrow keys for navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleArrowKeys(event)
      }
    })
  }

  // Handle Escape key
  handleEscapeKey(event) {
    const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]')
    if (activeModal) {
      const closeButton = activeModal.querySelector('[data-close-modal]')
      if (closeButton) {
        closeButton.click()
        event.preventDefault()
      }
    }

    const activeDropdown = document.querySelector('[role="menu"][aria-expanded="true"]')
    if (activeDropdown) {
      const toggleButton = document.querySelector(`[aria-controls="${activeDropdown.id}"]`)
      if (toggleButton) {
        toggleButton.click()
        event.preventDefault()
      }
    }
  }

  // Handle Tab key for focus management
  handleTabKey(event) {
    const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]')
    if (activeModal) {
      this.trapFocusInModal(activeModal, event)
    }
  }

  // Handle activation keys (Enter, Space)
  handleActivationKey(event) {
    const target = event.target
    
    if (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button') {
      if (event.key === ' ') {
        event.preventDefault() // Prevent page scroll
      }
      // Let the default behavior handle the click
    }
  }

  // Handle arrow keys for navigation
  handleArrowKeys(event) {
    const target = event.target
    
    // Handle arrow keys in select elements
    if (target.tagName === 'SELECT') {
      return // Let default behavior handle
    }

    // Handle arrow keys in custom dropdowns
    if (target.getAttribute('role') === 'option') {
      this.handleOptionNavigation(target, event)
    }

    // Handle arrow keys in custom radio groups
    if (target.getAttribute('role') === 'radio') {
      this.handleRadioNavigation(target, event)
    }
  }

  // Handle option navigation in custom dropdowns
  handleOptionNavigation(option, event) {
    const listbox = option.closest('[role="listbox"]')
    if (!listbox) return

    const options = Array.from(listbox.querySelectorAll('[role="option"]'))
    const currentIndex = options.indexOf(option)
    let nextIndex = currentIndex

    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length
    } else if (event.key === 'ArrowUp') {
      nextIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault()
      options[nextIndex].focus()
    }
  }

  // Handle radio navigation
  handleRadioNavigation(radio, event) {
    const radioGroup = radio.closest('[role="radiogroup"]')
    if (!radioGroup) return

    const radios = Array.from(radioGroup.querySelectorAll('[role="radio"]'))
    const currentIndex = radios.indexOf(radio)
    let nextIndex = currentIndex

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % radios.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault()
      radios[nextIndex].click()
      radios[nextIndex].focus()
    }
  }

  // Trap focus in modal
  trapFocusInModal(modal, event) {
    const focusableElements = modal.querySelectorAll(this.focusableElements)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  // Setup skip links
  setupSkipLinks() {
    const skipLinks = document.querySelectorAll('[data-skip-link]')
    skipLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault()
        const targetId = link.getAttribute('href').substring(1)
        const target = document.getElementById(targetId)
        if (target) {
          target.focus()
          target.scrollIntoView({ behavior: 'smooth' })
        }
      })
    })
  }

  // Setup focus management
  setupFocusManagement() {
    // Store focus when opening modal
    document.addEventListener('focusin', (event) => {
      const modal = event.target.closest('[role="dialog"]')
      if (modal && !modal.hasAttribute('data-focus-stored')) {
        modal.setAttribute('data-focus-stored', document.activeElement.id || 'body')
      }
    })

    // Restore focus when closing modal
    document.addEventListener('focusout', (event) => {
      const modal = event.target.closest('[role="dialog"]')
      if (modal && !modal.contains(event.relatedTarget)) {
        const storedFocusId = modal.getAttribute('data-focus-stored')
        if (storedFocusId && storedFocusId !== 'body') {
          const elementToFocus = document.getElementById(storedFocusId)
          if (elementToFocus) {
            setTimeout(() => elementToFocus.focus(), 100)
          }
        }
      }
    })
  }

  // Setup screen reader announcements
  setupScreenReaderAnnouncements() {
    // Create live region for announcements
    if (!document.getElementById('sr-announcements')) {
      const liveRegion = document.createElement('div')
      liveRegion.id = 'sr-announcements'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      document.body.appendChild(liveRegion)
    }
  }

  // Announce to screen readers
  announce(message, priority = 'polite') {
    const liveRegion = document.getElementById('sr-announcements')
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.textContent = message
      
      // Clear the message after a short delay
      setTimeout(() => {
        liveRegion.textContent = ''
      }, 1000)
    }

    // Track announcement for analytics
    analytics.trackEvent('screen_reader_announcement', {
      message: message.substring(0, 100), // Truncate for analytics
      priority
    })
  }

  // Generate ARIA labels
  generateAriaLabel(element, context = '') {
    const tagName = element.tagName.toLowerCase()
    const text = element.textContent?.trim() || ''
    const placeholder = element.getAttribute('placeholder') || ''
    const title = element.getAttribute('title') || ''
    const alt = element.getAttribute('alt') || ''

    if (text) return text
    if (placeholder) return placeholder
    if (title) return title
    if (alt) return alt

    // Generate contextual labels
    switch (tagName) {
      case 'button':
        return context ? `${context} button` : 'Button'
      case 'input':
        return context ? `${context} input field` : 'Input field'
      case 'select':
        return context ? `${context} dropdown` : 'Dropdown'
      case 'textarea':
        return context ? `${context} text area` : 'Text area'
      default:
        return context || 'Interactive element'
    }
  }

  // Add ARIA labels to elements
  addAriaLabels() {
    // Add labels to buttons without text
    document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
      if (!button.textContent?.trim()) {
        const context = this.getContextualLabel(button)
        button.setAttribute('aria-label', this.generateAriaLabel(button, context))
      }
    })

    // Add labels to inputs without labels
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([placeholder])').forEach(input => {
      const context = this.getContextualLabel(input)
      input.setAttribute('aria-label', this.generateAriaLabel(input, context))
    })

    // Add labels to images without alt text
    document.querySelectorAll('img:not([alt])').forEach(img => {
      const context = this.getContextualLabel(img)
      img.setAttribute('alt', this.generateAriaLabel(img, context))
    })
  }

  // Get contextual label for element
  getContextualLabel(element) {
    // Look for nearby headings
    const heading = element.closest('section')?.querySelector('h1, h2, h3, h4, h5, h6')
    if (heading) return heading.textContent.trim()

    // Look for form labels
    const label = element.closest('form')?.querySelector(`label[for="${element.id}"]`)
    if (label) return label.textContent.trim()

    // Look for parent labels
    const parentLabel = element.closest('label')
    if (parentLabel) return parentLabel.textContent.trim()

    return ''
  }

  // Make element focusable
  makeFocusable(element, tabIndex = 0) {
    element.setAttribute('tabindex', tabIndex)
    if (element.tagName !== 'BUTTON' && element.tagName !== 'A') {
      element.setAttribute('role', 'button')
    }
  }

  // Handle keyboard activation
  handleKeyboardActivation(element, callback) {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        callback(event)
      }
    }

    element.addEventListener('keydown', handleKeyDown)
    
    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }

  // Track accessibility interactions
  trackAccessibilityInteraction(type, element, context = '') {
    analytics.trackEvent('accessibility_interaction', {
      type,
      element: element.tagName.toLowerCase(),
      context,
      hasAriaLabel: !!element.getAttribute('aria-label'),
      hasAriaLabelledBy: !!element.getAttribute('aria-labelledby'),
      role: element.getAttribute('role') || 'none'
    })
  }

  // Check if element is visible to screen readers
  isVisibleToScreenReader(element) {
    const style = window.getComputedStyle(element)
    const isHidden = style.display === 'none' || 
                    style.visibility === 'hidden' || 
                    element.hasAttribute('hidden') ||
                    element.getAttribute('aria-hidden') === 'true'
    
    return !isHidden
  }

  // Get focusable elements in container
  getFocusableElements(container = document) {
    return Array.from(container.querySelectorAll(this.focusableElements))
      .filter(element => this.isVisibleToScreenReader(element))
  }

  // Move focus to next/previous focusable element
  moveFocus(direction = 'next', container = document) {
    const focusableElements = this.getFocusableElements(container)
    const currentIndex = focusableElements.indexOf(document.activeElement)
    let nextIndex

    if (direction === 'next') {
      nextIndex = currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1
    } else {
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1
    }

    focusableElements[nextIndex]?.focus()
  }
}

// Create singleton instance
const accessibility = new AccessibilityUtils()

// Initialize accessibility features when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    accessibility.init()
  })
}

export default accessibility
