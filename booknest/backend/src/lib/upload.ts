import multer from 'multer'
import { ApiError } from '../utils/errors'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      cb(new ApiError(400, '仅支持 JPG、PNG、WebP 格式'))
      return
    }
    cb(null, true)
  },
})
