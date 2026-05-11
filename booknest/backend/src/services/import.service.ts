import prisma from '@/lib/prisma'
import { importQueue } from '@/lib/queue'

export async function createBookImportJob(userId: string, workspaceId: string, file: Express.Multer.File) {
  const job = await prisma.importJob.create({
    data: { userId, workspaceId, status: 'PENDING' },
  })

  await importQueue.add('book-import', {
    importJobId: job.id,
    userId,
    workspaceId,
    csvText: file.buffer.toString('utf-8'),
  })

  return job
}

export async function getImportJob(userId: string, workspaceId: string, jobId: string) {
  return prisma.importJob.findFirst({
    where: { id: jobId, userId, workspaceId },
  })
}
