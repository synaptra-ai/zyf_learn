import prisma from '../lib/prisma'

interface AuditParams {
  workspaceId: string
  actorId: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, any>
}

export async function writeAuditLog(params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata || {},
    },
  })
}
