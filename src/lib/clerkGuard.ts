// Only run the guard on the client side
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  // Check for both www.fireflyestimator.com and fireflyestimator.com
  const isProdHost = host === 'fireflyestimator.com' || host === 'www.fireflyestimator.com';
  const usingLive = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').startsWith('pk_live_');

  // Debug logging to see what's happening
  console.log('Clerk Guard Debug:', {
    host,
    isProdHost,
    usingLive,
    fullUrl: window.location.href,
    protocol: window.location.protocol
  });

  if (!isProdHost && usingLive) {
    throw new Error('Clerk: pk_live_ used on non-production host. This key is bound to fireflyestimator.com only.');
  }
}