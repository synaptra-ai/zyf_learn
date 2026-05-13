import { uploadToOSS, deleteFromOSS } from '../lib/oss'
import prisma from '../lib/prisma'
import { cache } from '../lib/cache'
import { ApiError } from '../utils/errors'
import { contentSecurityQueue } from '../lib/queue'

export const uploadService = {
  async uploadCover(userId: string, bookId: string, file: Express.Multer.File, workspaceId?: string) {
    const book = await prisma.book.findFirst({ where: { id: bookId, userId } })
    if (!book) throw new ApiError(404, '书籍不存在')

    // 删除旧封面
    if (book.coverUrl) {
      await deleteFromOSS(book.coverUrl).catch(() => {})
    }

    // 上传新封面到 OSS
    const coverUrl = await uploadToOSS(file.originalname, file.buffer, file.mimetype)

    // 更新数据库
    const updated = await prisma.book.update({
      where: { id: bookId },
      data: { coverUrl },
      include: { category: true },
    })

    // 异步图片安全检测
    await contentSecurityQueue.add('image-check', {
      userId,
      workspaceId: workspaceId || book.workspaceId,
      targetType: 'BOOK',
      targetId: bookId,
      imageUrl: coverUrl,
    })

    // 清除缓存
    await Promise.all([cache.del(`books:${userId}*`), cache.del(`stats:${userId}`)])

    return updated
  },
}
