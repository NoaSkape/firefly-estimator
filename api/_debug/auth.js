import { requireAuth } from '../../lib/auth.js'
import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export default async function handler(req, res) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (!debug) return res.status(404).json({ error: 'not_found' })
  const auth = await requireAuth(req, res, false)
  if (!auth?.userId) return res.status(401).json({ ok: false, error: 'unauthorized' })
  let user = auth.user
  if (!user) {
    try { user = await clerk.users.getUser(auth.userId) } catch {}
  }
  const emails = []
  try {
    if (user?.primaryEmailAddress?.emailAddress) emails.push(String(user.primaryEmailAddress.emailAddress))
    if (Array.isArray(user?.emailAddresses)) user.emailAddresses.forEach(e => { if (e?.emailAddress) emails.push(String(e.emailAddress)) })
  } catch {}
  const adminEmailsEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdminByRole = user?.publicMetadata?.role === 'admin'
  const isAdminByEmail = adminEmailsEnv.length > 0 && emails.map(e=>e.toLowerCase()).some(e => adminEmailsEnv.includes(e))
  const isAdmin = isAdminByRole || isAdminByEmail
  res.status(200).json({ ok: true, isAdmin, role: user?.publicMetadata?.role || null, emails, reason: { isAdminByRole, isAdminByEmail } })
}


