import type { WorkspaceRole } from '@booknest/domain'

const rank: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
}

export function canCreateBook(role?: WorkspaceRole | string | null) {
  return Boolean(role && rank[role as WorkspaceRole] >= rank.MEMBER)
}

export function canEditBook(role?: WorkspaceRole | string | null) {
  return Boolean(role && rank[role as WorkspaceRole] >= rank.MEMBER)
}

export function canDeleteBook(role?: WorkspaceRole | string | null) {
  return Boolean(role && rank[role as WorkspaceRole] >= rank.ADMIN)
}

export function canDeleteOwnBook(role?: WorkspaceRole | string | null, isOwner?: boolean) {
  if (!role) return false
  const r = role as WorkspaceRole
  if (rank[r] >= rank.ADMIN) return true
  if (r === 'MEMBER' && isOwner) return true
  return false
}

export function canManageMembers(role?: WorkspaceRole | string | null) {
  return role === 'OWNER' || role === 'ADMIN'
}
