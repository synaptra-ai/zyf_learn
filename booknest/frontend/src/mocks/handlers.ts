import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('*/api/v1/books', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    const allBooks = [
      { id: '1', title: 'Clean Code', author: 'Robert C. Martin', status: 'READING', categoryId: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: '2', title: 'Design Patterns', author: 'Gang of Four', status: 'OWNED', categoryId: null, createdAt: '2026-01-02', updatedAt: '2026-01-02' },
      { id: '3', title: 'Refactoring', author: 'Martin Fowler', status: 'READING', categoryId: null, createdAt: '2026-01-03', updatedAt: '2026-01-03' },
    ]

    const items = status ? allBooks.filter((b) => b.status === status) : allBooks

    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { items, total: items.length, page: 1, pageSize: 10, totalPages: 1 },
    })
  }),

  http.post('*/api/v1/books', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      code: 201,
      message: 'success',
      data: { id: '4', ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    }, { status: 201 })
  }),

  http.get('*/api/v1/categories', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: [
        { id: 'c1', name: '技术', color: '#10B981', createdAt: '2026-01-01' },
      ],
    })
  }),

  http.get('*/api/v1/auth/me', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { id: 'u1', email: 'test@booknest.com', name: 'Test User', role: 'USER' },
    })
  }),
]
