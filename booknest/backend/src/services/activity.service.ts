import prisma from '../lib/prisma'
import { writeAuditLog } from './audit.service'
import { checkTextSecurity } from './content-security/text-security.service'
import { ApiError } from '../utils/errors'

export async function listActivities(workspaceId: string) {
  return prisma.activity.findMany({
    where: { workspaceId },
    orderBy: { startsAt: 'asc' },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })
}

export async function createActivity(userId: string, workspaceId: string, data: any) {
  const textToCheck = [data.title, data.description].filter(Boolean).join(' ')
  if (textToCheck) {
    const check = await checkTextSecurity({
      content: textToCheck,
      userId,
      workspaceId,
      targetType: 'ACTIVITY',
    })
    if (check.status === 'REJECT') throw new ApiError(400, '活动内容包含违规信息，请修改')
  }

  const activity = await prisma.activity.create({
    data: {
      ...data,
      startsAt: new Date(data.startsAt),
      workspaceId,
      createdById: userId,
    },
  })

  await writeAuditLog({
    workspaceId,
    actorId: userId,
    action: 'activity.created',
    entityType: 'Activity',
    entityId: activity.id,
    metadata: { title: activity.title },
  })

  return activity
}

export async function getActivity(workspaceId: string, id: string) {
  const activity = await prisma.activity.findFirst({
    where: { id, workspaceId },
    include: { tickets: true },
  })

  if (!activity) throw new ApiError(404, '活动不存在')
  return activity
}
