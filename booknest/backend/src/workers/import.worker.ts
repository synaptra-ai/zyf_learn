import { parse } from 'csv-parse/sync'
import prisma from '../lib/prisma'
import { logger } from '../utils/logger'

interface ImportJobData {
  importJobId: string
  userId: string
  workspaceId: string
  csvText: string
}

export async function handleBookImportJob(data: ImportJobData) {
  const { importJobId, userId, workspaceId, csvText } = data

  await prisma.importJob.update({
    where: { id: importJobId },
    data: { status: 'RUNNING' },
  })

  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<{
      title: string
      author: string
      status?: string
      pageCount?: string
      description?: string
    }>

    await prisma.importJob.update({
      where: { id: importJobId },
      data: { total: records.length },
    })

    let successCount = 0
    let failedCount = 0

    for (const record of records) {
      try {
        if (!record.title || !record.author) throw new Error('title 和 author 必填')

        await prisma.book.create({
          data: {
            title: record.title,
            author: record.author,
            status: (record.status as any) || 'WISHLIST',
            pageCount: record.pageCount ? Number(record.pageCount) : undefined,
            description: record.description || undefined,
            userId,
            workspaceId,
          },
        })

        successCount++
      } catch (err) {
        failedCount++
        logger.warn('Import row failed', { importJobId, record, error: (err as Error).message })
      }

      await prisma.importJob.update({
        where: { id: importJobId },
        data: {
          processed: { increment: 1 },
          successCount,
          failedCount,
        },
      })
    }

    await prisma.importJob.update({
      where: { id: importJobId },
      data: { status: 'SUCCESS' },
    })
  } catch (err) {
    await prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: 'FAILED',
        error: (err as Error).message,
      },
    })
  }
}
