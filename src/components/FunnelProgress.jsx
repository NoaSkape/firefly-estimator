import { useMemo } from 'react'

export default function FunnelProgress({ current = 'Choose Your Home', isSignedIn = false, onNavigate, disabledReason }) {
  const baseSteps = useMemo(() => ([
    'Choose Your Home',
    'Customize!',
    'Sign in/up',
    'Delivery Address',
    'Overview',
    'Payment Method',
    'Contract',
    'Confirmation',
  ]), [])

  const steps = useMemo(() => {
    return isSignedIn ? baseSteps.filter(s => s !== 'Sign in/up') : baseSteps
  }, [baseSteps, isSignedIn])

  const currentIndex = Math.max(0, steps.findIndex(s => s === current))

  function canGo(targetIndex) {
    // allow going back; forward allowed only by explicit handler
    return targetIndex <= currentIndex
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-center text-xs sm:text-sm text-gray-200 w-full overflow-x-hidden">
        {steps.map((label, idx) => {
          const active = idx <= currentIndex
          const enabled = canGo(idx)
          const reason = !enabled && typeof disabledReason === 'function' ? disabledReason(label, idx) : ''
          const isLast = idx === steps.length - 1
          return (
            <div key={label} className="flex items-center min-w-0">
              <button
                type="button"
                onClick={() => enabled && typeof onNavigate === 'function' && onNavigate(label, idx)}
                className={`flex items-center ${active ? 'text-yellow-300' : 'text-gray-200'} ${enabled ? '' : 'opacity-60 cursor-not-allowed'}`}
                title={reason || undefined}
                aria-disabled={!enabled}
              >
                <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                <span className="sm:hidden whitespace-nowrap">{label}</span>
              </button>
              {!isLast && (
                <div className={`mx-3 h-0.5 w-12 sm:w-16 md:w-20 lg:w-24 ${active ? 'bg-yellow-300/80' : 'bg-gray-400/70'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


