export function canEditModelsClient(user) {
  if (!user) return false
  if (user?.publicMetadata?.role === 'admin') return true
  const allow = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  if (!allow.length) return false
  const emails = new Set()
  try {
    if (user.primaryEmailAddress?.emailAddress) emails.add(String(user.primaryEmailAddress.emailAddress).toLowerCase())
    if (Array.isArray(user.emailAddresses)) user.emailAddresses.forEach(e => { if (e?.emailAddress) emails.add(String(e.emailAddress).toLowerCase()) })
  } catch {}
  return Array.from(emails).some(e => allow.includes(e))
}


