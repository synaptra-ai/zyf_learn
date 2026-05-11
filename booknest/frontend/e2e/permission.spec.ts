import { test, expect } from '@playwright/test'
import { apiLogin } from './helpers/api'

test('用户不能访问其他 workspace 的书籍', async ({ request }) => {
  const tokenA = await apiLogin(request, 'e2e-a@booknest.com', 'password123')
  const tokenB = await apiLogin(request, 'e2e-b@booknest.com', 'password123')

  // List User B's workspaces to find the private one
  const wsRes = await request.get('http://localhost:4000/api/v1/workspaces', {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  const workspaces = await wsRes.json()
  const wsB = workspaces.data.find((w: { name: string }) => w.name === 'E2E Workspace B')
  const wsA = workspaces.data.find((w: { name: string }) => w.name === 'E2E Workspace A')

  // User B creates a book in their private workspace
  const createRes = await request.post('http://localhost:4000/api/v1/books', {
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'X-Workspace-Id': wsB.id,
    },
    data: {
      title: `Private ${Date.now()}`,
      author: 'User B',
      status: 'OWNED',
    },
  })

  const created = await createRes.json()
  const bookId = created.data.id

  // User A tries to access the book from Workspace A — should fail (book is in Workspace B)
  const res = await request.get(`http://localhost:4000/api/v1/books/${bookId}`, {
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'X-Workspace-Id': wsA.id,
    },
  })

  expect([403, 404]).toContain(res.status())
})
