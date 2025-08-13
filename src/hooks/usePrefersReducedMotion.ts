import { useEffect, useState } from 'react'

/**
 * Small hook to respect OS-level "Reduce Motion" preference.
 * Falls back to false when matchMedia is unsupported (older browsers / SSR).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) {
      setReduced(false)
      return
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = () => setReduced(!!mq.matches)
    handler()
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  return reduced
}


