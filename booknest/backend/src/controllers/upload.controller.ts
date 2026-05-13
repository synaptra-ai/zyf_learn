import { Request, Response, NextFunction } from 'express'
import { uploadService } from '../services/upload.service'
import { ResponseUtil } from '../utils/response'

export const uploadController = {
  async uploadCover(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        ResponseUtil.error(res, '请选择文件', 400)
        return
      }
      const book = await uploadService.uploadCover(
        req.user!.id,
        req.params.id as string,
        req.file,
        req.workspace?.id,
      )
      ResponseUtil.success(res, book, '封面上传成功')
    } catch (err) {
      next(err)
    }
  },
}
