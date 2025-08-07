import { getAuth } from '@clerk/backend';

export async function requireAuth(req, res, adminOnly = false) {
  const { userId, sessionId, getToken, user } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (adminOnly && user?.publicMetadata?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return { userId, user };
} 