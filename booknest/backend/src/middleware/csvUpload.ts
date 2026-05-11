import multer from 'multer'

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 CSV 文件'))
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
})
