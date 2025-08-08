// Clerk server SDK imports
// Keeping current implementation but aligning with server import guidance.
import { clerkClient, verifyToken } from '@clerk/clerk-sdk-node';

export async function requireAuth(req, res, adminOnly = false) {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let userId = null;
  let user = null;
  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    userId = verified?.sub || verified?.userId || null;
  } catch (_) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (adminOnly) {
    // In some environments, getAuth(req) does not include the user object.
    // Fetch it explicitly so we can examine public metadata and emails.
    try {
      user = await clerkClient.users.getUser(userId);
    } catch (_) {
      // ignore; we will rely on allowlist only if fetch fails
    }
    const adminEmailsEnv = (process.env.ADMIN_EMAILS || '')
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
  const allow = (process.env.ADMIN_EMAILS || '')
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