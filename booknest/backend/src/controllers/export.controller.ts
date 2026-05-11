import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

export async function exportBooks(req: Request, res: Response, next: NextFunction) {
  try {
    const books = await prisma.book.findMany({
      where: { workspaceId: req.workspace!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        title: true,
        author: true,
        status: true,
        pageCount: true,
        description: true,
      },
    })

    const header = 'title,author,status,pageCount,description\n'
    const rows = books
      .map((b) =>
        [b.title, b.author, b.status, b.pageCount || '', b.description || '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="booknest-books.csv"')
    res.send('﻿' + header + rows)
  } catch (err) {
    next(err)
  }
}
