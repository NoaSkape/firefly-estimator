// Clerk server SDK imports (use @clerk/backend consistently)
import { createClerkClient, verifyToken } from '@clerk/backend'

// Singleton Clerk client (re-used across invocations)
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export async function requireAuth(req, res, adminOnly = false) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  // Extract Bearer token from Authorization header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  if (!token && !adminOnly) {
    // Allow anonymous reads when not adminOnly; helpful for GET in prod where token might not be attached
    return { userId: null, user: null }
  }
  if (debug) {
    const masked = typeof authHeader === 'string' ? `${authHeader.slice(0, 13)}...${authHeader.slice(-6)}` : null
    console.log('[DEBUG_ADMIN] requireAuth: incoming Authorization header', { present: !!authHeader, masked })
  }
  if (!token) {
    // Allow unauthenticated access for non-admin routes (e.g., GET handlers)
    if (!adminOnly) return { userId: null, user: null };
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let userId = null;
  let user = null;
  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      // audience: optional; add if you set it in Clerk JWT templates
    })
    userId = verified?.sub || verified?.userId || null;
    if (debug) {
      console.log('[DEBUG_ADMIN] requireAuth: verifyToken result', { hasVerified: !!verified, userId })
    }
  } catch (_) {
    if (debug) console.log('[DEBUG_ADMIN] requireAuth: verifyToken failed')
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (adminOnly) {
    // In some environments, getAuth(req) does not include the user object.
    // Fetch it explicitly so we can examine public metadata and emails.
    try {
      user = await clerk.users.getUser(userId);
    } catch (_) {
      // ignore; we will rely on allowlist only if fetch fails
    }
    if (debug) {
      const emails = []
      try {
        if (user?.primaryEmailAddress?.emailAddress) emails.push(String(user.primaryEmailAddress.emailAddress))
        if (Array.isArray(user?.emailAddresses)) user.emailAddresses.forEach(e => { if (e?.emailAddress) emails.push(String(e.emailAddress)) })
      } catch {}
      console.log('[DEBUG_ADMIN] requireAuth: fetched user', {
        fetched: !!user,
        role: user?.publicMetadata?.role,
        emails
      })
    }
    const adminEmailsEnv = (process.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const userEmails = [];
    try {
      if (user?.primaryEmailAddress?.emailAddress) {
        userEmails.push(String(user.primaryEmailAddress.emailAddress).toLowerCase());
      }
      if (Array.isArray(user?.emailAddresses)) {
        for (const e of user.emailAddresses) {
          if (e?.emailAddress) userEmails.push(String(e.emailAddress).toLowerCase());
        }
      }
    } catch (_) {
      // ignore
    }

    const isAdminByRole = user?.publicMetadata?.role === 'admin';
    const isAdminByEmail = adminEmailsEnv.length > 0 && userEmails.some(e => adminEmailsEnv.includes(e));
    const isAdmin = isAdminByRole || isAdminByEmail;
    if (debug) {
      console.log('[DEBUG_ADMIN] requireAuth: admin decision', {
        isAdminByRole,
        isAdminByEmailList: isAdminByEmail,
        final: isAdmin
      })
    }

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  return { userId, user };
} 

/** Shared admin util for server-side routes */
export function canEditModelsServer(user) {
  const role = user?.publicMetadata?.role
  if (role === 'admin') return true
  const allow = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  if (!allow.length) return false
  const emails = []
  try {
    if (user?.primaryEmailAddress?.emailAddress) emails.push(String(user.primaryEmailAddress.emailAddress).toLowerCase())
    if (Array.isArray(user?.emailAddresses)) {
      for (const e of user.emailAddresses) if (e?.emailAddress) emails.push(String(e.emailAddress).toLowerCase())
    }
  } catch {}
  return emails.some(e => allow.includes(e))
}