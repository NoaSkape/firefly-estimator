import { useMemo } from 'react'

export default function FunnelProgress({ current = 'Choose Your Home', isSignedIn = false, onNavigate, disabledReason }) {
  const baseSteps = useMemo(() => ([
    'Choose Your Home',
    'Customize!',
    'Sign in/up',
    'Delivery Address',
    'Overview',
    'Payment Method',
    'Contract & Signature',
    'Order Confirmation',
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
          const n = idx + 1
          const active = idx <= currentIndex
          const enabled = canGo(idx)
          const reason = !enabled && typeof disabledReason === 'function' ? disabledReason(label, idx) : ''
          return (
            <div key={label} className="flex items-center min-w-0">
              <button
                type="button"
                onClick={() => enabled && typeof onNavigate === 'function' && onNavigate(label, idx)}
                className={`flex items-center gap-2 ${active ? 'text-yellow-300' : 'text-gray-200'} ${enabled ? '' : 'opacity-60 cursor-not-allowed'}`}
                title={reason || undefined}
                aria-disabled={!enabled}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${active ? 'bg-yellow-400 text-gray-900' : 'bg-gray-500 text-white'}`}>{n}</span>
                <span className="hidden sm:inline whitespace-nowrap">{label}</span>
              </button>
              {n < steps.length && (
                <div className={`mx-2 h-0.5 flex-1 min-w-[16px] ${active ? 'bg-yellow-300/80' : 'bg-gray-400/70'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


