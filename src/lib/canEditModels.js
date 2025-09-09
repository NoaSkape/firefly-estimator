export function canEditModelsClient(user) {
  if (!user) return false
  // Client-side: rely only on Clerk role to avoid exposing admin allowlist
  return user?.publicMetadata?.role === 'admin'
}


