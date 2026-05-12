type Role = 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER'

const rank: Record<Role, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
}

function getRank(role?: string | null): number {
  if (!role) return 0
  return rank[role as Role] || 0
}

export function canCreateBook(role?: string | null) {
  return getRank(role) >= rank.MEMBER
}

export function canEditBook(role?: string | null) {
  return getRank(role) >= rank.MEMBER
}

export function canDeleteBook(role?: string | null) {
  return getRank(role) >= rank.ADMIN
}

export function canDeleteOwnBook(role?: string | null, isOwner?: boolean) {
  const r = getRank(role)
  if (r >= rank.ADMIN) return true
  if (role === 'MEMBER' && isOwner) return true
  return false
}
