import { checkImageSecurity } from '../services/content-security/image-security.service'
import { writeAuditLog } from '../services/audit.service'
import prisma from '../lib/prisma'

export async function handleImageCheckJob(data: {
  userId: string
  workspaceId?: string
  targetType: string
  targetId?: string
  imageUrl: string
}) {
  const check = await checkImageSecurity({
    imageUrl: data.imageUrl,
    userId: data.userId,
    workspaceId: data.workspaceId,
    targetType: data.targetType,
    targetId: data.targetId,
  })

  // 如果是 REJECT，隐藏封面
  if (check.status === 'REJECT' && data.targetType === 'BOOK' && data.targetId) {
    await prisma.book.update({
      where: { id: data.targetId },
      data: { coverUrl: null },
    })
  }

  // 写审计日志
  if (data.workspaceId) {
    await writeAuditLog({
      workspaceId: data.workspaceId,
      actorId: data.userId,
      action: `content_security.image.${check.status.toLowerCase()}`,
      entityType: 'ContentSecurityCheck',
      entityId: check.id,
      metadata: { targetType: data.targetType, targetId: data.targetId, status: check.status },
    })
  }

  return check
}
