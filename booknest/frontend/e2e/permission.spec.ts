import { test, expect } from '@playwright/test'
import { apiLogin } from './helpers/api'

test('用户不能访问其他用户的书籍', async ({ request }) => {
  const tokenA = await apiLogin(request, 'e2e-a@booknest.com', 'password123')
  const tokenB = await apiLogin(request, 'e2e-b@booknest.com', 'password123')

  // User B 创建一本书
  const createRes = await request.post('http://localhost:4000/api/v1/books', {
    headers: { Authorization: `Bearer ${tokenB}` },
    data: {
      title: `Private ${Date.now()}`,
      author: 'User B',
      status: 'OWNED',
    },
  })

  const created = await createRes.json()
  const bookId = created.data.id

  // User A 尝试访问 User B 的书
  const res = await request.get(`http://localhost:4000/api/v1/books/${bookId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })

  expect([403, 404]).toContain(res.status())
})
