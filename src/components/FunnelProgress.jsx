import { useMemo } from 'react'

export default function FunnelProgress({ current = 'Choose Your Home', isSignedIn = false, onNavigate, disabledReason }) {
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
    // allow going back; forward allowed only by explicit handler
    return targetIndex <= currentIndex
  }

  function isCompleted(stepIndex) {
    // Sign In is completed if user is signed in
    if (stepIndex === 2) return isSignedIn
    // All previous steps are completed
    return stepIndex < currentIndex
  }

  return (
    <div className="mb-6 pt-8">
      {/* Desktop: Single row layout */}
      <div className="hidden md:flex items-center justify-center text-xs sm:text-sm text-gray-200 w-full overflow-x-hidden">
        {steps.map((label, idx) => {
          const active = idx <= currentIndex
          const completed = isCompleted(idx)
          const enabled = canGo(idx)
          const reason = !enabled && typeof disabledReason === 'function' ? disabledReason(label, idx) : ''
          const isLast = idx === steps.length - 1
          return (
            <div key={label} className="flex items-center min-w-0 relative">
              {/* Green checkmark for completed steps */}
              {completed && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => enabled && typeof onNavigate === 'function' && onNavigate(label, idx)}
                className={`flex items-center ${active ? 'text-yellow-500' : 'text-gray-200'} ${enabled ? '' : 'opacity-60 cursor-not-allowed'}`}
                title={reason || undefined}
                aria-disabled={!enabled}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 ${active ? 'bg-yellow-500 text-gray-900' : 'bg-gray-500 text-white'}`}>{idx+1}</span>
                <span className="whitespace-nowrap">{label}</span>
              </button>
              {!isLast && (
                <div className={`mx-3 h-0.5 flex-1 ${active ? 'bg-yellow-500/80' : 'bg-gray-400/70'}`} />
              )}
            </div>
          )
        })}
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
                  onClick={() => enabled && typeof onNavigate === 'function' && onNavigate(label, idx)}
                  className={`flex flex-col items-center p-2 rounded w-full ${active ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-200'} ${enabled ? '' : 'opacity-60 cursor-not-allowed'}`}
                  title={reason || undefined}
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


