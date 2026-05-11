import { Request, Response, NextFunction } from 'express'
import * as importService from '../services/import.service'
import { ResponseUtil } from '../utils/response'

export const importController = {
  async createBookImport(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file!
      const job = await importService.createBookImportJob(req.user!.id, req.workspace!.id, file)
      ResponseUtil.success(res, job, '导入任务已创建', 201)
    } catch (err) { next(err) }
  },

  async getJob(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await importService.getImportJob(req.user!.id, req.workspace!.id, req.params.jobId as string)
      if (!job) return res.status(404).json({ message: '任务不存在' })
      ResponseUtil.success(res, job)
    } catch (err) { next(err) }
  },
}
