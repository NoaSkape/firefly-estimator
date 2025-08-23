import { useMemo } from 'react'

export default function FunnelProgress({ current = 'Choose Your Home', isSignedIn = false, onNavigate, disabledReason }) {
  const baseSteps = useMemo(() => ([
    'Choose Your Home',
    'Customize!',
    'Sign In',
    'Delivery Address',
    'Overview',
    'Payment Method',
    'Contract',
    'Confirmation',
  ]), [])

  const steps = useMemo(() => {
    return isSignedIn ? baseSteps.filter(s => s !== 'Sign In') : baseSteps
  }, [baseSteps, isSignedIn])

  const currentIndex = Math.max(0, steps.findIndex(s => s === current))

  function canGo(targetIndex) {
    // allow going back; forward allowed only by explicit handler
    return targetIndex <= currentIndex
  }

  return (
    <div className="mb-6">
      {/* Desktop: Single row layout */}
      <div className="hidden md:flex items-center justify-center text-xs sm:text-sm text-gray-200 w-full overflow-x-hidden">
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
            const enabled = canGo(idx)
            const reason = !enabled && typeof disabledReason === 'function' ? disabledReason(label, idx) : ''
            return (
              <button
                key={label}
                type="button"
                onClick={() => enabled && typeof onNavigate === 'function' && onNavigate(label, idx)}
                className={`flex flex-col items-center p-2 rounded ${active ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-200'} ${enabled ? '' : 'opacity-60 cursor-not-allowed'}`}
                title={reason || undefined}
                aria-disabled={!enabled}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 text-xs font-medium ${active ? 'bg-yellow-500 text-gray-900' : 'bg-gray-500 text-white'}`}>
                  {idx+1}
                </span>
                <span className="text-center leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}


