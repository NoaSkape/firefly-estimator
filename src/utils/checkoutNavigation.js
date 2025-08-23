/**
 * Checkout Navigation Utility
 * Handles navigation between checkout steps with proper validation
 */

// Map step names to their corresponding routes
const STEP_ROUTES = {
  'Choose Your Home': (buildId) => `/models`,
  'Customize!': (buildId) => `/customize/${buildId}`,
  'Sign In': (buildId) => `/sign-in?redirect=${encodeURIComponent(`/checkout/${buildId}/buyer`)}`,
  'Delivery Address': (buildId) => `/checkout/${buildId}/buyer`,
  'Overview': (buildId) => `/checkout/${buildId}/review`,
  'Payment Method': (buildId) => `/checkout/${buildId}/payment-method`,
  'Contract': (buildId) => `/checkout/${buildId}/agreement`,
  'Confirmation': (buildId) => `/checkout/${buildId}/confirm`,
}

// Step order for validation
const STEP_ORDER = [
  'Choose Your Home',
  'Customize!',
  'Sign In',
  'Delivery Address',
  'Overview',
  'Payment Method',
  'Contract',
  'Confirmation',
]

/**
 * Get the route for a specific step
 * @param {string} stepName - The name of the step
 * @param {string} buildId - The build ID
 * @returns {string} The route for the step
 */
export function getStepRoute(stepName, buildId) {
  const routeFunction = STEP_ROUTES[stepName]
  if (!routeFunction) {
    console.warn(`Unknown step: ${stepName}`)
    return `/checkout/${buildId}/review`
  }
  return routeFunction(buildId)
}

/**
 * Check if a user can navigate to a specific step
 * @param {string} targetStep - The step to navigate to
 * @param {string} currentStep - The current step
 * @param {boolean} isSignedIn - Whether the user is signed in
 * @param {object} build - The build data for additional validation
 * @returns {object} { canNavigate: boolean, reason?: string }
 */
export function canNavigateToStep(targetStep, currentStep, isSignedIn, build = null) {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  const targetIndex = STEP_ORDER.indexOf(targetStep)
  
  if (currentIndex === -1 || targetIndex === -1) {
    return { canNavigate: false, reason: 'Invalid step' }
  }
  
  // Can always go back to previous steps
  if (targetIndex < currentIndex) {
    return { canNavigate: true }
  }
  
  // Cannot go forward without completing current step
  if (targetIndex > currentIndex) {
    return { canNavigate: false, reason: 'Complete current step first' }
  }
  
  // Special case: Sign In step
  if (targetStep === 'Sign In') {
    if (isSignedIn) {
      return { canNavigate: false, reason: 'Already signed in' }
    }
    return { canNavigate: true }
  }
  
  // Special case: Delivery Address requires buyer info
  if (targetStep === 'Delivery Address') {
    if (!isSignedIn) {
      return { canNavigate: false, reason: 'Sign in required' }
    }
    return { canNavigate: true }
  }
  
  // Special case: Overview requires delivery address
  if (targetStep === 'Overview') {
    if (!isSignedIn) {
      return { canNavigate: false, reason: 'Sign in required' }
    }
    if (!build?.buyerInfo?.deliveryAddress && !build?.buyerInfo?.address) {
      return { canNavigate: false, reason: 'Delivery address required' }
    }
    return { canNavigate: true }
  }
  
  // Special case: Payment Method requires overview completion
  if (targetStep === 'Payment Method') {
    if (!isSignedIn) {
      return { canNavigate: false, reason: 'Sign in required' }
    }
    if (!build?.buyerInfo?.deliveryAddress && !build?.buyerInfo?.address) {
      return { canNavigate: false, reason: 'Delivery address required' }
    }
    return { canNavigate: true }
  }
  
  return { canNavigate: true }
}

/**
 * Navigate to a specific step with validation
 * @param {string} targetStep - The step to navigate to
 * @param {string} currentStep - The current step
 * @param {string} buildId - The build ID
 * @param {boolean} isSignedIn - Whether the user is signed in
 * @param {object} build - The build data for validation
 * @param {function} navigate - React Router navigate function
 * @param {function} addToast - Toast function for error messages
 * @returns {boolean} Whether navigation was successful
 */
export function navigateToStep(targetStep, currentStep, buildId, isSignedIn, build, navigate, addToast) {
  const validation = canNavigateToStep(targetStep, currentStep, isSignedIn, build)
  
  if (!validation.canNavigate) {
    addToast?.({
      type: 'warning',
      title: 'Cannot Navigate',
      message: validation.reason || 'Cannot navigate to this step'
    })
    return false
  }
  
  const route = getStepRoute(targetStep, buildId)
  navigate(route)
  return true
}

/**
 * Get the current step index
 * @param {string} stepName - The step name
 * @returns {number} The step index (0-based)
 */
export function getStepIndex(stepName) {
  return STEP_ORDER.indexOf(stepName)
}

/**
 * Get the step name by index
 * @param {number} index - The step index
 * @returns {string} The step name
 */
export function getStepName(index) {
  return STEP_ORDER[index] || 'Choose Your Home'
}

/**
 * Check if a step is completed
 * @param {number} stepIndex - The step index
 * @param {string} currentStep - The current step
 * @param {boolean} isSignedIn - Whether the user is signed in
 * @returns {boolean} Whether the step is completed
 */
export function isStepCompleted(stepIndex, currentStep, isSignedIn) {
  const currentIndex = getStepIndex(currentStep)
  
  // Sign In is completed if user is signed in
  if (stepIndex === 2) return isSignedIn
  
  // All previous steps are completed
  return stepIndex < currentIndex
}
