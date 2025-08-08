import { getAuth, clerkClient } from '@clerk/backend';

export async function requireAuth(req, res, adminOnly = false) {
  const { userId, user: embeddedUser } = getAuth(req);
  let user = embeddedUser;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (adminOnly) {
    // In some environments, getAuth(req) does not include the user object.
    // Fetch it explicitly so we can examine public metadata and emails.
    if (!user) {
      try {
        user = await clerkClient.users.getUser(userId);
      } catch (_) {
        // ignore; we'll fall back to email allowlist or deny
      }
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