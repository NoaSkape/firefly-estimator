// Server-side admin check function
export async function isAdmin(userId) {
  if (!userId) return false
  
  try {
    // Import Clerk client for server-side user lookup
    const { createClerkClient } = await import('@clerk/backend')
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    
    // Get user from Clerk
    const user = await clerk.users.getUser(userId)
    if (!user) return false
    
    // Check if user has admin role in metadata
    if (user.publicMetadata?.role === 'admin') return true
    
    // Check against allowed admin emails
    const allow = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
    
    if (!allow.length) return false
    
    const emails = new Set()
    try {
      if (user.primaryEmailAddress?.emailAddress) {
        emails.add(String(user.primaryEmailAddress.emailAddress).toLowerCase())
      }
      if (Array.isArray(user.emailAddresses)) {
        user.emailAddresses.forEach(e => { 
          if (e?.emailAddress) emails.add(String(e.emailAddress).toLowerCase()) 
        })
      }
    } catch {}
    
    return Array.from(emails).some(e => allow.includes(e))
  } catch (error) {
    console.error('Server-side admin check error:', error)
    return false
  }
}
