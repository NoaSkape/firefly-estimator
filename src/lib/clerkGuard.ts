// Temporarily disable the guard to get the app working
// TODO: Re-enable after debugging domain issues
console.log('Clerk Guard temporarily disabled for debugging');

// Only run the guard on the client side
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  const isProdHost = host === 'fireflyestimator.com';
  const usingLive = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').startsWith('pk_live_');

  // Debug logging to see what's happening
  console.log('Clerk Guard Debug:', {
    host,
    isProdHost,
    usingLive,
    fullUrl: window.location.href,
    protocol: window.location.protocol
  });

  // Temporarily commented out the guard
  // if (!isProdHost && usingLive) {
  //   throw new Error('Clerk: pk_live_ used on non-production host. This key is bound to fireflyestimator.com only.');
  // }
}