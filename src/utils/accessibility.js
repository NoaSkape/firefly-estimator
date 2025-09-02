// Accessibility utilities for WCAG 2.2 AA compliance
import { useEffect, useRef, useCallback } from 'react'

// Focus management utilities
export const focusManagement = {
  // Trap focus within a container (for modals, dropdowns)
  trapFocus: (containerRef, shouldTrap = true) => {
    if (!containerRef?.current || !shouldTrap) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    containerRef.current.addEventListener('keydown', handleKeyDown)
    
    // Return cleanup function
    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown)
    }
  },

  // Move focus to first focusable element in container
  focusFirst: (containerRef) => {
    if (!containerRef?.current) return
    
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  },

  // Move focus to last focusable element in container
  focusLast: (containerRef) => {
    if (!containerRef?.current) return
    
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus()
    }
  },

  // Store and restore focus (useful for modals)
  storeFocus: () => {
    return document.activeElement
  },

  restoreFocus: (element) => {
    if (element && typeof element.focus === 'function') {
      element.focus()
    }
  }
}

// Keyboard navigation utilities
export const keyboardNavigation = {
  // Handle arrow key navigation in lists/grids
  handleArrowKeys: (currentIndex, totalItems, onNavigate) => {
    return (e) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          const nextIndex = (currentIndex + 1) % totalItems
          onNavigate(nextIndex)
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          const prevIndex = currentIndex === 0 ? totalItems - 1 : currentIndex - 1
          onNavigate(prevIndex)
          break
        case 'Home':
          e.preventDefault()
          onNavigate(0)
          break
        case 'End':
          e.preventDefault()
          onNavigate(totalItems - 1)
          break
      }
    }
  },

  // Handle Enter and Space key activation
  handleActivation: (onActivate, onSpace = null) => {
    return (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (e.key === 'Enter') {
          onActivate()
        } else if (onSpace) {
          onSpace()
        } else {
          onActivate()
        }
      }
    }
  },

  // Handle Escape key
  handleEscape: (onEscape) => {
    return (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape()
      }
    }
  }
}

// Screen reader utilities
export const screenReader = {
  // Announce message to screen readers
  announce: (message, priority = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  },

  // Announce page changes
  announcePageChange: (pageTitle) => {
    screenReader.announce(`Navigated to ${pageTitle}`, 'assertive')
  },

  // Announce form errors
  announceFormErrors: (errorCount) => {
    screenReader.announce(`${errorCount} form error${errorCount !== 1 ? 's' : ''} found`, 'assertive')
  }
}

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance
  getRelativeLuminance: (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  },

  // Calculate contrast ratio
  getContrastRatio: (l1, l2) => {
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  },

  // Check if contrast meets WCAG AA standards
  meetsWCAGAA: (contrastRatio, isLargeText = false) => {
    const requiredRatio = isLargeText ? 3 : 4.5
    return contrastRatio >= requiredRatio
  },

  // Check if contrast meets WCAG AAA standards
  meetsWCAGAAA: (contrastRatio, isLargeText = false) => {
    const requiredRatio = isLargeText ? 4.5 : 7
    return contrastRatio >= requiredRatio
  }
}

// Form accessibility utilities
export const formAccessibility = {
  // Generate unique IDs for form elements
  generateId: (prefix = 'form') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  },

  // Associate label with form control
  associateLabel: (labelId, controlId) => {
    return {
      'htmlFor': controlId,
      'id': labelId
    }
  },

  // Associate description with form control
  associateDescription: (controlId, descriptionId) => {
    return {
      'aria-describedby': descriptionId
    }
  },

  // Mark field as required
  markRequired: (isRequired = true) => {
    return {
      'aria-required': isRequired,
      'required': isRequired
    }
  },

  // Mark field as invalid
  markInvalid: (isInvalid = true, errorMessage = '') => {
    return {
      'aria-invalid': isInvalid,
      'aria-errormessage': errorMessage || undefined
    }
  }
}

// React hooks for accessibility
export const useAccessibility = {
  // Hook for focus trap
  useFocusTrap: (shouldTrap = true) => {
    const containerRef = useRef(null)
    
    useEffect(() => {
      const cleanup = focusManagement.trapFocus(containerRef, shouldTrap)
      return cleanup
    }, [shouldTrap])
    
    return containerRef
  },

  // Hook for keyboard navigation
  useKeyboardNavigation: (currentIndex, totalItems, onNavigate) => {
    const handleKeyDown = useCallback(
      keyboardNavigation.handleArrowKeys(currentIndex, totalItems, onNavigate),
      [currentIndex, totalItems, onNavigate]
    )
    
    return handleKeyDown
  },

  // Hook for escape key handling
  useEscapeKey: (onEscape) => {
    const handleKeyDown = useCallback(
      keyboardNavigation.handleEscape(onEscape),
      [onEscape]
    )
    
    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])
  },

  // Hook for focus restoration
  useFocusRestoration: () => {
    const previousFocus = useRef(null)
    
    const storeFocus = useCallback(() => {
      previousFocus.current = document.activeElement
    }, [])
    
    const restoreFocus = useCallback(() => {
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus()
      }
    }, [])
    
    return { storeFocus, restoreFocus }
  }
}

// Utility functions for common accessibility patterns
export const accessibilityUtils = {
  // Skip to main content link
  createSkipLink: () => {
    const skipLink = document.createElement('a')
    skipLink.href = '#main-content'
    skipLink.textContent = 'Skip to main content'
    skipLink.className = 'skip-link sr-only-focusable'
    
    return skipLink
  },

  // Add skip link to page
  addSkipLink: () => {
    if (!document.querySelector('.skip-link')) {
      const skipLink = accessibilityUtils.createSkipLink()
      document.body.insertBefore(skipLink, document.body.firstChild)
    }
  },

  // Check if element is visible to screen readers
  isVisibleToScreenReader: (element) => {
    if (!element) return false
    
    const style = window.getComputedStyle(element)
    const isHidden = style.display === 'none' || 
                     style.visibility === 'hidden' || 
                     style.opacity === '0'
    
    const hasAriaHidden = element.getAttribute('aria-hidden') === 'true'
    
    return !isHidden && !hasAriaHidden
  },

  // Get accessible name for element
  getAccessibleName: (element) => {
    if (!element) return ''
    
    // Check aria-label first
    const ariaLabel = element.getAttribute('aria-label')
    if (ariaLabel) return ariaLabel
    
    // Check aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby')
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy)
      if (labelElement) return labelElement.textContent || ''
    }
    
    // Check alt text for images
    if (element.tagName === 'IMG') {
      return element.getAttribute('alt') || ''
    }
    
    // Check title attribute
    const title = element.getAttribute('title')
    if (title) return title
    
    // Fall back to text content
    return element.textContent || ''
  }
}

// Export all utilities
export default {
  focusManagement,
  keyboardNavigation,
  screenReader,
  colorContrast,
  formAccessibility,
  useAccessibility,
  accessibilityUtils
}
