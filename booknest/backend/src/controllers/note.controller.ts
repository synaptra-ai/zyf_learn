import { NextFunction, Request, Response } from 'express'
import { noteService } from '../services/note.service'
import { ResponseUtil } from '../utils/response'

export const noteController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const note = await noteService.create(req.user!.id, req.workspace!.id, req.body)
      ResponseUtil.success(res, note, 201)
    } catch (err) { next(err) }
  },

  async listByBook(req: Request, res: Response, next: NextFunction) {
    try {
      const notes = await noteService.listByBook(req.params.bookId, req.user!.id, req.workspace!.id)
      ResponseUtil.success(res, notes)
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const note = await noteService.update(req.params.id, req.user!.id, req.body)
      ResponseUtil.success(res, note)
    } catch (err) { next(err) }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await noteService.delete(req.params.id, req.user!.id)
      ResponseUtil.success(res, null)
    } catch (err) { next(err) }
  },
}
