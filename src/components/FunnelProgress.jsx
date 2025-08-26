import { useMemo } from 'react'
import { canNavigateToStep, isStepCompleted } from '../utils/checkoutNavigation'

export default function FunnelProgress({ 
  current = 'Choose Your Home', 
  isSignedIn = false, 
  onNavigate, 
  disabledReason,
  build = null,
  buildId = null
}) {
  const steps = useMemo(() => ([
    'Choose Your Home',
    'Customize!',
    'Sign In',
    'Delivery Address',
    'Overview',
    'Payment Method',
    'Contract',
    'Confirmation',
  ]), [])

  const currentIndex = Math.max(0, steps.findIndex(s => s === current))

  function canGo(targetIndex) {
    const targetStep = steps[targetIndex]
    if (!targetStep) return false
    
    // Disable Sign In step (step 3) from being clickable
    if (targetStep === 'Sign In') {
      return false
    }
    
    const validation = canNavigateToStep(targetStep, current, isSignedIn, build)
    return validation.canNavigate
  }

  function getDisabledReason(targetIndex) {
    const targetStep = steps[targetIndex]
    if (!targetStep) return 'Invalid step'
    
    const validation = canNavigateToStep(targetStep, current, isSignedIn, build)
    return validation.canNavigate ? '' : validation.reason
  }

  function isCompleted(stepIndex) {
    return isStepCompleted(stepIndex, current, isSignedIn, build)
  }

  return (
    <div className="mb-6 pt-8">
      {/* Desktop: Responsive layout that wraps when needed */}
      <div className="hidden md:block">
        <div className="flex flex-wrap items-center justify-center text-xs sm:text-sm text-gray-200 gap-x-2 gap-y-3 max-w-full">
          {steps.map((label, idx) => {
            const active = idx <= currentIndex
            const completed = isCompleted(idx)
            const enabled = canGo(idx)
            const reason = !enabled && typeof disabledReason === 'function' ? disabledReason(label, idx) : ''
            const isLast = idx === steps.length - 1
            return (
              <div key={label} className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (enabled && typeof onNavigate === 'function') {
                      onNavigate(label, idx)
                    }
                  }}
                  className={`flex items-center px-2 py-1 rounded-md transition-colors ${active ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-200'} ${enabled ? 'hover:text-yellow-400 hover:bg-yellow-400/10' : 'opacity-60 cursor-not-allowed'}`}
                  title={getDisabledReason(idx) || undefined}
                  aria-disabled={!enabled}
                >
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 text-xs font-medium ${
                    completed ? 'bg-green-500 text-white' : 
                    active ? 'bg-yellow-500 text-gray-900' : 
                    'bg-gray-500 text-white'
                  }`}>{idx+1}</span>
                  <span className="whitespace-nowrap text-sm">{label}</span>
                </button>
                {!isLast && (
                  <div className={`mx-1 w-4 h-0.5 flex-shrink-0 ${active ? 'bg-yellow-500/80' : 'bg-gray-400/70'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: 2-row grid layout */}
      <div className="md:hidden">
        <div className="grid grid-cols-4 gap-2 text-xs text-gray-200">
          {steps.map((label, idx) => {
            const active = idx <= currentIndex
            const completed = isCompleted(idx)
            const enabled = canGo(idx)
            const reason = !enabled && typeof disabledReason === 'function' ? disabledReason(label, idx) : ''
            return (
              <div key={label} className="relative">
                {/* Green checkmark for completed steps */}
                {completed && (
                  <div className="absolute -top-2 right-1 z-10">
                    <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (enabled && typeof onNavigate === 'function') {
                      onNavigate(label, idx)
                    }
                  }}
                  className={`flex flex-col items-center p-2 rounded w-full ${active ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-200'} ${enabled ? 'hover:bg-yellow-500/20' : 'opacity-60 cursor-not-allowed'}`}
                  title={getDisabledReason(idx) || undefined}
                  aria-disabled={!enabled}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 text-xs font-medium ${active ? 'bg-yellow-500 text-gray-900' : 'bg-gray-500 text-white'}`}>
                    {idx+1}
                  </span>
                  <span className="text-center leading-tight">{label}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


