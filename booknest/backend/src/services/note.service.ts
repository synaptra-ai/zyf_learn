import prisma from '../lib/prisma'

export const noteService = {
  async create(userId: string, workspaceId: string, data: { bookId: string; content: string; pageNumber?: number }) {
    return prisma.note.create({
      data: {
        userId,
        workspaceId,
        bookId: data.bookId,
        content: data.content,
        pageNumber: data.pageNumber,
      },
    })
  },

  async listByBook(bookId: string, userId: string, workspaceId: string) {
    return prisma.note.findMany({
      where: { bookId, userId, workspaceId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async update(noteId: string, userId: string, data: { content?: string; pageNumber?: number }) {
    const note = await prisma.note.findFirst({ where: { id: noteId, userId } })
    if (!note) throw new Error('笔记不存在')
    return prisma.note.update({
      where: { id: noteId },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.pageNumber !== undefined && { pageNumber: data.pageNumber }),
      },
    })
  },

  async delete(noteId: string, userId: string) {
    const note = await prisma.note.findFirst({ where: { id: noteId, userId } })
    if (!note) throw new Error('笔记不存在')
    return prisma.note.delete({ where: { id: noteId } })
  },
}
