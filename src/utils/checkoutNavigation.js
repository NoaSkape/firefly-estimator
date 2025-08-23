/**
 * Checkout Navigation Utility
 * Handles navigation between checkout steps with proper validation
 */

// Map step names to their corresponding routes
const STEP_ROUTES = {
  'Choose Your Home': (buildId, build = null) => `/models`,
  'Customize!': (buildId, build = null) => {
    // If we have a build ID and it's part of a checkout flow, include it as a query parameter
    if (buildId && buildId !== 'magnolia') {
      return `/customize/${build?.modelSlug || 'magnolia'}?buildId=${buildId}`
    }
    return `/customize/${build?.modelSlug || 'magnolia'}`
  },
  'Sign In': (buildId, build = null) => `/sign-in?redirect=${encodeURIComponent(`/checkout/${buildId}/buyer`)}`,
  'Delivery Address': (buildId, build = null) => `/checkout/${buildId}/buyer`,
  'Overview': (buildId, build = null) => `/checkout/${buildId}/review`,
  'Payment Method': (buildId, build = null) => `/checkout/${buildId}/payment-method`,
  'Contract': (buildId, build = null) => `/checkout/${buildId}/agreement`,
  'Confirmation': (buildId, build = null) => `/checkout/${buildId}/confirm`,
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
 * Update the build step in the database
 * @param {string} buildId - The build ID
 * @param {number} step - The step number (1-8)
 * @param {string} token - Auth token
 * @returns {Promise<boolean>} Whether the update was successful
 */
export async function updateBuildStep(buildId, step, token) {
  try {
    const response = await fetch(`/api/builds/${buildId}/checkout-step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ step })
    })
    
    if (!response.ok) {
      console.error('Failed to update build step:', response.status, response.statusText)
      return false
    }
    
    console.log(`Build step updated to ${step}/8`)
    return true
  } catch (error) {
    console.error('Error updating build step:', error)
    return false
  }
}

/**
 * Get the route for a specific step
 * @param {string} stepName - The name of the step
 * @param {string} buildId - The build ID
 * @param {object} build - The build data (optional, needed for model slug)
 * @returns {string} The route for the step
 */
export function getStepRoute(stepName, buildId, build = null) {
  const routeFunction = STEP_ROUTES[stepName]
  if (!routeFunction) {
    console.warn(`Unknown step: ${stepName}`)
    return `/checkout/${buildId}/review`
  }
  return routeFunction(buildId, build)
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
  
  // Special case: Sign In step
  if (targetStep === 'Sign In') {
    if (isSignedIn) {
      return { canNavigate: false, reason: 'Already signed in' }
    }
    return { canNavigate: true }
  }
  
  // If we have build data, allow navigation to any step that has been reached
  if (build && build.step) {
    const buildStep = build.step
    const targetStepNumber = targetIndex + 1 // Convert to 1-based step numbers
    
    // Allow navigation to any step that has been reached (step <= build.step)
    if (targetStepNumber <= buildStep) {
      return { canNavigate: true }
    }
  }
  
  // For steps that haven't been reached yet, apply validation
  if (targetIndex > currentIndex) {
    // Special case: Delivery Address requires sign in
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
    
    return { canNavigate: false, reason: 'Complete current step first' }
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
  
  const route = getStepRoute(targetStep, buildId, build)
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
 * @param {object} build - The build data (optional, for more accurate completion status)
 * @returns {boolean} Whether the step is completed
 */
export function isStepCompleted(stepIndex, currentStep, isSignedIn, build = null) {
  const currentIndex = getStepIndex(currentStep)
  
  // Sign In is completed if user is signed in
  if (stepIndex === 2) return isSignedIn
  
  // If we have build data, use the actual build step for more accurate completion
  if (build && build.step) {
    const buildStep = build.step
    // A step is completed if the build has progressed past it
    return stepIndex < buildStep
  }
  
  // Fallback: All previous steps are completed
  return stepIndex < currentIndex
}
