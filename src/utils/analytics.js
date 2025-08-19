export function trackEvent(name, payload = {}) {
  try {
    const data = { event: name, at: new Date().toISOString(), ...payload }
    // For now, just log. Hook up to a provider later.
    // eslint-disable-next-line no-console
    console.log('[analytics]', data)
  } catch {}
}


