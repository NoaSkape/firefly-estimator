/**
 * Browser Compatibility Utilities for Contract Signing
 * Handles cross-browser differences and provides fallbacks
 */

/**
 * Check if browser supports popup windows
 */
export function supportsPopups() {
  try {
    const testWindow = window.open('', '_blank', 'width=1,height=1')
    if (testWindow) {
      testWindow.close()
      return true
    }
    return false
  } catch (error) {
    return false
  }
}

/**
 * Detect if popups are blocked
 */
export function detectPopupBlocked() {
  try {
    const testWindow = window.open('about:blank', '_blank', 'width=1,height=1')
    if (!testWindow || testWindow.closed) {
      return true
    }
    testWindow.close()
    return false
  } catch (error) {
    return true
  }
}

/**
 * Get browser information
 */
export function getBrowserInfo() {
  const userAgent = navigator.userAgent.toLowerCase()
  
  const browsers = {
    chrome: /chrome/.test(userAgent) && !/edge/.test(userAgent),
    firefox: /firefox/.test(userAgent),
    safari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
    edge: /edge/.test(userAgent) || /edg/.test(userAgent),
    ie: /trident/.test(userAgent) || /msie/.test(userAgent)
  }
  
  const currentBrowser = Object.keys(browsers).find(browser => browsers[browser]) || 'unknown'
  
  return {
    name: currentBrowser,
    userAgent,
    isSupported: !browsers.ie, // IE is not supported
    supportsPDF: currentBrowser !== 'ie',
    supportsModernJS: !browsers.ie
  }
}

/**
 * Check if browser supports PDF viewing
 */
export function supportsPDFViewing() {
  const browserInfo = getBrowserInfo()
  
  // IE doesn't support modern PDF viewing
  if (browserInfo.name === 'ie') return false
  
  // Check for PDF plugin support
  if (navigator.plugins && navigator.plugins.length > 0) {
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i]
      if (plugin.name.toLowerCase().includes('pdf')) {
        return true
      }
    }
  }
  
  // Modern browsers typically have built-in PDF support
  return ['chrome', 'firefox', 'safari', 'edge'].includes(browserInfo.name)
}

/**
 * Open document with cross-browser compatibility
 */
export function openDocument(url, options = {}) {
  const {
    preferPopup = true,
    windowFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes',
    fallbackToTab = true
  } = options
  
  const browserInfo = getBrowserInfo()
  
  // For unsupported browsers, always use new tab
  if (!browserInfo.isSupported) {
    window.open(url, '_blank')
    return { method: 'tab', success: true }
  }
  
  if (preferPopup) {
    try {
      const newWindow = window.open(url, '_blank', windowFeatures)
      
      if (newWindow && !newWindow.closed) {
        return { method: 'popup', success: true, window: newWindow }
      } else if (fallbackToTab) {
        window.open(url, '_blank')
        return { method: 'tab', success: true, fallback: true }
      } else {
        return { method: 'popup', success: false, blocked: true }
      }
    } catch (error) {
      if (fallbackToTab) {
        window.open(url, '_blank')
        return { method: 'tab', success: true, fallback: true, error }
      } else {
        return { method: 'popup', success: false, error }
      }
    }
  } else {
    window.open(url, '_blank')
    return { method: 'tab', success: true }
  }
}

/**
 * Download file with cross-browser compatibility
 */
export async function downloadFile(url, filename) {
  const browserInfo = getBrowserInfo()
  
  try {
    // Modern browsers support fetch + blob download
    if (browserInfo.supportsModernJS) {
      const response = await fetch(url)
      const blob = await response.blob()
      
      // Use download attribute (supported in modern browsers)
      if ('download' in document.createElement('a')) {
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename || 'document.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
        return { method: 'blob', success: true }
      }
    }
    
    // Fallback: direct link
    window.open(url, '_blank')
    return { method: 'direct', success: true, fallback: true }
    
  } catch (error) {
    // Final fallback: direct link
    window.open(url, '_blank')
    return { method: 'direct', success: true, fallback: true, error }
  }
}

/**
 * Check for required browser features
 */
export function checkBrowserRequirements() {
  const requirements = {
    javascript: typeof window !== 'undefined',
    localStorage: (() => {
      try {
        const test = 'test'
        localStorage.setItem(test, test)
        localStorage.removeItem(test)
        return true
      } catch (error) {
        return false
      }
    })(),
    fetch: typeof fetch !== 'undefined',
    promises: typeof Promise !== 'undefined',
    es6: (() => {
      try {
        eval('const test = () => {}')
        return true
      } catch (error) {
        return false
      }
    })()
  }
  
  const missing = Object.keys(requirements).filter(req => !requirements[req])
  
  return {
    supported: missing.length === 0,
    missing,
    requirements
  }
}

/**
 * Show browser compatibility warning
 */
export function showBrowserWarning() {
  const browserInfo = getBrowserInfo()
  const requirements = checkBrowserRequirements()
  
  if (!browserInfo.isSupported || !requirements.supported) {
    const message = `
      Your browser (${browserInfo.name}) may not be fully compatible with this application.
      For the best experience, please use a modern browser like Chrome, Firefox, Safari, or Edge.
      
      ${!requirements.supported ? `Missing features: ${requirements.missing.join(', ')}` : ''}
    `
    
    console.warn('Browser compatibility warning:', message)
    
    return {
      show: true,
      message: message.trim(),
      browserInfo,
      requirements
    }
  }
  
  return { show: false }
}

/**
 * Initialize browser compatibility checks
 */
export function initBrowserCompatibility() {
  const warning = showBrowserWarning()
  const popupSupport = supportsPopups()
  const pdfSupport = supportsPDFViewing()
  
  return {
    warning,
    popupSupport,
    pdfSupport,
    browserInfo: getBrowserInfo(),
    requirements: checkBrowserRequirements()
  }
}
