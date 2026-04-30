import { Response } from 'express'

interface SuccessResponse {
  code: number
  message: string
  data: any
}

interface PaginatedData {
  items: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const ResponseUtil = {
  success(res: Response, data: any, message = 'success', code = 200) {
    const response: SuccessResponse = { code, message, data }
    return res.status(code).json(response)
  },

  paginated(
    res: Response,
    items: any[],
    total: number,
    page: number,
    pageSize: number,
  ) {
    const totalPages = Math.ceil(total / pageSize)
    const data: PaginatedData = { items, total, page, pageSize, totalPages }
    return res.status(200).json({ code: 200, message: 'success', data })
  },

  error(res: Response, message: string, code = 400, details?: any) {
    const response: any = { code, message }
    if (details) response.details = details
    return res.status(code).json(response)
  },
}
