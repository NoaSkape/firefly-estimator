// Only run the guard on the client side
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  const isProdHost = host === 'fireflyestimator.com';
  const usingLive = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').startsWith('pk_live_');

  if (!isProdHost && usingLive) {
    throw new Error('Clerk: pk_live_ used on non-production host. This key is bound to fireflyestimator.com only.');
  }
}