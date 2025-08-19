export default function CheckoutProgress({ step = 1, onNavigate, canNavigateTo }) {
  const steps = [
    'Customize',
    'Create Account',
    'Payment Method',
    'Review & Sign',
    'Confirmation',
  ]
  function canGo(target) {
    if (typeof canNavigateTo === 'function') return !!canNavigateTo(target)
    // Default: allow backwards freely, block forward beyond current
    return target <= step
  }
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-300">
        {steps.map((label, idx) => {
          const n = idx + 1
          const active = n <= step
          const enabled = canGo(n)
          return (
            <div key={label} className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => enabled && typeof onNavigate === 'function' && onNavigate(n)}
                className={`flex items-center gap-2 ${active ? 'text-yellow-400' : 'text-gray-400'} ${enabled ? '' : 'opacity-50 cursor-not-allowed'}`}
                aria-disabled={!enabled}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-900 ${active ? 'bg-yellow-400' : 'bg-gray-600 text-white'}`}>{n}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {n < steps.length && (
                <div className={`mx-2 h-0.5 flex-1 ${active ? 'bg-yellow-400/60' : 'bg-gray-700'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )}


