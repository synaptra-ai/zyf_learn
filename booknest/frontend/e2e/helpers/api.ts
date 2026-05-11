import { APIRequestContext } from '@playwright/test'

export async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const res = await request.post('http://localhost:4000/api/v1/auth/login', {
    data: { email, password },
  })
  const body = await res.json()
  return body.data.token as string
}
